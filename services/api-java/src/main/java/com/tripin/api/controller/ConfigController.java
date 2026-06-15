package com.tripin.api.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 暴露「前端运行所需、且本就会出现在浏览器里的」公开配置——目前只有高德 Web JS Key。
 * 这样 Key 只存在服务器的环境变量里：仓库与克隆者本地都不需要持有它，前端运行时向本接口索取即可。
 *
 * 安全约束：这里**只**返回客户端本就可见的高德 JS Key / 安全码；
 * 绝不返回服务端密钥（AMAP_WEB_SERVICE_KEY、数据库密码、JWT 密钥等）。
 */
@RestController
@RequestMapping("/v1/config")
public class ConfigController {
  private final String amapJsKey;
  private final String amapJsSecurityCode;

  public ConfigController(
      @Value("${AMAP_JS_KEY:}") String amapJsKey,
      @Value("${AMAP_JS_SECURITY_CODE:}") String amapJsSecurityCode) {
    this.amapJsKey = amapJsKey == null ? "" : amapJsKey.trim();
    this.amapJsSecurityCode = amapJsSecurityCode == null ? "" : amapJsSecurityCode.trim();
  }

  @GetMapping("/web")
  public Map<String, Object> web() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("amapJsKey", amapJsKey);
    result.put("amapJsSecurityCode", amapJsSecurityCode);
    result.put("amapConfigured", !amapJsKey.isEmpty());
    return result;
  }
}
