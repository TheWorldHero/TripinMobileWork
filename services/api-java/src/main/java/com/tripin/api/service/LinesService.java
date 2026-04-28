package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.support.LinePointSequenceSupport;
import com.tripin.api.support.PointStateSupport;
import com.tripin.api.web.Requests.AttachPointsRequest;
import com.tripin.api.web.Requests.CreateLineRequest;
import com.tripin.api.web.Requests.ReorderLinePointsRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LinesService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final TransactionTemplate transactionTemplate;

  public LinesService(
      DbSupport db,
      JsonSupport json,
      UserService userService,
      TransactionTemplate transactionTemplate) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.transactionTemplate = transactionTemplate;
  }

  public Map<String, Object> createLine(String userId, CreateLineRequest request) {
    userService.ensureExists(userId);
    if (request == null || isBlank(request.title())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
    }

    String lineId = json.newId("line");
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", lineId);
    params.put("ownerId", userId);
    params.put("title", request.title());
    params.put("summary", request.summary());
    params.put("visibility", defaultValue(request.visibility(), "PRIVATE"));

    db.update(
        """
        insert into "Trip" (
          id, "ownerId", title, summary, kind, visibility, "isLine"
        )
        values (
          :id, :ownerId, :title, :summary, cast('MIXED' as "TripKind"),
          cast(:visibility as "Visibility"), true
        )
        """,
        params);

    return getLine(userId, lineId);
  }

  public Map<String, Object> getLine(String userId, String lineId) {
    userService.ensureExists(userId);
    Map<String, Object> line = assertLineOwner(userId, lineId);
    List<Map<String, Object>> points = loadLinePoints(lineId);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", line.get("id"));
    result.put("title", line.get("title"));
    result.put("summary", line.get("summary"));
    result.put("visibility", line.get("visibility"));
    result.put("status", line.get("status"));
    result.put("pointCount", json.intValue(line.get("point_count")));
    result.put("routeSegments", loadRouteSegments(lineId));
    result.put("points", points);
    return result;
  }

  public Map<String, Object> attachPoints(String userId, String lineId, AttachPointsRequest request) {
    userService.ensureExists(userId);
    assertLineOwner(userId, lineId);
    if (request == null || request.pointIds() == null || request.pointIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds are required");
    }

    Set<String> requestedIds = request.pointIds().stream().collect(Collectors.toSet());
    if (requestedIds.size() != request.pointIds().size()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds must be unique");
    }

    transactionTemplate.executeWithoutResult(
        status -> {
          lockLineOwner(userId, lineId);
          List<Map<String, Object>> attachedRows =
              db.list(
                  """
                  select "pointId" as point_id
                  from "LinePoint"
                  where "pointId" in (:pointIds)
                  """,
                  Map.of("pointIds", request.pointIds()));
          if (!attachedRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "point is already attached");
          }

          int nextSequence = nextSequence(lineId);
          for (String pointId : request.pointIds()) {
            Map<String, Object> point = assertPointOwner(userId, pointId);
            assertReadyForLine(point);
            db.update(
                """
                insert into "LinePoint" (
                  id, "lineId", "pointId", sequence
                )
                values (
                  :id, :lineId, :pointId, :sequence
                )
                """,
                Map.of(
                    "id", json.newId("line-point"),
                    "lineId", lineId,
                    "pointId", pointId,
                    "sequence", nextSequence));
            nextSequence++;
          }

          invalidateRouteGeometry(lineId);
        });

    return getLine(userId, lineId);
  }

  public Map<String, Object> reorderPoints(String userId, String lineId, ReorderLinePointsRequest request) {
    userService.ensureExists(userId);
    if (request == null || request.pointIds() == null || request.pointIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds are required");
    }

    return transactionTemplate.execute(
        status -> {
          lockLineOwner(userId, lineId);

          List<Map<String, Object>> existing =
              db.list(
                  """
                  select id, "pointId" as point_id
                  from "LinePoint"
                  where "lineId" = :lineId
                  order by sequence asc
                  """,
                  Map.of("lineId", lineId));
          if (existing.size() != request.pointIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds must match attached points");
          }

          Set<String> existingIds =
              existing.stream().map(row -> json.stringValue(row.get("point_id"))).collect(Collectors.toSet());
          Set<String> requestedIds = request.pointIds().stream().collect(Collectors.toSet());
          if (requestedIds.size() != request.pointIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds must be unique");
          }
          if (!existingIds.equals(requestedIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds must match attached points");
          }

          for (LinePointSequenceSupport.SequenceUpdate update :
              LinePointSequenceSupport.planTwoPhase(request.pointIds())) {
            Map<String, Object> existingRow =
                existing.stream()
                    .filter(row -> update.pointId().equals(json.stringValue(row.get("point_id"))))
                    .findFirst()
                    .orElseThrow();
            db.update(
                """
                update "LinePoint"
                set sequence = :sequence
                where id = :id and "lineId" = :lineId
                """,
                Map.of(
                    "id", existingRow.get("id"),
                    "lineId", lineId,
                    "sequence", update.sequence()));
          }

          invalidateRouteGeometry(lineId);
          return getLine(userId, lineId);
        });
  }

  public Map<String, Object> detachPoint(String userId, String lineId, String pointId) {
    userService.ensureExists(userId);
    assertLineOwner(userId, lineId);

    transactionTemplate.executeWithoutResult(
        status -> {
          lockLineOwner(userId, lineId);
          int deleted =
              db.update(
                  """
                  delete from "LinePoint"
                  where "lineId" = :lineId and "pointId" = :pointId
                  """,
                  Map.of("lineId", lineId, "pointId", pointId));
          if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Point is not attached to the line");
          }

          List<Map<String, Object>> remaining =
              db.list(
                  """
                  select id
                  from "LinePoint"
                  where "lineId" = :lineId
                  order by sequence asc, id asc
                  """,
                  Map.of("lineId", lineId));
          for (int index = 0; index < remaining.size(); index++) {
            db.update(
                """
                update "LinePoint"
                set sequence = :sequence
                where id = :id and "lineId" = :lineId
                """,
                Map.of("id", remaining.get(index).get("id"), "lineId", lineId, "sequence", index));
          }

          invalidateRouteGeometry(lineId);
        });

    return getLine(userId, lineId);
  }

  private Map<String, Object> assertLineOwner(String userId, String lineId) {
    Map<String, Object> line =
        db.first(
            """
            select
              id,
              "ownerId" as owner_id,
              title,
              summary,
              kind,
              status,
              visibility,
              "totalDistanceMeters" as total_distance_meters,
              "totalDurationSeconds" as total_duration_seconds,
              (select count(*) from "LinePoint" lp where lp."lineId" = t.id) as point_count
            from "Trip" t
            where id = :id and "ownerId" = :ownerId and "isLine" = true
            """,
            Map.of("id", lineId, "ownerId", userId));
    if (line == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Line not found");
    }
    return line;
  }

  private List<Map<String, Object>> loadRouteSegments(String lineId) {
    List<Map<String, Object>> rows =
        db.list(
            """
            select
              id,
              "fromPointId" as from_point_id,
              "toPointId" as to_point_id,
              provider,
              strategy,
              "distanceMeters" as distance_meters,
              "durationSeconds" as duration_seconds,
              polyline
            from "RouteSegment"
            where "lineId" = :lineId
            order by "generatedAt" asc, id asc
            """,
            Map.of("lineId", lineId));

    List<Map<String, Object>> routeSegments = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      Map<String, Object> routeSegment = new LinkedHashMap<>();
      routeSegment.put("id", row.get("id"));
      routeSegment.put("fromPointId", row.get("from_point_id"));
      routeSegment.put("toPointId", row.get("to_point_id"));
      routeSegment.put("provider", row.get("provider"));
      routeSegment.put("strategy", row.get("strategy"));
      routeSegment.put("distanceMeters", row.get("distance_meters"));
      routeSegment.put("durationSeconds", row.get("duration_seconds"));
      routeSegment.put("polyline", row.get("polyline"));
      routeSegments.add(routeSegment);
    }
    return routeSegments;
  }

  private void invalidateRouteGeometry(String lineId) {
    db.update("delete from \"RouteSegment\" where \"lineId\" = :lineId", Map.of("lineId", lineId));
    db.update(
        """
        update "Trip"
        set "totalDistanceMeters" = 0,
            "totalDurationSeconds" = 0,
            "updatedAt" = now()
        where id = :lineId
        """,
        Map.of("lineId", lineId));
  }

  private int nextSequence(String lineId) {
    Integer maxSequence =
        db.integer(
            "select coalesce(max(sequence), -1) from \"LinePoint\" where \"lineId\" = :lineId",
            Map.of("lineId", lineId));
    return (maxSequence == null ? -1 : maxSequence) + 1;
  }

  private void lockLineOwner(String userId, String lineId) {
    Map<String, Object> row =
        db.first(
            """
            select id
            from "Trip"
            where id = :id and "ownerId" = :ownerId and "isLine" = true
            for update
            """,
            Map.of("id", lineId, "ownerId", userId));
    if (row == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Line not found");
    }
  }

  private List<Map<String, Object>> loadLinePoints(String lineId) {
    List<Map<String, Object>> rows =
        db.list(
            """
            select
              p.id,
              p.title,
              p.note,
              p."capturedAt" as captured_at,
              p."checkInAt" as check_in_at,
              p."placeId" as place_id,
              p.latitude,
              p.longitude,
              p."mediaCount" as media_count,
              p."mediaAssetIds" as media_asset_ids,
              lp.sequence
            from "LinePoint" lp
            join "Point" p on p.id = lp."pointId"
            where lp."lineId" = :lineId
            order by lp.sequence asc
            """,
            Map.of("lineId", lineId));
    List<Map<String, Object>> points = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      Map<String, Object> point = new LinkedHashMap<>();
      point.put("id", row.get("id"));
      point.put("title", row.get("title"));
      point.put("note", row.get("note"));
      point.put("capturedAt", json.instantValue(row.get("captured_at")));
      point.put("checkInAt", json.instantValue(row.get("check_in_at")));
      point.put("placeId", row.get("place_id"));
      point.put("latitude", json.doubleValue(row.get("latitude")));
      point.put("longitude", json.doubleValue(row.get("longitude")));
      point.put("mediaCount", json.intValue(row.get("media_count")));
      point.put("mediaAssetIds", json.parseStringList(row.get("media_asset_ids")));
      point.put("sequence", json.intValue(row.get("sequence")));
      point.put(
          "state",
          PointStateSupport.from(
              new PointStateSupport.PointSnapshot(
                  json.stringValue(row.get("id")),
                  json.intValue(row.get("media_count")) == null ? 0 : json.intValue(row.get("media_count")),
                  json.stringValue(row.get("place_id")),
                  json.doubleValue(row.get("latitude")),
                  json.doubleValue(row.get("longitude")),
                  json.instantValue(row.get("check_in_at")))));
      points.add(point);
    }
    return points;
  }

  private Map<String, Object> assertPointOwner(String userId, String pointId) {
    Map<String, Object> row =
        db.first(
            """
            select
              id,
              "mediaCount" as media_count,
              "mediaAssetIds" as media_asset_ids,
              "placeId" as place_id,
              latitude,
              longitude,
              "checkInAt" as check_in_at
            from "Point"
            where id = :id and "ownerId" = :ownerId
            """,
            Map.of("id", pointId, "ownerId", userId));
    if (row == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Point not found");
    }
    return row;
  }

  private void assertReadyForLine(Map<String, Object> pointRow) {
    Integer mediaCount = json.intValue(pointRow.get("media_count"));
    PointStateSupport.PointSnapshot snapshot =
        new PointStateSupport.PointSnapshot(
            json.stringValue(pointRow.get("id")),
            mediaCount == null ? 0 : mediaCount,
            json.stringValue(pointRow.get("place_id")),
            json.doubleValue(pointRow.get("latitude")),
            json.doubleValue(pointRow.get("longitude")),
            json.instantValue(pointRow.get("check_in_at")));
    if (PointStateSupport.from(snapshot) != PointStateSupport.PointState.READY_FOR_LINE) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "point must be ready for line");
    }
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String defaultValue(String value, String fallback) {
    return isBlank(value) ? fallback : value;
  }
}
