package com.tripin.api.controller;

import com.tripin.api.service.SearchService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/search")
public class SearchController {
  private final SearchService searchService;

  public SearchController(SearchService searchService) {
    this.searchService = searchService;
  }

  @GetMapping
  public Map<String, Object> search(
      @RequestParam(value = "q", required = false) String q,
      @RequestParam(required = false) String type,
      @RequestParam(required = false) Integer limit) {
    return searchService.search(q, type, limit);
  }
}
