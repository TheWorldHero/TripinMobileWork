package com.tripin.api.cache;

import com.tripin.api.support.BloomFilterMath;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Bloom filter for post-id existence checks, persisted as a single Redis bit
 * string via SETBIT/GETBIT. Sized once at construction time using the
 * configured expected item count and false-positive rate.
 *
 * Falls open on Redis errors: {@link #mightContain(String)} returns true so
 * callers degrade to the source-of-truth lookup instead of false-rejecting.
 */
@Component
public class RedisBloomFilter {
  private static final Logger LOG = LoggerFactory.getLogger(RedisBloomFilter.class);

  private final StringRedisTemplate redis;
  private final String key;
  private final long bitSize;
  private final int hashCount;

  public RedisBloomFilter(
      StringRedisTemplate redis,
      @Value("${tripin.bloomfilter.posts.key}") String key,
      @Value("${tripin.bloomfilter.posts.expected-items}") long expectedItems,
      @Value("${tripin.bloomfilter.posts.false-positive-rate}") double falsePositiveRate) {
    this.redis = redis;
    this.key = key;
    this.bitSize = BloomFilterMath.optimalBitSize(expectedItems, falsePositiveRate);
    this.hashCount = BloomFilterMath.optimalHashCount(bitSize, expectedItems);
    LOG.info(
        "RedisBloomFilter initialised: key={}, bitSize={}, hashCount={}, expectedItems={}, fpr={}",
        key,
        bitSize,
        hashCount,
        expectedItems,
        falsePositiveRate);
  }

  public void add(String value) {
    if (value == null || value.isEmpty()) {
      return;
    }
    long[] positions = BloomFilterMath.positions(value, hashCount, bitSize);
    try {
      for (long offset : positions) {
        redis.opsForValue().setBit(key, offset, true);
      }
    } catch (Exception exception) {
      LOG.warn("Bloom filter add failed for value={}: {}", value, exception.getMessage());
    }
  }

  public boolean mightContain(String value) {
    if (value == null || value.isEmpty()) {
      return false;
    }
    long[] positions = BloomFilterMath.positions(value, hashCount, bitSize);
    try {
      for (long offset : positions) {
        Boolean bit = redis.opsForValue().getBit(key, offset);
        if (bit == null || !bit) {
          return false;
        }
      }
      return true;
    } catch (Exception exception) {
      LOG.warn("Bloom filter check failed for value={}: {}", value, exception.getMessage());
      return true;
    }
  }

  public long bitSize() {
    return bitSize;
  }

  public int hashCount() {
    return hashCount;
  }

  public String key() {
    return key;
  }
}
