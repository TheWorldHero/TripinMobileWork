package com.tripin.api.controller;

import com.tripin.api.cache.PostCacheService;
import com.tripin.api.cache.RedisBloomFilter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/posts")
public class HotPostsController {
  private final PostCacheService postCache;
  private final RedisBloomFilter postBloomFilter;

  public HotPostsController(PostCacheService postCache, RedisBloomFilter postBloomFilter) {
    this.postCache = postCache;
    this.postBloomFilter = postBloomFilter;
  }

  @GetMapping("/hot")
  public Map<String, Object> hotPosts(@RequestParam(value = "limit", required = false) Integer limit) {
    int n = limit == null ? 20 : limit;
    List<Map<String, Object>> items = postCache.hotPosts(n);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("items", items);
    response.put("limit", n);
    return response;
  }

  @GetMapping("/bloom/{postId}")
  public Map<String, Object> bloomProbe(@PathVariable String postId) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("postId", postId);
    response.put("mightContain", postBloomFilter.mightContain(postId));
    response.put("bitSize", postBloomFilter.bitSize());
    response.put("hashCount", postBloomFilter.hashCount());
    return response;
  }
}
