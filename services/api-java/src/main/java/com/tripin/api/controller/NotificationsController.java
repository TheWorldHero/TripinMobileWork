package com.tripin.api.controller;

import com.tripin.api.service.NotificationService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notifications")
public class NotificationsController {
  private final NotificationService notificationService;
  private final CurrentUserResolver currentUserResolver;

  public NotificationsController(
      NotificationService notificationService, CurrentUserResolver currentUserResolver) {
    this.notificationService = notificationService;
    this.currentUserResolver = currentUserResolver;
  }

  @GetMapping
  public Map<String, Object> list(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false) Integer offset) {
    return notificationService.list(currentUserResolver.resolve(userId), limit, offset);
  }

  @GetMapping("/unread-count")
  public Map<String, Object> unreadCount(
      @RequestHeader(value = "x-user-id", required = false) String userId) {
    return Map.of("unreadCount", notificationService.unreadCount(currentUserResolver.resolve(userId)));
  }

  @PostMapping("/{id}/read")
  public Map<String, Object> markRead(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String id) {
    return notificationService.markRead(currentUserResolver.resolve(userId), id);
  }

  @PostMapping("/read-all")
  public Map<String, Object> markAllRead(
      @RequestHeader(value = "x-user-id", required = false) String userId) {
    return notificationService.markAllRead(currentUserResolver.resolve(userId));
  }
}
