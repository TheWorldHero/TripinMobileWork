package com.tripin.api.controller;

import com.tripin.api.service.FeedService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/feed")
public class FeedController {
  private final FeedService feedService;
  private final CurrentUserResolver currentUserResolver;

  public FeedController(FeedService feedService, CurrentUserResolver currentUserResolver) {
    this.feedService = feedService;
    this.currentUserResolver = currentUserResolver;
  }

  @GetMapping
  public Map<String, Object> getFeed(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestParam(required = false) String cityName,
      @RequestParam(required = false) String kind,
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false) String cursor) {
    return feedService.getFeed(currentUserResolver.resolve(userId), cityName, kind, limit, cursor);
  }
}
