package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.support.PointStateSupport;
import com.tripin.api.web.Requests.ConfirmPointLocationRequest;
import com.tripin.api.web.Requests.CreatePointRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PointsService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;

  public PointsService(DbSupport db, JsonSupport json, UserService userService) {
    this.db = db;
    this.json = json;
    this.userService = userService;
  }

  public Map<String, Object> createDraftPoint(String userId, CreatePointRequest request) {
    userService.ensureExists(userId);
    if (request == null || request.mediaAssetIds() == null || request.mediaAssetIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mediaAssetIds are required");
    }
    if (isBlank(request.capturedAt())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "capturedAt is required");
    }

    String pointId = json.newId("point");
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", pointId);
    params.put("ownerId", userId);
    params.put("title", request.title());
    params.put("note", request.note());
    params.put("capturedAt", request.capturedAt());
    params.put("mediaCount", request.mediaAssetIds().size());
    params.put("mediaAssetIds", json.toJson(request.mediaAssetIds()));

    db.update(
        """
        insert into "Point" (
          id, "ownerId", title, note, "capturedAt", "mediaCount", "mediaAssetIds"
        )
        values (
          :id, :ownerId, :title, :note, cast(:capturedAt as timestamp(3)), :mediaCount, cast(:mediaAssetIds as jsonb)
        )
        """,
        params);

    return getPointView(userId, pointId);
  }

  public Map<String, Object> confirmLocation(
      String userId, String pointId, ConfirmPointLocationRequest request) {
    userService.ensureExists(userId);
    if (request == null || isBlank(request.checkInAt())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkInAt is required");
    }
    if (request.placeId() == null && (request.latitude() == null || request.longitude() == null)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "placeId or coordinates are required");
    }

    assertPointOwner(userId, pointId);

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", pointId);
    params.put("ownerId", userId);
    params.put("placeId", request.placeId());
    params.put("latitude", request.latitude());
    params.put("longitude", request.longitude());
    params.put("checkInAt", request.checkInAt());

    db.update(
        """
        update "Point"
        set
          "placeId" = :placeId,
          latitude = :latitude,
          longitude = :longitude,
          "checkInAt" = cast(:checkInAt as timestamp(3)),
          "updatedAt" = now()
        where id = :id and "ownerId" = :ownerId
        """,
        params);

    invalidateAttachedLineRouteGeometry(pointId);

    return getPointView(userId, pointId);
  }

  public Map<String, Object> getInbox(String userId) {
    userService.ensureExists(userId);
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
              p."createdAt" as created_at,
              p."updatedAt" as updated_at
            from "Point" p
            where p."ownerId" = :ownerId
              and p."mediaCount" > 0
              and not exists (
                select 1 from "LinePoint" lp where lp."pointId" = p.id
              )
            order by p."createdAt" desc, p.id desc
            """,
            Map.of("ownerId", userId));

    List<Map<String, Object>> items = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      items.add(toPointView(row));
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("items", items);
    result.put("nextCursor", null);
    return result;
  }

  private Map<String, Object> getPointView(String userId, String pointId) {
    Map<String, Object> row = assertPointOwner(userId, pointId);
    return toPointView(row);
  }

  private Map<String, Object> toPointView(Map<String, Object> row) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", row.get("id"));
    result.put("title", row.get("title"));
    result.put("note", row.get("note"));
    result.put("capturedAt", json.instantValue(row.get("captured_at")));
    result.put("checkInAt", json.instantValue(row.get("check_in_at")));
    result.put("placeId", row.get("place_id"));
    result.put("latitude", json.doubleValue(row.get("latitude")));
    result.put("longitude", json.doubleValue(row.get("longitude")));
    result.put("mediaCount", json.intValue(row.get("media_count")));
    result.put("mediaAssetIds", json.parseStringList(row.get("media_asset_ids")));
    result.put(
        "state",
        PointStateSupport.from(
            new PointStateSupport.PointSnapshot(
                json.stringValue(row.get("id")),
                json.intValue(row.get("media_count")) == null ? 0 : json.intValue(row.get("media_count")),
                json.stringValue(row.get("place_id")),
                json.doubleValue(row.get("latitude")),
                json.doubleValue(row.get("longitude")),
                json.instantValue(row.get("check_in_at")))));
    return result;
  }

  private Map<String, Object> assertPointOwner(String userId, String pointId) {
    Map<String, Object> row =
        db.first(
            """
            select
              id,
              "ownerId" as owner_id,
              title,
              note,
              "capturedAt" as captured_at,
              "checkInAt" as check_in_at,
              "placeId" as place_id,
              latitude,
              longitude,
              "mediaCount" as media_count,
              "mediaAssetIds" as media_asset_ids
            from "Point"
            where id = :id and "ownerId" = :ownerId
            """,
            Map.of("id", pointId, "ownerId", userId));
    if (row == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Point not found");
    }
    return row;
  }

  private void invalidateAttachedLineRouteGeometry(String pointId) {
    List<Map<String, Object>> lineRows =
        db.list(
            """
            select distinct "lineId" as line_id
            from "LinePoint"
            where "pointId" = :pointId
            """,
            Map.of("pointId", pointId));

    for (Map<String, Object> lineRow : lineRows) {
      String lineId = json.stringValue(lineRow.get("line_id"));
      if (lineId == null) {
        continue;
      }
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
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
