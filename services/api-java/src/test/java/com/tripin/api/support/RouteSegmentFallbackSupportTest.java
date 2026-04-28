package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class RouteSegmentFallbackSupportTest {
  @Test
  void producesStraightFallbackPolylineFromTwoPoints() {
    String polyline =
        RouteSegmentFallbackSupport.straightLine(
            List.of(
                new RouteSegmentFallbackSupport.RoutePoint(39.90, 116.39),
                new RouteSegmentFallbackSupport.RoutePoint(39.91, 116.40)));

    assertEquals("116.39,39.9;116.4,39.91", polyline);
  }

  @Test
  void rejectsEmptyFallbackPolyline() {
    assertThrows(IllegalArgumentException.class, () -> RouteSegmentFallbackSupport.straightLine(List.of()));
  }

  @Test
  void rejectsRoutePointsWithMissingCoordinates() {
    assertThrows(
        IllegalArgumentException.class,
        () ->
            RouteSegmentFallbackSupport.straightLine(
                List.of(
                    new RouteSegmentFallbackSupport.RoutePoint(39.90, 116.39),
                    new RouteSegmentFallbackSupport.RoutePoint(null, 116.40))));
  }
}
