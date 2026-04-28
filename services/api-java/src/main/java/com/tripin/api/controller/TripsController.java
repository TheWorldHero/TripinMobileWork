package com.tripin.api.controller;

import com.tripin.api.service.TripsService;
import com.tripin.api.web.CurrentUserResolver;
import com.tripin.api.web.Requests.AutoAssembleTripRequest;
import com.tripin.api.web.Requests.CreateTripPointRequest;
import com.tripin.api.web.Requests.CreateTripRequest;
import com.tripin.api.web.Requests.PublishTripRequest;
import com.tripin.api.web.Requests.ReorderTripPointsRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/trips")
public class TripsController {
  private final TripsService tripsService;
  private final CurrentUserResolver currentUserResolver;

  public TripsController(TripsService tripsService, CurrentUserResolver currentUserResolver) {
    this.tripsService = tripsService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping
  public Map<String, Object> create(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestBody CreateTripRequest request) {
    return tripsService.createTrip(currentUserResolver.resolve(userId), request);
  }

  @GetMapping
  public Map<String, Object> list(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false) String cursor) {
    return tripsService.listTrips(currentUserResolver.resolve(userId), limit, cursor);
  }

  @GetMapping("/{tripId}")
  public Map<String, Object> getOne(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId) {
    return tripsService.getTrip(currentUserResolver.resolve(userId), tripId);
  }

  @PatchMapping("/{tripId}")
  public Map<String, Object> update(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @RequestBody(required = false) CreateTripRequest request) {
    return tripsService.updateTrip(currentUserResolver.resolve(userId), tripId, request);
  }

  @PostMapping("/{tripId}/points")
  public Map<String, Object> createPoint(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @RequestBody CreateTripPointRequest request) {
    return tripsService.createPoint(currentUserResolver.resolve(userId), tripId, request);
  }

  @PatchMapping("/{tripId}/points/{pointId}")
  public Map<String, Object> updatePoint(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @PathVariable String pointId,
      @RequestBody(required = false) CreateTripPointRequest request) {
    return tripsService.updatePoint(currentUserResolver.resolve(userId), tripId, pointId, request);
  }

  @DeleteMapping("/{tripId}/points/{pointId}")
  public Map<String, Object> deletePoint(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @PathVariable String pointId) {
    return tripsService.deletePoint(currentUserResolver.resolve(userId), tripId, pointId);
  }

  @PostMapping("/{tripId}/points/reorder")
  public Map<String, Object> reorderPoints(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @RequestBody ReorderTripPointsRequest request) {
    return tripsService.reorderPoints(currentUserResolver.resolve(userId), tripId, request);
  }

  @PostMapping("/{tripId}/auto-assemble")
  public Map<String, Object> autoAssemble(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @RequestBody(required = false) AutoAssembleTripRequest request) {
    return tripsService.autoAssembleTrip(currentUserResolver.resolve(userId), tripId, request);
  }

  @PostMapping("/{tripId}/publish")
  public Map<String, Object> publish(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @RequestBody(required = false) PublishTripRequest request) {
    return tripsService.publishTrip(currentUserResolver.resolve(userId), tripId, request);
  }
}
