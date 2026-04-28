package com.tripin.api.controller;

import com.tripin.api.service.DevSupportService;
import com.tripin.api.web.Requests.DevSeedRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/dev")
public class DevSupportController {
  private final DevSupportService devSupportService;

  public DevSupportController(DevSupportService devSupportService) {
    this.devSupportService = devSupportService;
  }

  @GetMapping("/status")
  public Map<String, Object> getStatus() {
    return devSupportService.getStatus();
  }

  @PostMapping("/seed")
  public Map<String, Object> seed(@RequestBody(required = false) DevSeedRequest request) {
    return devSupportService.seedDemo(request == null || request.reset() == null || request.reset());
  }
}
