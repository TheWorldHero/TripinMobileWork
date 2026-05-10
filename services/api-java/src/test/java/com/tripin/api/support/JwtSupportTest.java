package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.tripin.api.support.JwtSupport.Issued;
import com.tripin.api.support.JwtSupport.Parsed;
import com.tripin.api.support.JwtSupport.TokenType;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class JwtSupportTest {
  private static final String SECRET = "tripin-test-secret-key-32-bytes-or-more-please";
  private static final String OTHER_SECRET = "another-test-secret-with-32-bytes-min-length-here";

  @Test
  void roundTripAccessToken() {
    JwtSupport jwt = new JwtSupport(SECRET);
    Instant now = Instant.parse("2026-05-10T10:00:00Z");
    Issued issued = jwt.issue("user-123", TokenType.ACCESS, Duration.ofHours(2), now);

    Parsed parsed = jwt.parse(issued.token());

    assertEquals("user-123", parsed.userId());
    assertEquals(issued.jti(), parsed.jti());
    assertEquals(TokenType.ACCESS, parsed.type());
    assertEquals(now, parsed.issuedAt());
    assertEquals(now.plus(Duration.ofHours(2)), parsed.expiresAt());
  }

  @Test
  void refreshTokenTypeIsPreserved() {
    JwtSupport jwt = new JwtSupport(SECRET);
    Issued issued = jwt.issue("u", TokenType.REFRESH, Duration.ofDays(7), Instant.now());
    assertEquals(TokenType.REFRESH, jwt.parse(issued.token()).type());
  }

  @Test
  void eachIssueProducesDistinctJti() {
    JwtSupport jwt = new JwtSupport(SECRET);
    Instant now = Instant.now();
    Issued a = jwt.issue("u", TokenType.ACCESS, Duration.ofMinutes(5), now);
    Issued b = jwt.issue("u", TokenType.ACCESS, Duration.ofMinutes(5), now);
    assertNotEquals(a.jti(), b.jti());
    assertNotEquals(a.token(), b.token());
  }

  @Test
  void expiredTokenThrowsExpired() {
    JwtSupport jwt = new JwtSupport(SECRET);
    Instant longAgo = Instant.now().minus(Duration.ofDays(1));
    Issued expired = jwt.issue("u", TokenType.ACCESS, Duration.ofMinutes(1), longAgo);
    assertThrows(ExpiredJwtException.class, () -> jwt.parse(expired.token()));
  }

  @Test
  void wrongSecretFailsVerify() {
    JwtSupport signer = new JwtSupport(SECRET);
    JwtSupport verifier = new JwtSupport(OTHER_SECRET);
    Issued issued = signer.issue("u", TokenType.ACCESS, Duration.ofMinutes(5), Instant.now());
    assertThrows(JwtException.class, () -> verifier.parse(issued.token()));
  }

  @Test
  void tamperedPayloadFailsVerify() {
    JwtSupport jwt = new JwtSupport(SECRET);
    Issued issued = jwt.issue("u", TokenType.ACCESS, Duration.ofMinutes(5), Instant.now());
    String[] parts = issued.token().split("\\.");
    assertEquals(3, parts.length);
    String tampered = parts[0] + "." + parts[1] + "X." + parts[2];
    assertThrows(JwtException.class, () -> jwt.parse(tampered));
  }

  @Test
  void blankTokenFailsParse() {
    JwtSupport jwt = new JwtSupport(SECRET);
    assertThrows(JwtException.class, () -> jwt.parse(""));
    assertThrows(JwtException.class, () -> jwt.parse(null));
  }

  @Test
  void shortSecretRejected() {
    assertThrows(IllegalArgumentException.class, () -> new JwtSupport("too-short"));
    assertThrows(IllegalArgumentException.class, () -> new JwtSupport(""));
    assertThrows(IllegalArgumentException.class, () -> new JwtSupport(null));
  }

  @Test
  void blankUserIdRejected() {
    JwtSupport jwt = new JwtSupport(SECRET);
    assertThrows(
        IllegalArgumentException.class,
        () -> jwt.issue("", TokenType.ACCESS, Duration.ofMinutes(5), Instant.now()));
    assertThrows(
        IllegalArgumentException.class,
        () -> jwt.issue(null, TokenType.ACCESS, Duration.ofMinutes(5), Instant.now()));
  }

  @Test
  void parsedExpiresAtMatchesIssued() {
    JwtSupport jwt = new JwtSupport(SECRET);
    Instant now = Instant.parse("2026-05-10T10:00:00Z");
    Issued issued = jwt.issue("u", TokenType.ACCESS, Duration.ofSeconds(7200), now);
    Parsed parsed = jwt.parse(issued.token());
    assertNotNull(parsed.expiresAt());
    assertEquals(issued.expiresAt(), parsed.expiresAt());
  }
}
