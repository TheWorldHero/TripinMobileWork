package com.tripin.api.cache;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * On startup, walks the active Post table and seeds the bloom filter so that
 * subsequent {@code mightContain} checks reject ids that pre-date this boot.
 * Errors are tolerated — a partially seeded filter is preferable to a failed
 * boot.
 */
@Component
public class BloomFilterInitializer implements ApplicationRunner {
  private static final Logger LOG = LoggerFactory.getLogger(BloomFilterInitializer.class);

  private final DbSupport db;
  private final JsonSupport json;
  private final RedisBloomFilter bloomFilter;

  public BloomFilterInitializer(DbSupport db, JsonSupport json, RedisBloomFilter bloomFilter) {
    this.db = db;
    this.json = json;
    this.bloomFilter = bloomFilter;
  }

  @Override
  public void run(ApplicationArguments args) {
    try {
      List<Map<String, Object>> rows =
          db.list(
              "select id from \"Post\" where status = cast('ACTIVE' as \"PostStatus\")",
              Map.of());
      int loaded = 0;
      for (Map<String, Object> row : rows) {
        String postId = json.stringValue(row.get("id"));
        if (postId != null && !postId.isBlank()) {
          bloomFilter.add(postId);
          loaded++;
        }
      }
      LOG.info("Seeded post bloom filter with {} ids", loaded);
    } catch (Exception exception) {
      LOG.warn("Failed to seed post bloom filter on startup: {}", exception.getMessage());
    }
  }
}
