package com.tripin.api;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TripinApiApplication {
  public static void main(String[] args) {
    loadEnvFiles();
    SpringApplication.run(TripinApiApplication.class, args);
  }

  private static void loadEnvFiles() {
    Path current = Paths.get("").toAbsolutePath().normalize();
    Set<Path> candidates = new LinkedHashSet<>();

    for (Path cursor = current; cursor != null; cursor = cursor.getParent()) {
      candidates.add(cursor.resolve(Path.of("services", "api-java", ".env")));
      candidates.add(cursor.resolve(Path.of("services", "api", ".env")));
      candidates.add(cursor.resolve(".env"));
    }

    for (Path candidate : candidates) {
      loadEnvFile(candidate);
    }
  }

  private static void loadEnvFile(Path path) {
    if (!Files.exists(path)) {
      return;
    }

    try {
      List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
      for (String line : lines) {
        String trimmed = line.trim();
        if (trimmed.isEmpty() || trimmed.startsWith("#")) {
          continue;
        }

        int separator = trimmed.indexOf('=');
        if (separator <= 0) {
          continue;
        }

        String key = trimmed.substring(0, separator).trim();
        String value = trimmed.substring(separator + 1).trim();
        if (System.getenv(key) == null && System.getProperty(key) == null) {
          System.setProperty(key, value);
        }
      }
    } catch (IOException ignored) {
      // Ignore local env loading failures and continue with existing environment variables.
    }
  }
}
