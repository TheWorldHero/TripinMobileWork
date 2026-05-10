package com.tripin.api.config;

import com.tripin.api.service.JwtService;
import com.tripin.api.web.JwtAuthFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class SecurityConfig {

  @Bean
  public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration(JwtService jwtService) {
    FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>();
    registration.setFilter(new JwtAuthFilter(jwtService));
    registration.addUrlPatterns("/v1/*");
    registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 50);
    return registration;
  }
}
