package com.tripin.api.controller;

import com.tripin.api.service.AuthService;
import com.tripin.api.service.JwtService;
import com.tripin.api.support.JwtSupport.Parsed;
import com.tripin.api.web.Requests.LoginRequest;
import com.tripin.api.web.Requests.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {
  private final AuthService authService;
  private final JwtService jwtService;

  public AuthController(AuthService authService, JwtService jwtService) {
    this.authService = authService;
    this.jwtService = jwtService;
  }

  @PostMapping("/register")
  public Map<String, Object> register(@RequestBody RegisterRequest request) {
    return authService.register(request);
  }

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/refresh")
  public Map<String, Object> refresh(@RequestBody Map<String, String> body) {
    String refreshToken = body == null ? null : body.get("refreshToken");
    return authService.refresh(refreshToken);
  }

  @PostMapping("/logout")
  public Map<String, Object> logout(HttpServletRequest request, @RequestBody(required = false) Map<String, String> body) {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring("Bearer ".length()).trim();
      Parsed parsed = jwtService.verifyAccess(token);
      jwtService.revoke(parsed);
    }
    if (body != null) {
      String refreshToken = body.get("refreshToken");
      if (refreshToken != null && !refreshToken.isBlank()) {
        try {
          jwtService.revoke(jwtService.verifyRefreshOrThrow(refreshToken));
        } catch (io.jsonwebtoken.JwtException ignored) {
          // Already invalid; nothing to revoke.
        }
      }
    }
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("ok", true);
    return response;
  }
}
