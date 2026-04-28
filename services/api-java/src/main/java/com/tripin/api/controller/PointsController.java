package com.tripin.api.controller;

import com.tripin.api.service.PointsService;
import com.tripin.api.web.CurrentUserResolver;
import com.tripin.api.web.Requests.ConfirmPointLocationRequest;
import com.tripin.api.web.Requests.CreatePointRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/points")
public class PointsController {
  private final PointsService pointsService;
  private final CurrentUserResolver currentUserResolver;

  public PointsController(PointsService pointsService, CurrentUserResolver currentUserResolver) {
    this.pointsService = pointsService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping
  public Map<String, Object> create(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestBody CreatePointRequest request) {
    return pointsService.createDraftPoint(currentUserResolver.resolve(userId), request);
  }

  @PatchMapping("/{pointId}/location")
  public Map<String, Object> confirmLocation(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String pointId,
      @RequestBody ConfirmPointLocationRequest request) {
    return pointsService.confirmLocation(currentUserResolver.resolve(userId), pointId, request);
  }

  @GetMapping("/inbox")
  public Map<String, Object> inbox(
      @RequestHeader(value = "x-user-id", required = false) String userId) {
    return pointsService.getInbox(currentUserResolver.resolve(userId));
  }
}
