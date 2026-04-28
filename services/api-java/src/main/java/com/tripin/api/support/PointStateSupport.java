package com.tripin.api.support;

import java.time.Instant;

public final class PointStateSupport {
  private PointStateSupport() {}

  public enum PointState {
    DRAFT,
    NEEDS_LOCATION,
    READY_FOR_LINE
  }

  public record PointSnapshot(
      String pointId,
      int mediaCount,
      String placeId,
      Double latitude,
      Double longitude,
      Instant checkInAt) {}

  public static PointState from(PointSnapshot point) {
    if (point.mediaCount() <= 0) {
      throw new IllegalArgumentException("point requires media");
    }

    boolean hasPlace = point.placeId() != null || (point.latitude() != null && point.longitude() != null);
    if (!hasPlace) {
      return PointState.NEEDS_LOCATION;
    }
    if (point.checkInAt() == null) {
      return PointState.DRAFT;
    }
    return PointState.READY_FOR_LINE;
  }
}
