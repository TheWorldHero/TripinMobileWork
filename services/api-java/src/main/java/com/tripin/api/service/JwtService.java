package com.tripin.api.service;

import com.tripin.api.support.JwtSupport;
import com.tripin.api.support.JwtSupport.Issued;
import com.tripin.api.support.JwtSupport.Parsed;
import com.tripin.api.support.JwtSupport.TokenType;
import io.jsonwebtoken.JwtException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Token issuance + verification orchestrator.
 *
 * Revocation: on logout we write the access token's jti into Redis with a TTL equal to the
 * remaining lifetime of the token. The filter checks for that key on every request — once the
 * token would have expired anyway, the key is gone and the entry self-cleans.
 */
@Service
public class JwtService {
  private static final Logger LOG = LoggerFactory.getLogger(JwtService.class);
  private static final String REVOKED_KEY_PREFIX = "auth:revoked:";

  private final JwtSupport jwt;
  private final StringRedisTemplate redis;
  private final Duration accessTtl;
  private final Duration refreshTtl;

  public JwtService(
      StringRedisTemplate redis,
      @Value("${tripin.auth.jwt.secret}") String secret,
      @Value("${tripin.auth.jwt.access-ttl-seconds}") long accessTtlSeconds,
      @Value("${tripin.auth.jwt.refresh-ttl-seconds}") long refreshTtlSeconds) {
    this.redis = redis;
    this.jwt = new JwtSupport(secret);
    this.accessTtl = Duration.ofSeconds(Math.max(60L, accessTtlSeconds));
    this.refreshTtl = Duration.ofSeconds(Math.max(accessTtlSeconds, refreshTtlSeconds));
  }

  public TokenPair issuePair(String userId) {
    Instant now = Instant.now();
    Issued access = jwt.issue(userId, TokenType.ACCESS, accessTtl, now);
    Issued refresh = jwt.issue(userId, TokenType.REFRESH, refreshTtl, now);
    return new TokenPair(access, refresh);
  }

  public Map<String, Object> toResponseFields(TokenPair pair) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("accessToken", pair.access().token());
    out.put("refreshToken", pair.refresh().token());
    out.put("tokenType", "Bearer");
    out.put("accessExpiresAt", pair.access().expiresAt());
    out.put("refreshExpiresAt", pair.refresh().expiresAt());
    return out;
  }

  /** Returns null if token is invalid, expired, malformed, or revoked. Never throws. */
  public Parsed verifyAccess(String token) {
    Parsed parsed = parseQuiet(token);
    if (parsed == null || parsed.type() != TokenType.ACCESS) {
      return null;
    }
    if (isRevoked(parsed.jti())) {
      return null;
    }
    return parsed;
  }

  /** Strict verification for /auth/refresh: throws JwtException so the controller maps to 401. */
  public Parsed verifyRefreshOrThrow(String token) {
    Parsed parsed = jwt.parse(token);
    if (parsed.type() != TokenType.REFRESH) {
      throw new JwtException("not a refresh token");
    }
    if (isRevoked(parsed.jti())) {
      throw new JwtException("refresh token revoked");
    }
    return parsed;
  }

  public void revoke(Parsed parsed) {
    if (parsed == null || parsed.expiresAt() == null) {
      return;
    }
    Duration remaining = Duration.between(Instant.now(), parsed.expiresAt());
    if (remaining.isNegative() || remaining.isZero()) {
      return;
    }
    try {
      redis.opsForValue().set(REVOKED_KEY_PREFIX + parsed.jti(), "1", remaining);
    } catch (Exception exception) {
      LOG.warn("Failed to write revocation entry for jti={}: {}", parsed.jti(), exception.getMessage());
    }
  }

  private Parsed parseQuiet(String token) {
    try {
      return jwt.parse(token);
    } catch (JwtException exception) {
      return null;
    }
  }

  private boolean isRevoked(String jti) {
    try {
      return Boolean.TRUE.equals(redis.hasKey(REVOKED_KEY_PREFIX + jti));
    } catch (Exception exception) {
      LOG.warn("Revocation check failed for jti={}: {}", jti, exception.getMessage());
      return false;
    }
  }

  public record TokenPair(Issued access, Issued refresh) {}
}
