package com.tripin.api.support;

import java.nio.charset.StandardCharsets;

/**
 * Pure-logic helpers for sizing a bloom filter and deriving k bit positions
 * from a string key via double hashing. No Redis or Spring dependencies, so
 * the math is unit-testable in isolation.
 */
public final class BloomFilterMath {
  private BloomFilterMath() {}

  /** Optimal bit array size m for n expected items at false-positive rate p. */
  public static long optimalBitSize(long expectedItems, double falsePositiveRate) {
    if (expectedItems <= 0) {
      throw new IllegalArgumentException("expectedItems must be positive");
    }
    if (!(falsePositiveRate > 0.0 && falsePositiveRate < 1.0)) {
      throw new IllegalArgumentException("falsePositiveRate must be in (0, 1)");
    }
    double ln2Squared = Math.log(2) * Math.log(2);
    double bits = -((double) expectedItems) * Math.log(falsePositiveRate) / ln2Squared;
    return Math.max(64L, (long) Math.ceil(bits));
  }

  /** Optimal hash function count k for given m and n. */
  public static int optimalHashCount(long bitSize, long expectedItems) {
    if (expectedItems <= 0) {
      throw new IllegalArgumentException("expectedItems must be positive");
    }
    double k = ((double) bitSize / (double) expectedItems) * Math.log(2);
    return Math.max(1, (int) Math.round(k));
  }

  /**
   * Returns k bit indices in [0, bitSize) for the given key, using double
   * hashing on top of two independent 64-bit hashes (FNV-1a and djb2 variant).
   */
  public static long[] positions(String key, int hashCount, long bitSize) {
    if (key == null) {
      throw new IllegalArgumentException("key must not be null");
    }
    if (hashCount <= 0) {
      throw new IllegalArgumentException("hashCount must be positive");
    }
    if (bitSize <= 0) {
      throw new IllegalArgumentException("bitSize must be positive");
    }

    byte[] bytes = key.getBytes(StandardCharsets.UTF_8);
    long h1 = fnv1a64(bytes);
    long h2 = djb2Variant(bytes);
    if (h2 == 0L) {
      h2 = 0x9E3779B97F4A7C15L;
    }

    long[] result = new long[hashCount];
    long combined = h1;
    for (int i = 0; i < hashCount; i++) {
      long unsigned = combined & 0x7fffffffffffffffL;
      result[i] = Long.remainderUnsigned(unsigned, bitSize);
      combined += h2;
    }
    return result;
  }

  static long fnv1a64(byte[] bytes) {
    long hash = 0xcbf29ce484222325L;
    for (byte b : bytes) {
      hash ^= (b & 0xffL);
      hash *= 0x100000001b3L;
    }
    return hash;
  }

  static long djb2Variant(byte[] bytes) {
    long hash = 1469598103934665603L;
    for (byte b : bytes) {
      hash = ((hash << 5) ^ hash) ^ (b & 0xffL);
    }
    return hash;
  }
}
