package com.tripin.api.kafka;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.tripin.api.event.PostPublishedEvent;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

class PostEventProducerTest {

  private KafkaTemplate<String, Object> kafkaTemplate;
  private PostEventProducer producer;

  @BeforeEach
  void setUp() {
    @SuppressWarnings("unchecked")
    KafkaTemplate<String, Object> template = Mockito.mock(KafkaTemplate.class);
    kafkaTemplate = template;
    producer = new PostEventProducer(kafkaTemplate, "tripin.post.published.v1");
  }

  @Test
  void sendsToConfiguredTopicKeyedByPostId() {
    PostPublishedEvent event = sampleEvent();
    when(kafkaTemplate.send(eq("tripin.post.published.v1"), eq("post-1"), eq(event)))
        .thenReturn(completedSendResult());

    producer.sendPostPublished(event);

    verify(kafkaTemplate, times(1))
        .send(eq("tripin.post.published.v1"), eq("post-1"), eq(event));
  }

  @Test
  void nullEventIsRejectedWithoutKafkaCall() {
    producer.sendPostPublished(null);
    verify(kafkaTemplate, never()).send(Mockito.anyString(), Mockito.anyString(), Mockito.any());
  }

  @Test
  void eventWithNullPostIdIsRejected() {
    PostPublishedEvent malformed =
        new PostPublishedEvent(
            "evt-1", null, "trip-1", "user-1", "t", null, "Beijing", "PUBLIC", 3, 5, Instant.now());

    producer.sendPostPublished(malformed);

    verify(kafkaTemplate, never()).send(Mockito.anyString(), Mockito.anyString(), Mockito.any());
  }

  private static PostPublishedEvent sampleEvent() {
    return new PostPublishedEvent(
        "evt-1",
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

  private static CompletableFuture<SendResult<String, Object>> completedSendResult() {
    RecordMetadata metadata =
        new RecordMetadata(new TopicPartition("tripin.post.published.v1", 0), 0L, 0, 0L, 0, 0);
    @SuppressWarnings({"rawtypes", "unchecked"})
    SendResult result = new SendResult(null, metadata);
    @SuppressWarnings("unchecked")
    CompletableFuture<SendResult<String, Object>> future = CompletableFuture.completedFuture(result);
    return future;
  }
}
