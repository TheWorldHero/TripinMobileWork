package com.tripin.api.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.zset.Aggregate;
import org.springframework.data.redis.connection.zset.Weights;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Component;

/**
 * Post detail cache (String key per post, TTL-based) and hot-post ranking.
 *
 * Hot-post design — two-level update strategy:
 *
 *   Write path (recordAccess):
 *     1. ZINCRBY current-hour bucket by 1.0  (raw count per hour)
 *     2. If merged key exists: ZINCRBY merged key by 1.0 (current hour weight = 1.0)
 *        This keeps the merged key fresh within the hour without any ZUNIONSTORE.
 *
 *   Read path (hotPosts):
 *     - Detects hour boundary by comparing current hour to "hot:posts:merged-hour".
 *     - On hour change (or first run): full ZUNIONSTORE across windowHours buckets
 *       with exponential weights [1.0, 0.5, 0.25, ...], then store result in
 *       "hot:posts:merged". This runs once per hour, not per request.
 *     - Within the same hour: just ZREVRANGE on the already-current merged key.
 *
 *   Hourly buckets have TTL = windowHours+1 hours and expire automatically.
 *   merged key has no TTL — it is managed solely by the hourly rebuild.
 */
@Component
public class PostCacheService {
  private static final Logger LOG = LoggerFactory.getLogger(PostCacheService.class);
  private static final TypeReference<LinkedHashMap<String, Object>> MAP_REF = new TypeReference<>() {};
  private static final DateTimeFormatter BUCKET_FMT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd-HH").withZone(ZoneOffset.UTC);

  private final StringRedisTemplate redis;
  private final ObjectMapper objectMapper;
  private final String keyPrefix;
  private final String hotKey;
  private final Duration ttl;
  private final int windowHours;
  private final Duration bucketTtl;

  public PostCacheService(
      StringRedisTemplate redis,
      ObjectMapper objectMapper,
      @Value("${tripin.cache.post-detail.key-prefix}") String keyPrefix,
      @Value("${tripin.cache.hot-posts.key}") String hotKey,
      @Value("${tripin.cache.post-detail.ttl-seconds}") long ttlSeconds,
      @Value("${tripin.cache.hot-posts.window-hours:24}") int windowHours,
      @Value("${tripin.cache.hot-posts.bucket-ttl-hours:25}") int bucketTtlHours) {
    this.redis = redis;
    this.objectMapper = objectMapper;
    this.keyPrefix = keyPrefix;
    this.hotKey = hotKey;
    this.ttl = Duration.ofSeconds(Math.max(1L, ttlSeconds));
    this.windowHours = Math.max(1, windowHours);
    this.bucketTtl = Duration.ofHours(Math.max(windowHours + 1, bucketTtlHours));
  }

  public Map<String, Object> get(String postId) {
    if (postId == null || postId.isBlank()) {
      return null;
    }
    try {
      String json = redis.opsForValue().get(cacheKey(postId));
      if (json == null) {
        return null;
      }
      redis.expire(cacheKey(postId), ttl);
      return objectMapper.readValue(json, MAP_REF);
    } catch (Exception exception) {
      LOG.warn("Post cache read failed for postId={}: {}", postId, exception.getMessage());
      return null;
    }
  }

  public void put(String postId, Map<String, Object> value) {
    if (postId == null || postId.isBlank() || value == null) {
      return;
    }
    try {
      String json = objectMapper.writeValueAsString(value);
      redis.opsForValue().set(cacheKey(postId), json, ttl);
    } catch (Exception exception) {
      LOG.warn("Post cache write failed for postId={}: {}", postId, exception.getMessage());
    }
  }

  public void invalidate(String postId) {
    if (postId == null || postId.isBlank()) {
      return;
    }
    try {
      redis.delete(cacheKey(postId));
    } catch (Exception exception) {
      LOG.warn("Post cache invalidate failed for postId={}: {}", postId, exception.getMessage());
    }
  }

  public void recordAccess(String postId) {
    if (postId == null || postId.isBlank()) {
      return;
    }
    try {
      String bucket = currentBucketKey();
      redis.opsForZSet().incrementScore(bucket, postId, 1.0);
      redis.expire(bucket, bucketTtl);

      // Incremental update: current hour weight = 1.0, so we just add 1.0 directly.
      // Only update if merged key already exists — if it doesn't, the next hotPosts()
      // call will rebuild it from buckets anyway.
      String mergedKey = hotKey + ":merged";
      if (Boolean.TRUE.equals(redis.hasKey(mergedKey))) {
        redis.opsForZSet().incrementScore(mergedKey, postId, 1.0);
      }
    } catch (Exception exception) {
      LOG.warn("Hot post counter update failed for postId={}: {}", postId, exception.getMessage());
    }
  }

  public List<Map<String, Object>> hotPosts(int limit) {
    int n = Math.max(1, Math.min(limit, 100));
    try {
      String mergedKey = hotKey + ":merged";
      String mergedHourKey = hotKey + ":merged-hour";
      String currentHour = BUCKET_FMT.format(Instant.now());
      String lastRebuildHour = redis.opsForValue().get(mergedHourKey);

      if (!currentHour.equals(lastRebuildHour) || Boolean.FALSE.equals(redis.hasKey(mergedKey))) {
        rebuildMerged(mergedKey, mergedHourKey, currentHour);
      }

      Set<ZSetOperations.TypedTuple<String>> entries =
          redis.opsForZSet().reverseRangeWithScores(mergedKey, 0, n - 1L);
      if (entries == null || entries.isEmpty()) {
        return List.of();
      }
      List<Map<String, Object>> result = new ArrayList<>(entries.size());
      for (ZSetOperations.TypedTuple<String> entry : entries) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("postId", entry.getValue());
        row.put("score", entry.getScore() == null ? 0.0 : entry.getScore());
        result.add(row);
      }
      return result;
    } catch (Exception exception) {
      LOG.warn("Hot post lookup failed: {}", exception.getMessage());
      return List.of();
    }
  }

  private void rebuildMerged(String mergedKey, String mergedHourKey, String currentHour) {
    List<String> buckets = recentBucketKeys();
    if (buckets.isEmpty()) {
      return;
    }
    double[] weights = new double[buckets.size()];
    for (int i = 0; i < buckets.size(); i++) {
      weights[i] = Math.pow(0.5, i);
    }
    redis.opsForZSet().unionAndStore(
        buckets.get(0),
        buckets.subList(1, buckets.size()),
        mergedKey,
        Aggregate.SUM,
        Weights.of(weights));
    // mergedHourKey TTL matches bucket TTL so stale state can't outlive the data
    redis.opsForValue().set(mergedHourKey, currentHour, bucketTtl);
  }

  private List<String> recentBucketKeys() {
    Instant now = Instant.now();
    List<String> keys = new ArrayList<>(windowHours);
    for (int i = 0; i < windowHours; i++) {
      keys.add(hotKey + ":" + BUCKET_FMT.format(now.minus(i, ChronoUnit.HOURS)));
    }
    return keys;
  }

  private String currentBucketKey() {
    return hotKey + ":" + BUCKET_FMT.format(Instant.now());
  }

  private String cacheKey(String postId) {
    return keyPrefix + postId;
  }
}
