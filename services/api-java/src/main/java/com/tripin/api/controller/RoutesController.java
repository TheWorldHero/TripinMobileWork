package com.tripin.api.controller;

import com.tripin.api.service.RoutesService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.Map;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/routes")
public class RoutesController {
  private final RoutesService routesService;
  private final CurrentUserResolver currentUserResolver;

  public RoutesController(RoutesService routesService, CurrentUserResolver currentUserResolver) {
    this.routesService = routesService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping("/lines/{lineId}/refresh")
  public Map<String, Object> refreshLineRoutes(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String lineId) {
    return routesService.refreshLineRoutes(currentUserResolver.resolve(userId), lineId);
  }
}
