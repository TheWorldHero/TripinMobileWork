package com.tripin.api.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
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

/**
 * 接收多部分文件上传，落到 UPLOADS_DIR（与 UploadConfig 静态托管同一目录），
 * 返回 storageKey = /uploads/{name}，由 /api/uploads/{name} 对外提供。
 */
@RestController
@RequestMapping("/v1/media")
public class UploadController {
  private final Path uploadsDir;

  public UploadController(@Value("${UPLOADS_DIR:uploads}") String uploadsDir) {
    this.uploadsDir = Path.of(uploadsDir);
  }

  @PostMapping("/upload")
  public Map<String, Object> upload(@RequestParam("file") MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
    }

    String original = file.getOriginalFilename();
    if (original == null || original.isBlank()) {
      original = "upload.bin";
    }
    String safe = original.replaceAll("[^a-zA-Z0-9._-]", "-");
    String name = System.currentTimeMillis() + "-" + UUID.randomUUID() + "-" + safe;

    try {
      Files.createDirectories(uploadsDir);
      Path target = uploadsDir.resolve(name).normalize();
      if (!target.startsWith(uploadsDir.normalize())) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid file name");
      }
      Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to store file");
    }

    String storageKey = "/uploads/" + name;
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("storageKey", storageKey);
    result.put("url", storageKey);
    result.put("originalName", original);
    result.put("mimeType", file.getContentType() == null ? "application/octet-stream" : file.getContentType());
    result.put("bytes", file.getSize());
    return result;
  }
}
