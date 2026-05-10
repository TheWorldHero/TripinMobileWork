package com.tripin.api.event;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.UUID;

/**
 * Wire-format event for "a post was just published".
 *
 * Used as both an internal Spring application event (subscribed via
 * {@code @TransactionalEventListener(AFTER_COMMIT)}) and a Kafka payload — the listener takes the
 * same record and forwards it to the broker.
 *
 * {@code eventId} is generated at construction and stays stable through retries, so consumers can
 * dedup against it.
 */
public record PostPublishedEvent(
    String eventId,
    String postId,
    String tripId,
    String authorId,
    String title,
    String summary,
    String cityName,
    String visibility,
    Integer pointCount,
    Integer mediaCount,
    Instant publishedAt) {

  @JsonCreator
  public PostPublishedEvent(
      @JsonProperty("eventId") String eventId,
      @JsonProperty("postId") String postId,
      @JsonProperty("tripId") String tripId,
      @JsonProperty("authorId") String authorId,
      @JsonProperty("title") String title,
      @JsonProperty("summary") String summary,
      @JsonProperty("cityName") String cityName,
      @JsonProperty("visibility") String visibility,
      @JsonProperty("pointCount") Integer pointCount,
      @JsonProperty("mediaCount") Integer mediaCount,
      @JsonProperty("publishedAt") Instant publishedAt) {
    this.eventId = eventId == null || eventId.isBlank() ? UUID.randomUUID().toString() : eventId;
    this.postId = postId;
    this.tripId = tripId;
    this.authorId = authorId;
    this.title = title;
    this.summary = summary;
    this.cityName = cityName;
    this.visibility = visibility;
    this.pointCount = pointCount;
    this.mediaCount = mediaCount;
    this.publishedAt = publishedAt;
  }

  public static PostPublishedEvent newEvent(
      String postId,
      String tripId,
      String authorId,
      String title,
      String summary,
      String cityName,
      String visibility,
      Integer pointCount,
      Integer mediaCount,
      Instant publishedAt) {
    return new PostPublishedEvent(
        UUID.randomUUID().toString(),
        postId,
        tripId,
        authorId,
        title,
        summary,
        cityName,
        visibility,
        pointCount,
        mediaCount,
        publishedAt);
  }
}
