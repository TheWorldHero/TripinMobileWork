package com.tripin.api.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

/**
 * Redis 连接工厂：从 REDIS_URL 解析（与 DataSourceConfig 解析 DATABASE_URL 同风格）。
 *
 * <p>格式 redis://[:password@]host:port[/db]。未设置时默认 localhost:6379——
 * 本地无 Redis 时连接懒加载、不会导致启动失败（消息队列会自动降级为同步处理，见 EventPublisher）。
 * 服务器上由 docker-compose 注入 REDIS_URL=redis://redis:6379。
 */
@Configuration
public class RedisConfig {
  @Bean
  LettuceConnectionFactory redisConnectionFactory(
      @Value("${REDIS_URL:redis://localhost:6379}") String redisUrl) {
    return new LettuceConnectionFactory(parse(redisUrl));
  }

  private RedisStandaloneConfiguration parse(String rawUrl) {
    String host = "localhost";
    int port = 6379;
    String password = null;
    int database = 0;

    if (rawUrl != null && !rawUrl.isBlank()) {
      try {
        URI uri = new URI(rawUrl.trim());
        if (uri.getHost() != null) {
          host = uri.getHost();
        }
        if (uri.getPort() > 0) {
          port = uri.getPort();
        }
        String userInfo = uri.getUserInfo();
        if (userInfo != null && !userInfo.isBlank()) {
          int separator = userInfo.indexOf(':');
          password = separator >= 0 ? userInfo.substring(separator + 1) : userInfo;
        }
        String path = uri.getPath();
        if (path != null && path.length() > 1) {
          try {
            database = Integer.parseInt(path.substring(1));
          } catch (NumberFormatException ignored) {
            // keep default database 0
          }
        }
      } catch (Exception ignored) {
        // fall back to localhost defaults on a malformed URL
      }
    }

    RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(host, port);
    if (password != null && !password.isBlank()) {
      config.setPassword(password);
    }
    config.setDatabase(database);
    return config;
  }
}
