package com.tripin.api.controller;

import com.tripin.api.service.LinesService;
import com.tripin.api.web.CurrentUserResolver;
import com.tripin.api.web.Requests.AttachPointsRequest;
import com.tripin.api.web.Requests.CreateLineRequest;
import com.tripin.api.web.Requests.ReorderLinePointsRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/lines")
public class LinesController {
  private final LinesService linesService;
  private final CurrentUserResolver currentUserResolver;

  public LinesController(LinesService linesService, CurrentUserResolver currentUserResolver) {
    this.linesService = linesService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping
  public Map<String, Object> create(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestBody CreateLineRequest request) {
    return linesService.createLine(currentUserResolver.resolve(userId), request);
  }

  @GetMapping("/{lineId}")
  public Map<String, Object> getLine(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String lineId) {
    return linesService.getLine(currentUserResolver.resolve(userId), lineId);
  }

  @PostMapping("/{lineId}/attach-points")
  public Map<String, Object> attachPoints(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String lineId,
      @RequestBody AttachPointsRequest request) {
    return linesService.attachPoints(currentUserResolver.resolve(userId), lineId, request);
  }

  @PostMapping("/{lineId}/reorder-points")
  public Map<String, Object> reorderPoints(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String lineId,
      @RequestBody ReorderLinePointsRequest request) {
    return linesService.reorderPoints(currentUserResolver.resolve(userId), lineId, request);
  }

  @DeleteMapping("/{lineId}/points/{pointId}")
  public Map<String, Object> removePoint(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String lineId,
      @PathVariable String pointId) {
    return linesService.detachPoint(currentUserResolver.resolve(userId), lineId, pointId);
  }
}
