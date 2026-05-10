package com.tripin.api.kafka;

import com.tripin.api.event.PostPublishedEvent;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Consumes post.published events. The handler is intentionally a stub (logs only) because the
 * downstream wiring — feed fan-out, ES indexing, push notifications — lives in stages 3 and 4.
 *
 * Idempotency: each event carries a stable {@code eventId}. We SETNX a Redis key keyed by it; the
 * first arrival wins and runs the handler, retries see the key already set and short-circuit.
 * The TTL controls how long a duplicate would still be detected; long enough to absorb retry
 * windows and brief consumer downtime, short enough that Redis doesn't accumulate forever.
 */
@Component
public class PostPublishedConsumer {
  private static final Logger LOG = LoggerFactory.getLogger(PostPublishedConsumer.class);
  private static final String DEDUP_KEY_PREFIX = "event:processed:";

  private final StringRedisTemplate redis;
  private final Duration dedupTtl;

  public PostPublishedConsumer(
      StringRedisTemplate redis,
      @Value("${tripin.kafka.dedup.ttl-seconds:604800}") long dedupTtlSeconds) {
    this.redis = redis;
    this.dedupTtl = Duration.ofSeconds(Math.max(60L, dedupTtlSeconds));
  }

  @KafkaListener(
      topics = "${tripin.kafka.topics.post-published}",
      containerFactory = "postPublishedListenerContainerFactory")
  public void onPostPublished(PostPublishedEvent event, Acknowledgment ack) {
    if (event == null || event.eventId() == null) {
      LOG.warn("Dropping malformed post.published event with null payload or eventId");
      ack.acknowledge();
      return;
    }
    if (!claimEvent(event.eventId())) {
      LOG.info("Skipping duplicate post.published eventId={}", event.eventId());
      ack.acknowledge();
      return;
    }
    handle(event);
    ack.acknowledge();
  }

  /** Returns true if this consumer is the first to process this eventId. */
  private boolean claimEvent(String eventId) {
    Boolean firstClaim =
        redis.opsForValue().setIfAbsent(DEDUP_KEY_PREFIX + eventId, "1", dedupTtl);
    return Boolean.TRUE.equals(firstClaim);
  }

  /**
   * Stage 2 handler is a stub — it just logs. Stage 3 will write to Elasticsearch here; stage 4
   * will fan out to celebrity follower inboxes.
   */
  private void handle(PostPublishedEvent event) {
    LOG.info(
        "Handling post.published eventId={} postId={} authorId={} city={}",
        event.eventId(),
        event.postId(),
        event.authorId(),
        event.cityName());
  }
}
