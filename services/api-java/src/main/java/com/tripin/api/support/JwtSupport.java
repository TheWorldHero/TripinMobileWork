package com.tripin.api.support;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;

/**
 * Pure JWT sign/verify helpers. No Spring, no Redis — just key management and claim shaping.
 *
 * Tokens carry:
 *   sub  = userId
 *   jti  = unique id (used by callers as the revocation key)
 *   typ  = "access" | "refresh" (custom claim)
 */
public final class JwtSupport {

  public enum TokenType {
    ACCESS,
    REFRESH;

    public String wireValue() {
      return name().toLowerCase();
    }

    public static TokenType fromWire(Object value) {
      if (value == null) {
        return null;
      }
      String text = value.toString().trim().toLowerCase();
      for (TokenType type : values()) {
        if (type.wireValue().equals(text)) {
          return type;
        }
      }
      return null;
    }
  }

  public record Issued(String token, String jti, Instant issuedAt, Instant expiresAt) {}

  public record Parsed(String userId, String jti, TokenType type, Instant issuedAt, Instant expiresAt) {}

  private final SecretKey key;

  public JwtSupport(String secret) {
    if (secret == null || secret.isBlank()) {
      throw new IllegalArgumentException("JWT secret must not be blank");
    }
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      throw new IllegalArgumentException("JWT secret must be at least 32 bytes (HS256)");
    }
    this.key = Keys.hmacShaKeyFor(bytes);
  }

  public Issued issue(String userId, TokenType type, Duration ttl, Instant now) {
    if (userId == null || userId.isBlank()) {
      throw new IllegalArgumentException("userId required");
    }
    String jti = UUID.randomUUID().toString();
    Instant expiresAt = now.plus(ttl);
    String token =
        Jwts.builder()
            .subject(userId)
            .id(jti)
            .claim("typ", type.wireValue())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(key)
            .compact();
    return new Issued(token, jti, now, expiresAt);
  }

  public Parsed parse(String token) throws JwtException {
    if (token == null || token.isBlank()) {
      throw new JwtException("token is blank");
    }
    Claims claims;
    try {
      claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    } catch (ExpiredJwtException expired) {
      throw expired;
    }
    String userId = claims.getSubject();
    String jti = claims.getId();
    TokenType type = TokenType.fromWire(claims.get("typ"));
    if (userId == null || userId.isBlank() || jti == null || type == null) {
      throw new JwtException("missing required claims");
    }
    Instant issuedAt = claims.getIssuedAt() == null ? null : claims.getIssuedAt().toInstant();
    Instant expiresAt = claims.getExpiration() == null ? null : claims.getExpiration().toInstant();
    return new Parsed(userId, jti, type, issuedAt, expiresAt);
  }
}
