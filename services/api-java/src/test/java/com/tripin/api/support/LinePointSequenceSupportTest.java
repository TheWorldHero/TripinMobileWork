package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class LinePointSequenceSupportTest {
  @Test
  void plansTwoPhaseSequenceUpdatesToAvoidUniqueCollisions() {
    assertEquals(
        List.of(
            new LinePointSequenceSupport.SequenceUpdate("point-b", 2),
            new LinePointSequenceSupport.SequenceUpdate("point-a", 3),
            new LinePointSequenceSupport.SequenceUpdate("point-b", 0),
            new LinePointSequenceSupport.SequenceUpdate("point-a", 1)),
        LinePointSequenceSupport.planTwoPhase(List.of("point-b", "point-a")));
  }
}
