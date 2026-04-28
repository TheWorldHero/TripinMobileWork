package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class PointStateSupportTest {
  @Test
  void draftPointNeedsLocationWhenMediaExistsWithoutPlace() {
    var point =
        new PointStateSupport.PointSnapshot(
            "point-1", 1, null, null, null, Instant.parse("2026-04-17T10:00:00Z"));

    assertEquals(PointStateSupport.PointState.NEEDS_LOCATION, PointStateSupport.from(point));
  }
}
