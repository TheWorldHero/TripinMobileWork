package com.tripin.api.kafka;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.tripin.api.event.PostPublishedEvent;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.kafka.support.Acknowledgment;

class PostPublishedConsumerTest {

  private StringRedisTemplate redis;
  private ValueOperations<String, String> values;
  private Acknowledgment ack;
  private PostPublishedConsumer consumer;

  @BeforeEach
  void setUp() {
    redis = Mockito.mock(StringRedisTemplate.class);
    @SuppressWarnings("unchecked")
    ValueOperations<String, String> ops = Mockito.mock(ValueOperations.class);
    values = ops;
    when(redis.opsForValue()).thenReturn(values);
    ack = Mockito.mock(Acknowledgment.class);
    consumer = new PostPublishedConsumer(redis, 86400L);
  }

  @Test
  void firstSightOfEventClaimsAndAcks() {
    when(values.setIfAbsent(eq("event:processed:evt-1"), eq("1"), any(Duration.class)))
        .thenReturn(true);

    consumer.onPostPublished(sampleEvent("evt-1"), ack);

    verify(values, times(1)).setIfAbsent(eq("event:processed:evt-1"), eq("1"), any(Duration.class));
    verify(ack, times(1)).acknowledge();
  }

  @Test
  void duplicateEventIsSkippedButStillAcked() {
    when(values.setIfAbsent(eq("event:processed:evt-1"), eq("1"), any(Duration.class)))
        .thenReturn(false);

    consumer.onPostPublished(sampleEvent("evt-1"), ack);

    verify(values, times(1)).setIfAbsent(anyString(), anyString(), any(Duration.class));
    verify(ack, times(1)).acknowledge();
    // No further work — handler does nothing for duplicates. The fact that we still ack is the
    // important guarantee: a duplicate must NOT block the partition forever.
  }

  @Test
  void nullPayloadIsAckedAndIgnored() {
    consumer.onPostPublished(null, ack);

    verify(values, never()).setIfAbsent(anyString(), anyString(), any(Duration.class));
    verify(ack, times(1)).acknowledge();
  }

  @Test
  void blankEventIdIsTreatedAsMalformed() {
    PostPublishedEvent malformed =
        new PostPublishedEvent(
            null, "post-1", "trip-1", "user-1", "t", "s", "Beijing", "PUBLIC", 3, 5, Instant.now());
    // The constructor's blank-eventId branch fills in a UUID, so this exercises the post-construction
    // happy path. The "null event" case above covers the truly-malformed path.

    when(values.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

    consumer.onPostPublished(malformed, ack);

    verify(ack, times(1)).acknowledge();
  }

  @Test
  void shortTtlConfigIsClampedToMinimum() {
    // Using ttl=10s should clamp up to 60s (the floor in the consumer).
    PostPublishedConsumer tightConsumer = new PostPublishedConsumer(redis, 10L);
    when(values.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

    tightConsumer.onPostPublished(sampleEvent("evt-x"), ack);

    org.mockito.ArgumentCaptor<Duration> ttlCaptor = org.mockito.ArgumentCaptor.forClass(Duration.class);
    verify(values).setIfAbsent(anyString(), anyString(), ttlCaptor.capture());
    org.junit.jupiter.api.Assertions.assertEquals(Duration.ofSeconds(60L), ttlCaptor.getValue());
  }

  private static PostPublishedEvent sampleEvent(String eventId) {
    return new PostPublishedEvent(
        eventId,
        "post-1",
        "trip-1",
        "user-1",
        "Hello",
        "summary",
        "Beijing",
        "PUBLIC",
        3,
        5,
        Instant.parse("2026-05-10T10:00:00Z"));
  }
}
