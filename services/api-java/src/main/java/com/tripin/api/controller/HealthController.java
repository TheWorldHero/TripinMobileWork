package com.tripin.api.controller;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/health")
public class HealthController {
  @GetMapping
  public Map<String, Object> getHealth() {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("ok", true);
    response.put("service", "tripin-api");
    response.put("timestamp", Instant.now());
    return response;
  }
}
