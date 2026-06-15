package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.web.Requests.LoginRequest;
import com.tripin.api.web.Requests.RegisterRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private static final int PBKDF2_ITERATIONS = 210_000;
  private static final int PBKDF2_KEY_BITS = 256;
  private static final String PBKDF2_PREFIX = "pbkdf2$";
  private static final int MIN_PASSWORD_LENGTH = 6;

  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;

  public AuthService(DbSupport db, JsonSupport json, UserService userService) {
    this.db = db;
    this.json = json;
    this.userService = userService;
  }

  public Map<String, Object> register(RegisterRequest request) {
    if (request == null
        || isBlank(request.username())
        || isBlank(request.displayName())
        || isBlank(request.password())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "username, displayName and password are required");
    }

    if (request.password().length() < MIN_PASSWORD_LENGTH) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "密码长度至少需要 " + MIN_PASSWORD_LENGTH + " 位");
    }

    String username = request.username().trim();
    String email = isBlank(request.email()) ? null : request.email().trim().toLowerCase();
    validateUniqueness(username, email);

    String userId = json.newId("user");
    String salt = json.newId("salt");
    String passwordHash = hashPasswordPbkdf2(request.password(), salt);

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

    if (!verifyPassword(request.password(), passwordSalt, passwordHash)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
    }

    String userId = json.stringValue(row.get("id"));
    if (!passwordHash.startsWith(PBKDF2_PREFIX)) {
      // Transparently re-hash legacy SHA-256 credentials with PBKDF2 on successful login.
      db.update(
          "update \"User\" set \"passwordHash\" = :hash, \"updatedAt\" = now() where id = :id",
          Map.of("hash", hashPasswordPbkdf2(request.password(), passwordSalt), "id", userId));
    }

    Map<String, Object> user = userService.findRequired(userId);
    return buildAuthResponse(user);
  }

  private Map<String, Object> buildAuthResponse(Map<String, Object> user) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("user", user);
    response.put("sessionUserId", user.get("id"));
    response.put("issuedAt", Instant.now());
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

  private boolean verifyPassword(String password, String salt, String storedHash) {
    if (storedHash.startsWith(PBKDF2_PREFIX)) {
      String[] parts = storedHash.split("\\$");
      if (parts.length != 3) {
        return false;
      }
      int iterations;
      try {
        iterations = Integer.parseInt(parts[1]);
      } catch (NumberFormatException exception) {
        return false;
      }
      return constantTimeEquals(parts[2], pbkdf2Hex(password, salt, iterations));
    }
    return constantTimeEquals(storedHash, legacySha256(password, salt));
  }

  private String hashPasswordPbkdf2(String password, String salt) {
    return PBKDF2_PREFIX + PBKDF2_ITERATIONS + "$" + pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  }

  private String pbkdf2Hex(String password, String salt, int iterations) {
    try {
      PBEKeySpec spec =
          new PBEKeySpec(
              password.toCharArray(),
              salt.getBytes(StandardCharsets.UTF_8),
              iterations,
              PBKDF2_KEY_BITS);
      SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
      return toHex(factory.generateSecret(spec).getEncoded());
    } catch (NoSuchAlgorithmException | InvalidKeySpecException exception) {
      throw new IllegalStateException("PBKDF2 is unavailable", exception);
    }
  }

  private String legacySha256(String password, String salt) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return toHex(digest.digest((salt + ":" + password).getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  private boolean constantTimeEquals(String expected, String actual) {
    return MessageDigest.isEqual(
        expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
  }

  private String toHex(byte[] bytes) {
    StringBuilder builder = new StringBuilder(bytes.length * 2);
    for (byte current : bytes) {
      builder.append(String.format("%02x", current));
    }
    return builder.toString();
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String blankToNull(String value) {
    return isBlank(value) ? null : value.trim();
  }
}
