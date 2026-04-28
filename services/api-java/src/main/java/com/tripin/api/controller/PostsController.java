package com.tripin.api.controller;

import com.tripin.api.service.PostsService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/posts")
public class PostsController {
  private final PostsService postsService;
  private final CurrentUserResolver currentUserResolver;

  public PostsController(PostsService postsService, CurrentUserResolver currentUserResolver) {
    this.postsService = postsService;
    this.currentUserResolver = currentUserResolver;
  }

  @GetMapping("/{postId}")
  public Map<String, Object> getPost(
      @RequestHeader(value = "x-user-id", required = false) String userId, @PathVariable String postId) {
    return postsService.getPost(currentUserResolver.resolve(userId), postId);
  }
}
