package com.tripin.api.kafka;

import com.tripin.api.event.PostPublishedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Thin wrapper over KafkaTemplate that knows the topic for each event type. Keeps callers free of
 * Kafka APIs.
 */
@Component
public class PostEventProducer {
  private static final Logger LOG = LoggerFactory.getLogger(PostEventProducer.class);

  private final KafkaTemplate<String, Object> kafkaTemplate;
  private final String publishedTopic;

  public PostEventProducer(
      KafkaTemplate<String, Object> kafkaTemplate,
      @Value("${tripin.kafka.topics.post-published}") String publishedTopic) {
    this.kafkaTemplate = kafkaTemplate;
    this.publishedTopic = publishedTopic;
  }

  public void sendPostPublished(PostPublishedEvent event) {
    if (event == null || event.postId() == null) {
      LOG.warn("Refusing to send post.published event with null payload or postId");
      return;
    }
    // Partition by postId so all updates for one post land in order on a single partition.
    kafkaTemplate
        .send(publishedTopic, event.postId(), event)
        .whenComplete(
            (result, throwable) -> {
              if (throwable != null) {
                LOG.error(
                    "Failed to send post.published event eventId={} postId={}: {}",
                    event.eventId(),
                    event.postId(),
                    throwable.getMessage());
              } else {
                LOG.info(
                    "Sent post.published event eventId={} postId={} offset={}",
                    event.eventId(),
                    event.postId(),
                    result.getRecordMetadata().offset());
              }
            });
  }
}
