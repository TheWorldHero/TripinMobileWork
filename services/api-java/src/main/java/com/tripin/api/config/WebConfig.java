package com.tripin.api.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  @Value("${UPLOADS_DIR:/app/uploads}")
  private String uploadsDir;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**").allowedOriginPatterns("*").allowedMethods("*").allowedHeaders("*");
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path absoluteUploads = Paths.get(uploadsDir).toAbsolutePath().normalize();
    String location = absoluteUploads.toUri().toString();
    if (!location.endsWith("/")) {
      location = location + "/";
    }
    registry.addResourceHandler("/uploads/**").addResourceLocations(location);
  }
}
