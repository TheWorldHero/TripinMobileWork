package com.tripin.api.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserResolver {
  private final String defaultUserId;

  public CurrentUserResolver(@Value("${DEMO_USER_ID:demo-user}") String defaultUserId) {
    this.defaultUserId = defaultUserId == null || defaultUserId.isBlank() ? "demo-user" : defaultUserId;
  }

  public String resolve(String requestedUserId) {
    return requestedUserId == null || requestedUserId.isBlank() ? defaultUserId : requestedUserId;
  }
}
