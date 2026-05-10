package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.web.Requests.LoginRequest;
import com.tripin.api.web.Requests.RegisterRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final JwtService jwtService;

  public AuthService(DbSupport db, JsonSupport json, UserService userService, JwtService jwtService) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.jwtService = jwtService;
  }

  public Map<String, Object> register(RegisterRequest request) {
    if (request == null
        || isBlank(request.username())
        || isBlank(request.displayName())
        || isBlank(request.password())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "username, displayName and password are required");
    }

    String username = request.username().trim();
    String email = isBlank(request.email()) ? null : request.email().trim().toLowerCase();
    validateUniqueness(username, email);

    String userId = json.newId("user");
    String salt = json.newId("salt");
    String passwordHash = hashPassword(request.password(), salt);

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", userId);
    params.put("email", email);
    params.put("username", username);
    params.put("displayName", request.displayName().trim());
    params.put("avatarUrl", blankToNull(request.avatarUrl()));
    params.put("bio", blankToNull(request.bio()));
    params.put("passwordHash", passwordHash);
    params.put("passwordSalt", salt);

    db.update(
        """
        insert into "User" (
          id,
          email,
          username,
          "displayName",
          "avatarUrl",
          bio,
          "passwordHash",
          "passwordSalt",
          status
        )
        values (
          :id,
          :email,
          :username,
          :displayName,
          :avatarUrl,
          :bio,
          :passwordHash,
          :passwordSalt,
          'ACTIVE'
        )
        """,
        params);

    return buildAuthResponse(userService.findRequired(userId));
  }

  public Map<String, Object> login(LoginRequest request) {
    if (request == null || isBlank(request.identifier()) || isBlank(request.password())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "identifier and password are required");
    }

    String identifier = request.identifier().trim();
    Map<String, Object> row =
        db.first(
            """
            select
              id,
              username,
              email,
              "displayName" as display_name,
              "avatarUrl" as avatar_url,
              bio,
              "passwordHash" as password_hash,
              "passwordSalt" as password_salt
            from "User"
            where username = :identifier
               or lower(coalesce(email, '')) = lower(:identifier)
            """,
            Map.of("identifier", identifier));

    if (row == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
    }

    String passwordHash = json.stringValue(row.get("password_hash"));
    String passwordSalt = json.stringValue(row.get("password_salt"));
    if (isBlank(passwordHash) || isBlank(passwordSalt)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号还未设置密码");
    }

    if (!passwordHash.equals(hashPassword(request.password(), passwordSalt))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
    }

    Map<String, Object> user = userService.findRequired(json.stringValue(row.get("id")));
    return buildAuthResponse(user);
  }

  public Map<String, Object> refresh(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refreshToken is required");
    }
    String userId;
    try {
      userId = jwtService.verifyRefreshOrThrow(refreshToken).userId();
    } catch (io.jsonwebtoken.JwtException exception) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token");
    }
    // Rotate: revoke old refresh, issue new pair
    try {
      jwtService.revoke(jwtService.verifyRefreshOrThrow(refreshToken));
    } catch (io.jsonwebtoken.JwtException ignored) {
      // already invalid — proceed with new pair issuance is harmless
    }
    return buildAuthResponse(userService.findRequired(userId));
  }

  private Map<String, Object> buildAuthResponse(Map<String, Object> user) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("user", user);
    response.put("sessionUserId", user.get("id"));
    response.put("issuedAt", Instant.now());
    JwtService.TokenPair pair = jwtService.issuePair((String) user.get("id"));
    response.putAll(jwtService.toResponseFields(pair));
    return response;
  }

  private void validateUniqueness(String username, String email) {
    if (db.first("select id from \"User\" where username = :username", Map.of("username", username))
        != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "用户名已存在");
    }

    if (email != null
        && db.first(
                "select id from \"User\" where lower(coalesce(email, '')) = lower(:email)",
                Map.of("email", email))
            != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "邮箱已存在");
    }
  }

  private String hashPassword(String password, String salt) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] bytes = digest.digest((salt + ":" + password).getBytes(StandardCharsets.UTF_8));
      StringBuilder builder = new StringBuilder(bytes.length * 2);
      for (byte current : bytes) {
        builder.append(String.format("%02x", current));
      }
      return builder.toString();
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String blankToNull(String value) {
    return isBlank(value) ? null : value.trim();
  }
}
