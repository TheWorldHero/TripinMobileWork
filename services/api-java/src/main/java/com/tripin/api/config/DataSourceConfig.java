package com.tripin.api.config;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSourceConfig {
  @Bean
  HikariDataSource dataSource(@Value("${DATABASE_URL:}") String databaseUrl) {
    if (databaseUrl == null || databaseUrl.isBlank()) {
      throw new IllegalStateException("DATABASE_URL is required");
    }

    ParsedDatabaseUrl parsed = parseDatabaseUrl(databaseUrl);
    HikariDataSource dataSource = new HikariDataSource();
    dataSource.setJdbcUrl(parsed.jdbcUrl());
    dataSource.setUsername(parsed.username());
    dataSource.setPassword(parsed.password());
    dataSource.setMaximumPoolSize(10);
    dataSource.setMinimumIdle(1);
    return dataSource;
  }

  private ParsedDatabaseUrl parseDatabaseUrl(String rawUrl) {
    try {
      URI uri = new URI(rawUrl);
      String[] userInfo = uri.getUserInfo() == null ? new String[0] : uri.getUserInfo().split(":", 2);
      String username = userInfo.length > 0 ? userInfo[0] : "";
      String password = userInfo.length > 1 ? userInfo[1] : "";
      String databaseName = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");

      List<String> queryPairs = new ArrayList<>();
      String query = uri.getQuery();
      if (query != null && !query.isBlank()) {
        for (String pair : query.split("&")) {
          if (pair.startsWith("schema=")) {
            queryPairs.add("currentSchema=" + pair.substring("schema=".length()));
          } else if (!pair.isBlank()) {
            queryPairs.add(pair);
          }
        }
      }

      String jdbcUrl =
          "jdbc:postgresql://"
              + uri.getHost()
              + ":"
              + (uri.getPort() > 0 ? uri.getPort() : 5432)
              + "/"
              + databaseName
              + (queryPairs.isEmpty() ? "" : "?" + String.join("&", queryPairs));

      return new ParsedDatabaseUrl(jdbcUrl, username, password);
    } catch (URISyntaxException exception) {
      throw new IllegalStateException("Invalid DATABASE_URL", exception);
    }
  }

  private record ParsedDatabaseUrl(String jdbcUrl, String username, String password) {}
}
