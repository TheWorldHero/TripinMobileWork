package com.tripin.api.support;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class FeedBlendSupport {
  private FeedBlendSupport() {}

  public static <T> List<T> blend(List<T> recommended, List<T> following, int limit) {
    if (limit <= 0) {
      return Collections.emptyList();
    }

    List<T> safeRecommended = recommended == null ? Collections.emptyList() : recommended;
    List<T> safeFollowing = following == null ? Collections.emptyList() : following;

    List<T> result = new ArrayList<>(limit);
    int recIndex = 0;
    int followIndex = 0;
    while (result.size() < limit && (recIndex < safeRecommended.size() || followIndex < safeFollowing.size())) {
      if (recIndex < safeRecommended.size()) {
        result.add(safeRecommended.get(recIndex++));
      }
      if (result.size() >= limit) {
        break;
      }
      if (followIndex < safeFollowing.size()) {
        result.add(safeFollowing.get(followIndex++));
      }
    }
    return result;
  }
}
