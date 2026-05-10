package com.tripin.api.controller;

import com.tripin.api.service.PlacesService;
import com.tripin.api.web.Requests.CreatePlaceRequest;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/places")
public class PlacesController {
  private final PlacesService placesService;

  public PlacesController(PlacesService placesService) {
    this.placesService = placesService;
  }

  @PostMapping
  public Map<String, Object> upsert(@RequestBody CreatePlaceRequest request) {
    return placesService.upsert(request);
  }

  @GetMapping("/search")
  public List<Map<String, Object>> search(
      @RequestParam String keyword,
      @RequestParam(required = false) String cityName,
      @RequestParam(required = false) Double latitude,
      @RequestParam(required = false) Double longitude,
      @RequestParam(required = false) Boolean cityLimit,
      @RequestParam(required = false) Integer limit) {
    return placesService.search(keyword, cityName, latitude, longitude, cityLimit, limit);
  }

  @GetMapping("/suggest")
  public List<Map<String, Object>> suggest(
      @RequestParam String keyword,
      @RequestParam(required = false) String cityName,
      @RequestParam(required = false) Double latitude,
      @RequestParam(required = false) Double longitude,
      @RequestParam(required = false) Boolean cityLimit,
      @RequestParam(required = false) Integer limit) {
    return placesService.suggest(keyword, cityName, latitude, longitude, cityLimit, limit);
  }

  @GetMapping("/reverse-geocode")
  public Map<String, Object> reverseGeocode(
      @RequestParam Double latitude,
      @RequestParam Double longitude,
      @RequestParam(required = false) Integer radius) {
    return placesService.reverseGeocode(latitude, longitude, radius);
  }

  @GetMapping("/status")
  public Map<String, Object> status() {
    return placesService.providerStatus();
  }

  /**
   * IP-based geolocation fallback for devices without Google Play Services
   * (e.g. Huawei). The mobile client falls back to this when expo-location
   * fails. Accuracy is city-level only — good enough to populate a temp point.
   *
   * The request's source IP is forwarded to AMap, so even though the call goes
   * through our backend, AMap geo-locates the original client.
   */
  @GetMapping("/ip-location")
  public Map<String, Object> ipLocation(
      HttpServletRequest request,
      @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor,
      @RequestParam(required = false) String ip) {
    String resolvedIp = firstNonBlank(ip, firstHopOf(forwardedFor), request.getRemoteAddr());
    return placesService.ipLocation(resolvedIp);
  }

  private static String firstHopOf(String header) {
    if (header == null || header.isBlank()) return null;
    int comma = header.indexOf(',');
    return (comma < 0 ? header : header.substring(0, comma)).trim();
  }

  private static String firstNonBlank(String... values) {
    for (String v : values) {
      if (v != null && !v.isBlank()) return v.trim();
    }
    return null;
  }

  @GetMapping("/static-map")
  public ResponseEntity<byte[]> staticMap(
      @RequestParam(required = false) String route,
      @RequestParam(required = false) String focus,
      @RequestParam(required = false) Integer width,
      @RequestParam(required = false) Integer height,
      @RequestParam(required = false) Boolean traffic,
      @RequestParam(required = false) Double centerLng,
      @RequestParam(required = false) Double centerLat,
      @RequestParam(required = false) Integer zoom,
      @RequestParam(required = false) Boolean hideMarkers,
      @RequestParam(required = false) Boolean hidePaths,
      @RequestParam(required = false) String provider) {
    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
        .contentType(MediaType.IMAGE_PNG)
        .body(placesService.staticMap(route, focus, width, height, traffic, centerLng, centerLat, zoom, hideMarkers, hidePaths, provider));
  }
}
