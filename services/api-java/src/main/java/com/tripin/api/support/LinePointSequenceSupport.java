package com.tripin.api.support;

import java.util.ArrayList;
import java.util.List;

public final class LinePointSequenceSupport {
  private LinePointSequenceSupport() {}

  public record SequenceUpdate(String pointId, int sequence) {}

  public static List<SequenceUpdate> planTwoPhase(List<String> orderedPointIds) {
    int offset = orderedPointIds.size();
    List<SequenceUpdate> updates = new ArrayList<>(orderedPointIds.size() * 2);

    for (int index = 0; index < orderedPointIds.size(); index++) {
      updates.add(new SequenceUpdate(orderedPointIds.get(index), index + offset));
    }
    for (int index = 0; index < orderedPointIds.size(); index++) {
      updates.add(new SequenceUpdate(orderedPointIds.get(index), index));
    }

    return updates;
  }
}
