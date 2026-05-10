package com.tripin.api.kafka;

import com.tripin.api.event.PostPublishedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Bridges in-process Spring application events to Kafka, but only AFTER the originating database
 * transaction has committed.
 *
 * If the publishTrip transaction rolls back, this listener never fires — so we don't get a Kafka
 * event for a published post that doesn't actually exist. The remaining failure mode (event lost
 * if Kafka is unreachable at commit time) is acceptable for stage 2 — a true outbox table would
 * close that gap.
 */
@Component
public class PostEventListener {
  private final PostEventProducer producer;

  public PostEventListener(PostEventProducer producer) {
    this.producer = producer;
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
  public void onPostPublished(PostPublishedEvent event) {
    producer.sendPostPublished(event);
  }
}
