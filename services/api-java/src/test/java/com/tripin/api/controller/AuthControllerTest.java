package com.tripin.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tripin.api.service.AuthService;
import com.tripin.api.service.JwtService;
import com.tripin.api.support.JwtSupport;
import io.jsonwebtoken.JwtException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
class AuthControllerTest {
  @Autowired private MockMvc mockMvc;

  @MockBean private AuthService authService;
  @MockBean private JwtService jwtService;

  @Test
  void loginReturnsTokens() throws Exception {
    when(authService.login(any())).thenReturn(authResponse("user-1"));

    mockMvc
        .perform(
            post("/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"identifier":"demo-user","password":"pw"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.id").value("user-1"))
        .andExpect(jsonPath("$.accessToken").value("access-token-xxx"))
        .andExpect(jsonPath("$.refreshToken").value("refresh-token-yyy"))
        .andExpect(jsonPath("$.tokenType").value("Bearer"));
  }

  @Test
  void registerReturnsTokens() throws Exception {
    when(authService.register(any())).thenReturn(authResponse("user-2"));

    mockMvc
        .perform(
            post("/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"alice","displayName":"Alice","password":"pw123"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.id").value("user-2"))
        .andExpect(jsonPath("$.accessToken").value("access-token-xxx"));
  }

  @Test
  void refreshDelegatesToService() throws Exception {
    when(authService.refresh(eq("refresh-token-yyy"))).thenReturn(authResponse("user-1"));

    mockMvc
        .perform(
            post("/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"refreshToken":"refresh-token-yyy"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").value("access-token-xxx"));
  }

  @Test
  void logoutWithBearerRevokesAccessToken() throws Exception {
    JwtSupport.Parsed parsed =
        new JwtSupport.Parsed(
            "user-1",
            "jti-1",
            JwtSupport.TokenType.ACCESS,
            Instant.now(),
            Instant.now().plus(Duration.ofMinutes(30)));
    when(jwtService.verifyAccess(eq("access-token-xxx"))).thenReturn(parsed);

    mockMvc
        .perform(
            post("/v1/auth/logout")
                .header("Authorization", "Bearer access-token-xxx")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true));

    verify(jwtService, times(1)).revoke(parsed);
  }

  @Test
  void logoutWithoutBearerStillReturnsOk() throws Exception {
    mockMvc
        .perform(post("/v1/auth/logout").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true));
  }

  @Test
  void logoutWithRefreshTokenInBodyRevokesIt() throws Exception {
    JwtSupport.Parsed refreshParsed =
        new JwtSupport.Parsed(
            "user-1",
            "jti-r",
            JwtSupport.TokenType.REFRESH,
            Instant.now(),
            Instant.now().plus(Duration.ofDays(7)));
    when(jwtService.verifyRefreshOrThrow(eq("refresh-token-yyy"))).thenReturn(refreshParsed);

    mockMvc
        .perform(
            post("/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"refreshToken":"refresh-token-yyy"}
                    """))
        .andExpect(status().isOk());

    verify(jwtService, times(1)).revoke(refreshParsed);
  }

  @Test
  void logoutSwallowsInvalidRefreshToken() throws Exception {
    when(jwtService.verifyRefreshOrThrow(eq("bad-refresh"))).thenThrow(new JwtException("bad"));

    mockMvc
        .perform(
            post("/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"refreshToken":"bad-refresh"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true));
  }

  private static Map<String, Object> authResponse(String userId) {
    Map<String, Object> user = Map.of("id", userId, "username", userId, "displayName", userId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("user", user);
    response.put("sessionUserId", userId);
    response.put("issuedAt", Instant.now());
    response.put("accessToken", "access-token-xxx");
    response.put("refreshToken", "refresh-token-yyy");
    response.put("tokenType", "Bearer");
    return response;
  }
}
