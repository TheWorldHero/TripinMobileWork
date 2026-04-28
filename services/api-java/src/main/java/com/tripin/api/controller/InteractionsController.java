package com.tripin.api.controller;

import com.tripin.api.service.InteractionsService;
import com.tripin.api.web.CurrentUserResolver;
import com.tripin.api.web.Requests.CreateCommentRequest;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/posts/{postId}")
public class InteractionsController {
  private final InteractionsService interactionsService;
  private final CurrentUserResolver currentUserResolver;

  public InteractionsController(
      InteractionsService interactionsService, CurrentUserResolver currentUserResolver) {
    this.interactionsService = interactionsService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping("/like")
  public Map<String, Object> like(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String postId) {
    return interactionsService.likePost(currentUserResolver.resolve(userId), postId);
  }

  @DeleteMapping("/like")
  public Map<String, Object> unlike(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String postId) {
    return interactionsService.unlikePost(currentUserResolver.resolve(userId), postId);
  }

  @PostMapping("/save")
  public Map<String, Object> save(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String postId) {
    return interactionsService.savePost(currentUserResolver.resolve(userId), postId);
  }

  @DeleteMapping("/save")
  public Map<String, Object> unsave(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String postId) {
    return interactionsService.unsavePost(currentUserResolver.resolve(userId), postId);
  }

  @PostMapping("/comments")
  public Map<String, Object> createComment(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String postId,
      @RequestBody CreateCommentRequest request) {
    return interactionsService.createComment(currentUserResolver.resolve(userId), postId, request);
  }

  @GetMapping("/comments")
  public List<Map<String, Object>> listComments(@PathVariable String postId) {
    return interactionsService.listComments(postId);
  }
}
