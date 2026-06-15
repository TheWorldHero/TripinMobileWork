package com.tripin.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripin.api.support.DbSupport;
import com.tripin.api.support.GeoSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.support.RouteSegmentFallbackSupport;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoutesService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final TransactionTemplate transactionTemplate;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
  private final String amapKey;

  public RoutesService(
      DbSupport db,
      JsonSupport json,
      UserService userService,
      TransactionTemplate transactionTemplate,
      ObjectMapper objectMapper,
      @Value("${AMAP_WEB_SERVICE_KEY:}") String amapKey) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.transactionTemplate = transactionTemplate;
    this.objectMapper = objectMapper;
    this.amapKey = amapKey == null ? "" : amapKey.trim();
  }

  public Map<String, Object> refreshLineRoutes(String userId, String lineId) {
    userService.ensureExists(userId);
    return transactionTemplate.execute(
        status -> {
          assertLineOwner(userId, lineId);
          List<LinePointSnapshot> points = loadOrderedLinePoints(lineId);
          deleteExistingSegments(lineId);

          long totalDistanceMeters = 0L;
          long totalDurationSeconds = 0L;
          int segmentsUpdated = 0;

          if (points.size() >= 2) {
            validateCoordinates(points);
            for (int index = 0; index < points.size() - 1; index++) {
              LinePointSnapshot from = points.get(index);
              LinePointSnapshot to = points.get(index + 1);
              PlannedSegment plannedSegment = planOrFallback(from, to);
              saveSegment(lineId, from.pointId(), to.pointId(), plannedSegment);
              totalDistanceMeters += plannedSegment.distanceMeters();
              totalDurationSeconds += plannedSegment.durationSeconds();
              segmentsUpdated++;
            }
          }

          updateTripTotals(lineId, totalDistanceMeters, totalDurationSeconds);

          Map<String, Object> response = new LinkedHashMap<>();
          response.put("lineId", lineId);
          response.put("segmentsUpdated", segmentsUpdated);
          response.put("totalDistanceMeters", totalDistanceMeters);
          response.put("totalDurationSeconds", totalDurationSeconds);
          return response;
        });
  }

  private void updateTripTotals(String lineId, long totalDistanceMeters, long totalDurationSeconds) {
    db.update(
        """
        update "Trip"
        set "totalDistanceMeters" = :totalDistanceMeters,
            "totalDurationSeconds" = :totalDurationSeconds,
            "updatedAt" = now()
        where id = :lineId
        """,
        Map.of(
            "lineId", lineId,
            "totalDistanceMeters", totalDistanceMeters,
            "totalDurationSeconds", totalDurationSeconds));
  }

  private void deleteExistingSegments(String lineId) {
    db.update("delete from \"RouteSegment\" where \"lineId\" = :lineId", Map.of("lineId", lineId));
  }

  private void saveSegment(
      String lineId, String fromPointId, String toPointId, PlannedSegment plannedSegment) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", json.newId("route-segment"));
    params.put("lineId", lineId);
    params.put("fromPointId", fromPointId);
    params.put("toPointId", toPointId);
    params.put("provider", plannedSegment.provider());
    params.put("distanceMeters", plannedSegment.distanceMeters());
    params.put("durationSeconds", plannedSegment.durationSeconds());
    params.put("polyline", plannedSegment.polyline());
    params.put("strategy", plannedSegment.strategy());
    params.put("rawRoutePayload", plannedSegment.rawRoutePayload());

    db.update(
        """
        insert into "RouteSegment" (
          id, "lineId", "fromPointId", "toPointId", provider, "distanceMeters",
          "durationSeconds", polyline, strategy, "rawRoutePayload"
        )
        values (
          :id, :lineId, :fromPointId, :toPointId, :provider, :distanceMeters,
          :durationSeconds, :polyline, :strategy, cast(:rawRoutePayload as jsonb)
        )
        """,
        params);
  }

  private PlannedSegment planOrFallback(LinePointSnapshot from, LinePointSnapshot to) {
    if (!amapKey.isBlank()) {
      try {
        PlannedSegment planned = planWithAmap(from, to);
        if (planned != null) {
          return planned;
        }
      } catch (RuntimeException ignored) {
        // Fall through to the deterministic fallback below.
      }
    }
    return fallbackSegment(from, to);
  }

  private PlannedSegment planWithAmap(LinePointSnapshot from, LinePointSnapshot to) {
    JsonNode payload = fetchAmapJson(buildAmapDirectionsUrl(from, to));
    JsonNode route = payload.path("route");
    JsonNode paths = route.path("paths");
    if (!paths.isArray() || paths.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AMap route response missing paths");
    }

    JsonNode path = paths.get(0);
    long distanceMeters = path.path("distance").asLong(-1L);
    long durationSeconds = path.path("duration").asLong(-1L);
    if (distanceMeters < 0 || durationSeconds < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AMap route response missing metrics");
    }

    String polyline = flattenPolyline(path.path("steps"));
    if (polyline.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AMap route response missing geometry");
    }

    Map<String, Object> raw = objectMapper.convertValue(payload, Map.class);
    return new PlannedSegment("AMAP", "amap_driving", distanceMeters, durationSeconds, polyline, json.toJson(raw));
  }

  private PlannedSegment fallbackSegment(LinePointSnapshot from, LinePointSnapshot to) {
    String polyline =
        RouteSegmentFallbackSupport.straightLine(
            List.of(
                new RouteSegmentFallbackSupport.RoutePoint(from.latitude(), from.longitude()),
                new RouteSegmentFallbackSupport.RoutePoint(to.latitude(), to.longitude())));
    long distanceMeters = estimateDistanceMeters(from, to);
    long durationSeconds = Math.max(60L, Math.round(distanceMeters / 11.11d));
    return new PlannedSegment("FALLBACK", "straight_line", distanceMeters, durationSeconds, polyline, null);
  }

  private long estimateDistanceMeters(LinePointSnapshot from, LinePointSnapshot to) {
    Double distanceKm =
        GeoSupport.haversineInKm(from.latitude(), from.longitude(), to.latitude(), to.longitude());
    return distanceKm == null ? 0L : Math.max(1L, Math.round(distanceKm * 1000.0));
  }

  private String flattenPolyline(JsonNode steps) {
    if (steps == null || !steps.isArray()) {
      return "";
    }

    List<String> polylines = new ArrayList<>();
    for (JsonNode step : steps) {
      String polyline = step.path("polyline").asText("");
      if (!polyline.isBlank()) {
        polylines.add(polyline);
      }
    }
    return String.join(";", polylines);
  }

  private String buildAmapDirectionsUrl(LinePointSnapshot from, LinePointSnapshot to) {
    return "https://restapi.amap.com/v3/direction/driving?key="
        + encode(amapKey)
        + "&origin="
        + encode(from.longitude() + "," + from.latitude())
        + "&destination="
        + encode(to.longitude() + "," + to.latitude())
        + "&extensions=base&strategy=2&output=JSON";
  }

  private JsonNode fetchAmapJson(String url) {
    try {
      HttpResponse<String> response =
          httpClient.send(
              HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(8)).GET().build(),
              HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "AMap request failed with " + response.statusCode());
      }

      JsonNode payload = objectMapper.readTree(response.body());
      if (!"1".equals(payload.path("status").asText())) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "AMap request failed: " + payload.path("info").asText());
      }
      return payload;
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AMap request failed", exception);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AMap request failed", exception);
    }
  }

  private List<LinePointSnapshot> loadOrderedLinePoints(String lineId) {
    List<Map<String, Object>> rows =
        db.list(
            """
            select
              p.id,
              p.latitude,
              p.longitude,
              lp.sequence
            from "LinePoint" lp
            join "Point" p on p.id = lp."pointId"
            where lp."lineId" = :lineId
            order by lp.sequence asc, lp.id asc
            """,
            Map.of("lineId", lineId));

    List<LinePointSnapshot> points = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      points.add(
          new LinePointSnapshot(
              json.stringValue(row.get("id")),
              json.doubleValue(row.get("latitude")),
              json.doubleValue(row.get("longitude")),
              json.intValue(row.get("sequence"))));
    }
    return points;
  }

  private void validateCoordinates(List<LinePointSnapshot> points) {
    for (LinePointSnapshot point : points) {
      if (point.latitude() == null || point.longitude() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "line points require coordinates");
      }
    }
  }

  private Map<String, Object> assertLineOwner(String userId, String lineId) {
    Map<String, Object> line =
        db.first(
            """
            select id
            from "Trip"
            where id = :id and "ownerId" = :ownerId and "isLine" = true
            for update
            """,
            Map.of("id", lineId, "ownerId", userId));
    if (line == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Line not found");
    }
    return line;
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private record LinePointSnapshot(String pointId, Double latitude, Double longitude, Integer sequence) {}

  private record PlannedSegment(
      String provider,
      String strategy,
      long distanceMeters,
      long durationSeconds,
      String polyline,
      String rawRoutePayload) {}
}
