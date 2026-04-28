package com.tripin.api.support;

import java.util.List;
import java.util.stream.Collectors;

public final class RouteSegmentFallbackSupport {
  private RouteSegmentFallbackSupport() {}

  public record RoutePoint(Double latitude, Double longitude) {}

  public static String straightLine(List<RoutePoint> points) {
    if (points == null || points.isEmpty()) {
      throw new IllegalArgumentException("route requires at least two points");
    }

    for (RoutePoint point : points) {
      if (point == null || point.latitude() == null || point.longitude() == null) {
        throw new IllegalArgumentException("route points require coordinates");
      }
    }

    if (points.size() < 2) {
      throw new IllegalArgumentException("route requires at least two points");
    }

    return points.stream()
        .map(point -> point.longitude() + "," + point.latitude())
        .collect(Collectors.joining(";"));
  }
}
