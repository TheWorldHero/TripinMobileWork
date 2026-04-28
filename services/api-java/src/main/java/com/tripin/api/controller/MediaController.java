package com.tripin.api.controller;

import com.tripin.api.service.MediaService;
import com.tripin.api.web.CurrentUserResolver;
import com.tripin.api.web.Requests.CreateMediaAssetRequest;
import com.tripin.api.web.Requests.MarkMediaReadyRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/media/assets")
public class MediaController {
  private final MediaService mediaService;
  private final CurrentUserResolver currentUserResolver;

  public MediaController(MediaService mediaService, CurrentUserResolver currentUserResolver) {
    this.mediaService = mediaService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping
  public Map<String, Object> create(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestBody CreateMediaAssetRequest request) {
    return mediaService.create(currentUserResolver.resolve(userId), request);
  }

  @PostMapping("/{mediaAssetId}/mark-ready")
  public Map<String, Object> markReady(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String mediaAssetId,
      @RequestBody(required = false) MarkMediaReadyRequest request) {
    return mediaService.markReady(currentUserResolver.resolve(userId), mediaAssetId, request);
  }

  @GetMapping("/{mediaAssetId}")
  public Map<String, Object> getOne(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String mediaAssetId) {
    return mediaService.getOne(currentUserResolver.resolve(userId), mediaAssetId);
  }
}
