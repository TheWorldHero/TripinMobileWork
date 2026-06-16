package com.tripin.api.support;

import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * 轻量运行指标：DB 查询次数、缓存命中 / 未命中。
 *
 * <p>同时注册为 Micrometer gauge（接入 Actuator /actuator/metrics），并通过 {@code /v1/_bench}
 * 暴露原始计数 + 重置，便于压测前后对比缓存效果（命中率、DB 查询量下降）。
 */
@Component
public class BenchMetrics {
  private final AtomicLong dbQueries = new AtomicLong();
  private final AtomicLong cacheHits = new AtomicLong();
  private final AtomicLong cacheMisses = new AtomicLong();

  public BenchMetrics(ObjectProvider<MeterRegistry> registryProvider) {
    MeterRegistry registry = registryProvider.getIfAvailable();
    if (registry != null) {
      registry.gauge("tripin.db.queries", dbQueries, AtomicLong::doubleValue);
      registry.gauge("tripin.cache.hits", cacheHits, AtomicLong::doubleValue);
      registry.gauge("tripin.cache.misses", cacheMisses, AtomicLong::doubleValue);
    }
  }

  public void incDbQuery() {
    dbQueries.incrementAndGet();
  }

  public void incCacheHit() {
    cacheHits.incrementAndGet();
  }

  public void incCacheMiss() {
    cacheMisses.incrementAndGet();
  }

  public long dbQueries() {
    return dbQueries.get();
  }

  public long cacheHits() {
    return cacheHits.get();
  }

  public long cacheMisses() {
    return cacheMisses.get();
  }

  public void reset() {
    dbQueries.set(0);
    cacheHits.set(0);
    cacheMisses.set(0);
  }
}
