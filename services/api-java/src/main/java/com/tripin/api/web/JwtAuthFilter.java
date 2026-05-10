package com.tripin.api.web;

import com.tripin.api.service.JwtService;
import com.tripin.api.support.JwtSupport.Parsed;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Bearer-token authentication filter.
 *
 * Behavior:
 *   - If the Authorization header is missing, the filter passes through; CurrentUserResolver
 *     falls back to the x-user-id header / dev default. This keeps the demo flow working.
 *   - If the header IS present and starts with "Bearer ", the token must validate. Otherwise
 *     we return 401 immediately — silently downgrading to demo would mask bugs.
 *   - Auth endpoints themselves (login/register/refresh) and health are skipped entirely.
 */
public class JwtAuthFilter extends OncePerRequestFilter {
  public static final String USER_ID_ATTRIBUTE = "tripin.userId";
  public static final String JTI_ATTRIBUTE = "tripin.jti";

  private static final Set<String> SKIP_PATHS =
      Set.of(
          "/v1/auth/login",
          "/v1/auth/register",
          "/v1/auth/refresh",
          "/v1/health");

  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getServletPath();
    return path != null && SKIP_PATHS.contains(path);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header == null || header.isBlank()) {
      chain.doFilter(request, response);
      return;
    }
    if (!header.startsWith("Bearer ")) {
      chain.doFilter(request, response);
      return;
    }
    String token = header.substring("Bearer ".length()).trim();
    Parsed parsed = jwtService.verifyAccess(token);
    if (parsed == null) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType("application/json;charset=UTF-8");
      response.getWriter().write("{\"error\":\"invalid or expired token\"}");
      return;
    }
    request.setAttribute(USER_ID_ATTRIBUTE, parsed.userId());
    request.setAttribute(JTI_ATTRIBUTE, parsed.jti());
    chain.doFilter(request, response);
  }
}
