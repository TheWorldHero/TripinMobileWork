package com.tripin.api.controller;

import com.tripin.api.service.CacheService;
import com.tripin.api.support.BenchMetrics;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 压测辅助：读取/重置 DB 查询数与缓存命中统计，并可运行期开关缓存——用于"开/关缓存"对比命中率
 * 与 DB 查询量下降。仅供基准测试使用。
 */
@RestController
@RequestMapping("/v1/_bench")
@ConditionalOnProperty(name = "tripin.bench.enabled", havingValue = "true")
public class BenchController {
  private final BenchMetrics metrics;
  private final CacheService cacheService;

  public BenchController(BenchMetrics metrics, CacheService cacheService) {
    this.metrics = metrics;
    this.cacheService = cacheService;
  }

  @GetMapping("/stats")
  public Map<String, Object> stats() {
    long hits = metrics.cacheHits();
    long misses = metrics.cacheMisses();
    long total = hits + misses;
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("cacheEnabled", cacheService.isEnabled());
    result.put("dbQueries", metrics.dbQueries());
    result.put("cacheHits", hits);
    result.put("cacheMisses", misses);
    result.put("cacheHitRate", total == 0 ? 0.0 : Math.round((hits * 10000.0) / total) / 100.0);
    return result;
  }

  @PostMapping("/reset")
  public Map<String, Object> reset() {
    metrics.reset();
    return Map.of("ok", true);
  }

  @PostMapping("/cache")
  public Map<String, Object> cache(@RequestParam boolean enabled) {
    cacheService.setEnabled(enabled);
    return Map.of("cacheEnabled", cacheService.isEnabled());
  }
}
