package com.tripin.api.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/v1/uploads")
public class UploadsController {

  @Value("${UPLOADS_DIR:/app/uploads}")
  private String uploadsDir;

  /**
   * Mobile clients POST a multipart `file` here. Files are stored on disk and
   * later served back via the static handler at /uploads/** (registered in WebConfig).
   * Mirrors the response shape of the original Next.js /api/uploads route so the
   * mobile client doesn't have to change its parsing.
   */
  @PostMapping
  public Map<String, Object> upload(@RequestParam("file") MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
    }

    Path target;
    String finalName;
    try {
      Path dir = Paths.get(uploadsDir).toAbsolutePath();
      Files.createDirectories(dir);

      String safeName = sanitizeFilename(file.getOriginalFilename());
      finalName = System.currentTimeMillis() + "-" + UUID.randomUUID() + "-" + safeName;
      target = dir.resolve(finalName);
      try (var in = file.getInputStream()) {
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
      }
    } catch (IOException e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save upload", e);
    }

    String storageKey = "/uploads/" + finalName;
    Map<String, Object> response = new HashMap<>();
    response.put("url", storageKey);
    response.put("storageKey", storageKey);
    response.put("originalName", file.getOriginalFilename());
    response.put("mimeType", file.getContentType() != null ? file.getContentType() : "application/octet-stream");
    response.put("bytes", file.getSize());
    return response;
  }

  private static String sanitizeFilename(String name) {
    if (name == null || name.isBlank()) {
      return "upload.bin";
    }
    String lower = name.toLowerCase(Locale.ROOT);
    StringBuilder sb = new StringBuilder(lower.length());
    for (int i = 0; i < lower.length(); i++) {
      char c = lower.charAt(i);
      boolean ok = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '.' || c == '_' || c == '-';
      sb.append(ok ? c : '-');
    }
    return sb.toString();
  }
}
