package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class BloomFilterMathTest {
  @Test
  void optimalBitSizeMatchesStandardFormula() {
    long bits = BloomFilterMath.optimalBitSize(1_000_000L, 0.01);
    assertTrue(bits > 9_000_000L && bits < 10_000_000L, "expected ~9.6M bits but got " + bits);
  }

  @Test
  void optimalHashCountIsRoughlyMOverNTimesLn2() {
    long bits = BloomFilterMath.optimalBitSize(1_000_000L, 0.01);
    int k = BloomFilterMath.optimalHashCount(bits, 1_000_000L);
    assertEquals(7, k);
  }

  @Test
  void positionsAreInRangeAndDeterministic() {
    long bitSize = 1024L;
    long[] first = BloomFilterMath.positions("post-abc", 5, bitSize);
    long[] second = BloomFilterMath.positions("post-abc", 5, bitSize);
    assertEquals(5, first.length);
    for (int i = 0; i < first.length; i++) {
      assertEquals(first[i], second[i]);
      assertTrue(first[i] >= 0 && first[i] < bitSize);
    }
  }

  @Test
  void differentKeysProduceDifferentPositionSets() {
    long bitSize = 1L << 20;
    long[] a = BloomFilterMath.positions("post-aaa", 7, bitSize);
    long[] b = BloomFilterMath.positions("post-bbb", 7, bitSize);
    Set<Long> setA = new HashSet<>();
    for (long v : a) setA.add(v);
    int collisions = 0;
    for (long v : b) {
      if (setA.contains(v)) collisions++;
    }
    assertTrue(collisions < a.length, "expected at least one differing bit, got identical sets");
  }

  @Test
  void rejectsInvalidInputs() {
    assertThrows(IllegalArgumentException.class, () -> BloomFilterMath.optimalBitSize(0, 0.01));
    assertThrows(IllegalArgumentException.class, () -> BloomFilterMath.optimalBitSize(100, 0.0));
    assertThrows(IllegalArgumentException.class, () -> BloomFilterMath.optimalBitSize(100, 1.0));
    assertThrows(IllegalArgumentException.class, () -> BloomFilterMath.optimalHashCount(100, 0));
    assertThrows(IllegalArgumentException.class, () -> BloomFilterMath.positions(null, 3, 1024));
    assertThrows(IllegalArgumentException.class, () -> BloomFilterMath.positions("x", 0, 1024));
    assertThrows(IllegalArgumentException.class, () -> BloomFilterMath.positions("x", 3, 0));
  }
}
