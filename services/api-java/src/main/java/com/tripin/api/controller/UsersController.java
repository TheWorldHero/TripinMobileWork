package com.tripin.api.controller;

import com.tripin.api.service.UserService;
import com.tripin.api.web.CurrentUserResolver;
import com.tripin.api.web.Requests.CreateUserRequest;
import com.tripin.api.web.Requests.UpdateUserRequest;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/users")
public class UsersController {
  private final UserService userService;
  private final CurrentUserResolver currentUserResolver;

  public UsersController(UserService userService, CurrentUserResolver currentUserResolver) {
    this.userService = userService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping
  public Map<String, Object> create(@RequestBody CreateUserRequest request) {
    return userService.create(request);
  }

  @GetMapping("/me")
  public Map<String, Object> getMe(
      @RequestHeader(value = "x-user-id", required = false) String userId) {
    return userService.ensureExists(currentUserResolver.resolve(userId));
  }

  @PatchMapping("/me")
  public Map<String, Object> updateMe(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestBody UpdateUserRequest request) {
    String resolvedUserId = currentUserResolver.resolve(userId);
    return userService.update(resolvedUserId, resolvedUserId, request);
  }

  @GetMapping("/{userId}")
  public Map<String, Object> getOne(@PathVariable String userId) {
    return userService.findRequired(userId);
  }

  @GetMapping("/{userId}/posts")
  public List<Map<String, Object>> getPublishedPosts(@PathVariable String userId) {
    return userService.listPublishedPosts(userId);
  }

  @GetMapping("/{userId}/saves")
  public List<Map<String, Object>> getSavedPosts(@PathVariable String userId) {
    return userService.listSavedPosts(userId);
  }
}
