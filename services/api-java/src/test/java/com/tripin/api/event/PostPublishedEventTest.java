package com.tripin.api.event;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PostPublishedEventTest {

  @Test
  void newEventGeneratesNonBlankEventId() {
    PostPublishedEvent event = sample();
    assertNotNull(event.eventId());
    assertFalse(event.eventId().isBlank());
  }

  @Test
  void newEventGeneratesDistinctEventIds() {
    assertNotEquals(sample().eventId(), sample().eventId());
  }

  @Test
  void blankOrNullEventIdInConstructorGetsReplaced() {
    PostPublishedEvent withNull =
        new PostPublishedEvent(
            null, "p-1", "t-1", "u-1", "title", "summary", "Beijing", "PUBLIC", 3, 5, Instant.now());
    PostPublishedEvent withBlank =
        new PostPublishedEvent(
            " ", "p-1", "t-1", "u-1", "title", "summary", "Beijing", "PUBLIC", 3, 5, Instant.now());

    assertNotNull(withNull.eventId());
    assertFalse(withNull.eventId().isBlank());
    assertNotNull(withBlank.eventId());
    assertFalse(withBlank.eventId().isBlank());
  }

  @Test
  void roundTripsThroughJacksonWithSamePayload() throws Exception {
    ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    mapper.findAndRegisterModules();
    PostPublishedEvent event = sample();
    String json = mapper.writeValueAsString(event);
    PostPublishedEvent parsed = mapper.readValue(json, PostPublishedEvent.class);

    assertEquals(event, parsed);
  }

  private static PostPublishedEvent sample() {
    return PostPublishedEvent.newEvent(
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
