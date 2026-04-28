package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class FeedBlendSupportTest {
  @Test
  void alternatesRecommendedAndFollowingItemsIntoOneFeed() {
    assertEquals(
        List.of("rec-1", "follow-1", "rec-2"),
        FeedBlendSupport.blend(List.of("rec-1", "rec-2"), List.of("follow-1"), 3));
  }
}
