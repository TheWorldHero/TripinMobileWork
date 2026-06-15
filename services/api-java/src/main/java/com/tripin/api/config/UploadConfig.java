package com.tripin.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 把用户上传目录（UPLOADS_DIR）对外静态提供。
 * 因 context-path = /api，最终访问路径为 /api/uploads/**。
 */
@Configuration
public class UploadConfig implements WebMvcConfigurer {
  private final String uploadsDir;

  public UploadConfig(@Value("${UPLOADS_DIR:uploads}") String uploadsDir) {
    this.uploadsDir = uploadsDir;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String location = uploadsDir.endsWith("/") ? uploadsDir : uploadsDir + "/";
    registry.addResourceHandler("/uploads/**").addResourceLocations("file:" + location);
  }
}
