package com.tripin.api.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * Resolves the effective userId for the current request, preferring JWT (set by
 * {@link JwtAuthFilter}) and falling back to the legacy {@code x-user-id} header / configured
 * demo user when {@code tripin.auth.allow-header-fallback} is true.
 */
@Component
public class CurrentUserResolver {
  private final String defaultUserId;
  private final boolean allowHeaderFallback;

  public CurrentUserResolver(
      @Value("${DEMO_USER_ID:demo-user}") String defaultUserId,
      @Value("${tripin.auth.allow-header-fallback:true}") boolean allowHeaderFallback) {
    this.defaultUserId = defaultUserId == null || defaultUserId.isBlank() ? "demo-user" : defaultUserId;
    this.allowHeaderFallback = allowHeaderFallback;
  }

  public String resolve(String requestedUserId) {
    String fromToken = currentRequestAttribute(JwtAuthFilter.USER_ID_ATTRIBUTE);
    if (fromToken != null && !fromToken.isBlank()) {
      return fromToken;
    }
    if (!allowHeaderFallback) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.UNAUTHORIZED, "authentication required");
    }
    return requestedUserId == null || requestedUserId.isBlank() ? defaultUserId : requestedUserId;
  }

  private String currentRequestAttribute(String name) {
    RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
    if (attrs == null) {
      return null;
    }
    Object value = attrs.getAttribute(name, RequestAttributes.SCOPE_REQUEST);
    return value == null ? null : value.toString();
  }
}
