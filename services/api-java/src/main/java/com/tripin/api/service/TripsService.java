package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.GeoSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.web.Requests.AutoAssembleTripRequest;
import com.tripin.api.web.Requests.CreateTripPointRequest;
import com.tripin.api.web.Requests.CreateTripRequest;
import com.tripin.api.web.Requests.PublishTripRequest;
import com.tripin.api.web.Requests.ReorderTripPointsRequest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TripsService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final MediaService mediaService;
  private final TransactionTemplate transactionTemplate;

  public TripsService(
      DbSupport db,
      JsonSupport json,
      UserService userService,
      MediaService mediaService,
      TransactionTemplate transactionTemplate) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.mediaService = mediaService;
    this.transactionTemplate = transactionTemplate;
  }

  public Map<String, Object> createTrip(String userId, CreateTripRequest request) {
    if (request == null || isBlank(request.title())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
    }

    userService.ensureExists(userId);
    String tripId = json.newId("trip");

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", tripId);
    params.put("ownerId", userId);
    params.put("title", request.title());
    params.put("summary", request.summary());
    params.put("kind", defaultValue(request.kind(), "MIXED"));
    params.put("visibility", defaultValue(request.visibility(), "PRIVATE"));
    params.put("cityName", request.cityName());
    params.put("provinceName", request.provinceName());
    params.put("countryCode", defaultValue(request.countryCode(), "CN"));
    params.put("startedAt", request.startedAt());
    params.put("endedAt", request.endedAt());
    params.put("coverMediaId", request.coverMediaId());

    db.update(
        """
        insert into "Trip" (
          id, "ownerId", title, summary, kind, visibility, "cityName", "provinceName",
          "countryCode", "startedAt", "endedAt", "coverMediaId"
        )
        values (
          :id, :ownerId, :title, :summary, cast(:kind as "TripKind"),
          cast(:visibility as "Visibility"), :cityName, :provinceName, :countryCode,
          cast(:startedAt as timestamptz), cast(:endedAt as timestamptz), :coverMediaId
        )
        """,
        params);

    logEvent(userId, "trip_created", Map.of("tripId", tripId), tripId, null);
    return getTrip(userId, tripId);
  }

  public Map<String, Object> listTrips(String userId, Integer rawLimit, String cursor) {
    userService.ensureExists(userId);
    int limit = clamp(rawLimit, 20, 1, 50);

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("ownerId", userId);
    params.put("limit", limit);

    StringBuilder sql =
        new StringBuilder(
            """
            select id, "updatedAt" as updated_at
            from "Trip"
            where "ownerId" = :ownerId and "isLine" = false
            """);

    if (!isBlank(cursor)) {
      Map<String, Object> cursorRow =
          db.first(
              """
              select "updatedAt" as updated_at
              from "Trip"
              where id = :id and "ownerId" = :ownerId and "isLine" = false
              """,
              Map.of("id", cursor, "ownerId", userId));
      if (cursorRow != null) {
        params.put("cursorId", cursor);
        params.put("cursorUpdatedAt", cursorRow.get("updated_at"));
        sql.append(
            """
             and (
               "updatedAt" < :cursorUpdatedAt
               or ("updatedAt" = :cursorUpdatedAt and id < :cursorId)
             )
            """);
      }
    }

    sql.append(" order by \"updatedAt\" desc, id desc limit :limit");

    List<Map<String, Object>> rows = db.list(sql.toString(), params);
    List<Map<String, Object>> items =
        rows.stream().map(row -> loadTripView(json.stringValue(row.get("id")))).toList();

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("items", items);
    response.put("nextCursor", rows.size() == limit ? json.stringValue(rows.getLast().get("id")) : null);
    return response;
  }

  public Map<String, Object> getTrip(String userId, String tripId) {
    assertTripOwner(userId, tripId);
    return loadTripView(tripId);
  }

  public Map<String, Object> updateTrip(String userId, String tripId, CreateTripRequest request) {
    Map<String, Object> existing = assertTripOwner(userId, tripId);
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", tripId);
    params.put("title", coalesce(request == null ? null : request.title(), existing.get("title")));
    params.put("summary", coalesce(request == null ? null : request.summary(), existing.get("summary")));
    params.put("kind", coalesce(request == null ? null : request.kind(), existing.get("kind")));
    params.put(
        "visibility", coalesce(request == null ? null : request.visibility(), existing.get("visibility")));
    params.put("cityName", coalesce(request == null ? null : request.cityName(), existing.get("city_name")));
    params.put(
        "provinceName",
        coalesce(request == null ? null : request.provinceName(), existing.get("province_name")));
    params.put(
        "countryCode",
        coalesce(request == null ? null : request.countryCode(), existing.get("country_code")));
    params.put(
        "startedAt",
        coalesce(request == null ? null : request.startedAt(), instantToString(existing.get("started_at"))));
    params.put(
        "endedAt",
        coalesce(request == null ? null : request.endedAt(), instantToString(existing.get("ended_at"))));
    params.put(
        "coverMediaId",
        coalesce(request == null ? null : request.coverMediaId(), existing.get("cover_media_id")));

    db.update(
        """
        update "Trip"
        set
          title = :title,
          summary = :summary,
          kind = cast(:kind as "TripKind"),
          visibility = cast(:visibility as "Visibility"),
          "cityName" = :cityName,
          "provinceName" = :provinceName,
          "countryCode" = :countryCode,
          "startedAt" = cast(:startedAt as timestamptz),
          "endedAt" = cast(:endedAt as timestamptz),
          "coverMediaId" = :coverMediaId,
          "updatedAt" = now()
        where id = :id
        """,
        params);

    refreshTripAggregates(tripId);
    return getTrip(userId, tripId);
  }

  public Map<String, Object> loadTripView(String tripId) {
    Map<String, Object> trip =
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
              "cityName" as city_name,
              "provinceName" as province_name,
              "countryCode" as country_code,
              "coverMediaId" as cover_media_id,
              "startedAt" as started_at,
              "endedAt" as ended_at,
              "pointCount" as point_count,
              "mediaCount" as media_count,
              "routePreview" as route_preview
            from "Trip"
            where id = :id
            """,
            Map.of("id", tripId));

    if (trip == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found");
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", trip.get("id"));
    result.put("title", trip.get("title"));
    result.put("summary", trip.get("summary"));
    result.put("kind", trip.get("kind"));
    result.put("status", trip.get("status"));
    result.put("visibility", trip.get("visibility"));
    result.put("cityName", trip.get("city_name"));
    result.put("provinceName", trip.get("province_name"));
    result.put("coverMediaId", trip.get("cover_media_id"));
    result.put("pointCount", json.intValue(trip.get("point_count")));
    result.put("mediaCount", json.intValue(trip.get("media_count")));
    result.put("startedAt", json.instantValue(trip.get("started_at")));
    result.put("endedAt", json.instantValue(trip.get("ended_at")));
    result.put("routePreview", normalizeRoutePreview(trip.get("route_preview")));
    result.put("points", loadTripPoints(tripId));
    result.put(
        "coverMedia",
        trip.get("cover_media_id") == null
            ? null
            : loadMediaById(json.stringValue(trip.get("cover_media_id"))));
    result.put("post", loadTripPostRef(tripId));
    return result;
  }

  public Map<String, Object> createPoint(String userId, String tripId, CreateTripPointRequest request) {
    if (request == null || isBlank(request.startedAt())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startedAt is required");
    }

    assertTripOwner(userId, tripId);

    Map<String, Object> place = request.placeId() == null ? null : findPlace(request.placeId());
    Integer maxSequence =
        db.integer(
            "select coalesce(max(sequence), 0) from \"TripPoint\" where \"tripId\" = :tripId",
            Map.of("tripId", tripId));
    int nextSequence = (maxSequence == null ? 0 : maxSequence) + 1;
    String pointId = json.newId("point");

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", pointId);
    params.put("tripId", tripId);
    params.put("placeId", request.placeId());
    params.put("customPlaceName", request.customPlaceName());
    params.put("title", request.title());
    params.put("note", request.note());
    params.put("startedAt", request.startedAt());
    params.put("endedAt", request.endedAt());
    params.put(
        "latitude",
        request.latitude() != null
            ? request.latitude()
            : json.doubleValue(place == null ? null : place.get("latitude")));
    params.put(
        "longitude",
        request.longitude() != null
            ? request.longitude()
            : json.doubleValue(place == null ? null : place.get("longitude")));
    params.put("sequence", nextSequence);
    params.put("sourceType", defaultValue(request.sourceType(), "HYBRID"));
    params.put("addressSnapshot", place == null ? null : json.toJson(placeSnapshot(place)));

    transactionTemplate.executeWithoutResult(
        status -> {
          db.update(
              """
              insert into "TripPoint" (
                id, "tripId", "placeId", "customPlaceName", title, note,
                "startedAt", "endedAt", latitude, longitude, sequence, "sourceType", "addressSnapshot"
              )
              values (
                :id, :tripId, :placeId, :customPlaceName, :title, :note,
                cast(:startedAt as timestamptz), cast(:endedAt as timestamptz),
                :latitude, :longitude, :sequence, cast(:sourceType as "PointSource"),
                cast(:addressSnapshot as jsonb)
              )
              """,
              params);

          if (request.mediaAssetIds() != null && !request.mediaAssetIds().isEmpty()) {
            for (String mediaAssetId : request.mediaAssetIds()) {
              db.update(
                  """
                  update "MediaAsset"
                  set "tripId" = :tripId, "tripPointId" = :pointId, "updatedAt" = now()
                  where id = :mediaId and "ownerId" = :ownerId
                  """,
                  Map.of("tripId", tripId, "pointId", pointId, "mediaId", mediaAssetId, "ownerId", userId));
            }
          }

          refreshTripAggregates(tripId);
          logEvent(userId, "trip_point_created", Map.of("tripPointId", pointId), tripId, null);
        });

    return getTrip(userId, tripId);
  }

  public Map<String, Object> updatePoint(
      String userId, String tripId, String pointId, CreateTripPointRequest request) {
    assertTripOwner(userId, tripId);
    Map<String, Object> existing = loadPointRow(tripId, pointId);
    Map<String, Object> place =
        request != null && request.placeId() != null ? findPlace(request.placeId()) : null;

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", pointId);
    params.put("placeId", coalesce(request == null ? null : request.placeId(), existing.get("place_id")));
    params.put(
        "customPlaceName",
        coalesce(request == null ? null : request.customPlaceName(), existing.get("custom_place_name")));
    params.put("title", coalesce(request == null ? null : request.title(), existing.get("title")));
    params.put("note", coalesce(request == null ? null : request.note(), existing.get("note")));
    params.put(
        "startedAt",
        coalesce(request == null ? null : request.startedAt(), instantToString(existing.get("started_at"))));
    params.put(
        "endedAt",
        coalesce(request == null ? null : request.endedAt(), instantToString(existing.get("ended_at"))));
    params.put(
        "latitude",
        request != null && request.latitude() != null
            ? request.latitude()
            : place != null
                ? json.doubleValue(place.get("latitude"))
                : json.doubleValue(existing.get("latitude")));
    params.put(
        "longitude",
        request != null && request.longitude() != null
            ? request.longitude()
            : place != null
                ? json.doubleValue(place.get("longitude"))
                : json.doubleValue(existing.get("longitude")));
    params.put(
        "sourceType",
        coalesce(request == null ? null : request.sourceType(), existing.get("source_type")));
    params.put(
        "addressSnapshot",
        place != null
            ? json.toJson(placeSnapshot(place))
            : json.asJsonString(existing.get("address_snapshot")));

    transactionTemplate.executeWithoutResult(
        status -> {
          db.update(
              """
              update "TripPoint"
              set
                "placeId" = :placeId,
                "customPlaceName" = :customPlaceName,
                title = :title,
                note = :note,
                "startedAt" = cast(:startedAt as timestamptz),
                "endedAt" = cast(:endedAt as timestamptz),
                latitude = :latitude,
                longitude = :longitude,
                "sourceType" = cast(:sourceType as "PointSource"),
                "addressSnapshot" = cast(:addressSnapshot as jsonb),
                "updatedAt" = now()
              where id = :id
              """,
              params);

          if (request != null && request.mediaAssetIds() != null && !request.mediaAssetIds().isEmpty()) {
            for (String mediaAssetId : request.mediaAssetIds()) {
              db.update(
                  """
                  update "MediaAsset"
                  set "tripPointId" = :pointId, "updatedAt" = now()
                  where id = :mediaId and "ownerId" = :ownerId and "tripId" = :tripId
                  """,
                  Map.of("pointId", pointId, "mediaId", mediaAssetId, "ownerId", userId, "tripId", tripId));
            }
          }

          refreshTripAggregates(tripId);
        });

    return getTrip(userId, tripId);
  }

  public Map<String, Object> deletePoint(String userId, String tripId, String pointId) {
    assertTripOwner(userId, tripId);
    loadPointRow(tripId, pointId);

    transactionTemplate.executeWithoutResult(
        status -> {
          db.update(
              """
              update "MediaAsset"
              set "tripPointId" = null, "updatedAt" = now()
              where "tripPointId" = :pointId and "ownerId" = :ownerId
              """,
              Map.of("pointId", pointId, "ownerId", userId));
          db.update("delete from \"TripPoint\" where id = :id", Map.of("id", pointId));
          reindexPoints(tripId);
          refreshTripAggregates(tripId);
        });

    return getTrip(userId, tripId);
  }

  public Map<String, Object> reorderPoints(
      String userId, String tripId, ReorderTripPointsRequest request) {
    assertTripOwner(userId, tripId);
    if (request == null || request.pointIds() == null || request.pointIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds is required");
    }

    List<Map<String, Object>> existingPoints =
        db.list(
            "select id from \"TripPoint\" where \"tripId\" = :tripId order by sequence asc",
            Map.of("tripId", tripId));

    if (existingPoints.size() != request.pointIds().size()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "pointIds must include every point exactly once");
    }

    List<String> existingIds =
        existingPoints.stream().map(row -> json.stringValue(row.get("id"))).sorted().toList();
    List<String> requestedIds = request.pointIds().stream().sorted().toList();
    if (!existingIds.equals(requestedIds)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "pointIds must include every point exactly once");
    }

    transactionTemplate.executeWithoutResult(
        status -> {
          for (int index = 0; index < request.pointIds().size(); index++) {
            db.update(
                """
                update "TripPoint"
                set sequence = :sequence, "updatedAt" = now()
                where id = :id
                """,
                Map.of("sequence", index + 1, "id", request.pointIds().get(index)));
          }
          refreshTripAggregates(tripId);
        });

    return getTrip(userId, tripId);
  }

  public Map<String, Object> autoAssembleTrip(
      String userId, String tripId, AutoAssembleTripRequest request) {
    assertTripOwner(userId, tripId);
    int timeGapMinutes =
        request == null || request.timeGapMinutes() == null ? 120 : Math.max(request.timeGapMinutes(), 30);
    int distanceGapKm =
        request == null || request.distanceGapKm() == null ? 5 : Math.max(request.distanceGapKm(), 1);

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("ownerId", userId);
    params.put("tripId", tripId);

    StringBuilder sql =
        new StringBuilder(
            """
            select
              id,
              "takenAt" as taken_at,
              "createdAt" as created_at,
              "exifLatitude" as exif_latitude,
              "exifLongitude" as exif_longitude
            from "MediaAsset"
            where "ownerId" = :ownerId and "tripId" = :tripId
            """);

    if (request != null && request.mediaAssetIds() != null && !request.mediaAssetIds().isEmpty()) {
      sql.append(" and id in (:mediaIds)");
      params.put("mediaIds", request.mediaAssetIds());
    }

    sql.append(" order by \"takenAt\" asc nulls last, \"createdAt\" asc");

    List<Map<String, Object>> mediaRows = db.list(sql.toString(), params);
    if (mediaRows.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "No media assets available to assemble");
    }

    List<Map<String, Object>> autoPoints =
        db.list(
            """
            select id from "TripPoint"
            where "tripId" = :tripId and "sourceType" = cast('AUTO' as "PointSource")
            """,
            Map.of("tripId", tripId));

    List<Cluster> clusters = buildClusters(mediaRows, timeGapMinutes, distanceGapKm);
    Integer existingManualPoints =
        db.integer(
            """
            select count(*)
            from "TripPoint"
            where "tripId" = :tripId and "sourceType" <> cast('AUTO' as "PointSource")
            """,
            Map.of("tripId", tripId));

    transactionTemplate.executeWithoutResult(
        status -> {
          if (!autoPoints.isEmpty()) {
            List<String> autoIds =
                autoPoints.stream().map(row -> json.stringValue(row.get("id"))).toList();
            db.update(
                """
                update "MediaAsset"
                set "tripPointId" = null, "updatedAt" = now()
                where "tripPointId" in (:autoIds)
                """,
                Map.of("autoIds", autoIds));
          }

          db.update(
              """
              delete from "TripPoint"
              where "tripId" = :tripId and "sourceType" = cast('AUTO' as "PointSource")
              """,
              Map.of("tripId", tripId));

          for (int index = 0; index < clusters.size(); index++) {
            Cluster cluster = clusters.get(index);
            String pointId = json.newId("point");
            db.update(
                """
                insert into "TripPoint" (
                  id, "tripId", title, "startedAt", "endedAt", latitude, longitude,
                  sequence, "sourceType"
                )
                values (
                  :id, :tripId, :title, cast(:startedAt as timestamptz), cast(:endedAt as timestamptz),
                  :latitude, :longitude, :sequence, cast(:sourceType as "PointSource")
                )
                """,
                Map.of(
                    "id", pointId,
                    "tripId", tripId,
                    "title", "Point " + (index + 1),
                    "startedAt", cluster.startedAt(),
                    "endedAt", cluster.endedAt(),
                    "latitude", cluster.latitude(),
                    "longitude", cluster.longitude(),
                    "sequence", (existingManualPoints == null ? 0 : existingManualPoints) + index + 1,
                    "sourceType", "AUTO"));

            for (String mediaId : cluster.mediaAssetIds()) {
              db.update(
                  """
                  update "MediaAsset"
                  set "tripPointId" = :pointId, "updatedAt" = now()
                  where id = :mediaId and "ownerId" = :ownerId
                  """,
                  Map.of("pointId", pointId, "mediaId", mediaId, "ownerId", userId));
            }
          }

          reindexPoints(tripId);
          refreshTripAggregates(tripId);
          logEvent(
              userId,
              "trip_auto_assembled",
              Map.of("clusterCount", clusters.size(), "mediaCount", mediaRows.size()),
              tripId,
              null);
        });

    return getTrip(userId, tripId);
  }

  public Map<String, Object> publishTrip(String userId, String tripId, PublishTripRequest request) {
    Map<String, Object> trip = assertTripOwner(userId, tripId);
    Integer pointCount = json.intValue(trip.get("point_count"));
    if (pointCount == null || pointCount == 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Trip must contain at least one point before publishing");
    }

    String title =
        request == null || isBlank(request.title()) ? json.stringValue(trip.get("title")) : request.title();
    String summary =
        request == null || request.summary() == null ? json.stringValue(trip.get("summary")) : request.summary();
    String coverMediaId =
        request == null || request.coverMediaId() == null
            ? json.stringValue(trip.get("cover_media_id"))
            : request.coverMediaId();
    String visibility =
        request == null || isBlank(request.visibility()) ? "PUBLIC" : request.visibility();

    transactionTemplate.executeWithoutResult(
        status -> {
          Map<String, Object> tripParams = new LinkedHashMap<>();
          tripParams.put("id", tripId);
          tripParams.put("title", title);
          tripParams.put("summary", summary);
          tripParams.put("coverMediaId", coverMediaId);
          tripParams.put("visibility", visibility);

          db.update(
              """
              update "Trip"
              set
                title = :title,
                summary = :summary,
                "coverMediaId" = :coverMediaId,
                visibility = cast(:visibility as "Visibility"),
                status = cast('PUBLISHED' as "TripStatus"),
                "publishedAt" = now(),
                "updatedAt" = now()
              where id = :id
              """,
              tripParams);

          Map<String, Object> postParams = new LinkedHashMap<>();
          postParams.put("id", json.newId("post"));
          postParams.put("tripId", tripId);
          postParams.put("authorId", userId);
          postParams.put("title", title);
          postParams.put("summary", summary);
          postParams.put("cityName", trip.get("city_name"));
          postParams.put("coverMediaId", coverMediaId);
          postParams.put("pointCount", trip.get("point_count"));
          postParams.put("mediaCount", trip.get("media_count"));
          postParams.put("visibility", visibility);

          db.update(
              """
              insert into "Post" (
                id, "tripId", "authorId", title, summary, "cityName", "coverMediaId",
                "pointCount", "mediaCount", status, visibility, "publishedAt"
              )
              values (
                :id, :tripId, :authorId, :title, :summary, :cityName, :coverMediaId,
                :pointCount, :mediaCount, cast('ACTIVE' as "PostStatus"),
                cast(:visibility as "Visibility"), now()
              )
              on conflict ("tripId") do update set
                title = excluded.title,
                summary = excluded.summary,
                "cityName" = excluded."cityName",
                "coverMediaId" = excluded."coverMediaId",
                "pointCount" = excluded."pointCount",
                "mediaCount" = excluded."mediaCount",
                visibility = excluded.visibility,
                "publishedAt" = now(),
                "updatedAt" = now()
              """,
              postParams);

          logEvent(userId, "trip_published", Map.of("visibility", visibility), tripId, null);
        });

    return getTrip(userId, tripId);
  }

  private List<Map<String, Object>> loadTripPoints(String tripId) {
    List<Map<String, Object>> pointRows =
        db.list(
            """
            select
              tp.id,
              tp.title,
              tp.note,
              tp."customPlaceName" as custom_place_name,
              tp."startedAt" as started_at,
              tp."endedAt" as ended_at,
              tp.latitude,
              tp.longitude,
              tp.sequence,
              tp."sourceType" as source_type,
              tp."mediaCount" as media_count,
              tp."addressSnapshot" as address_snapshot,
              p.id as place_id,
              p.name as place_name,
              p."cityName" as place_city_name,
              p."districtName" as place_district_name,
              p.latitude as place_latitude,
              p.longitude as place_longitude
            from "TripPoint" tp
            left join "Place" p on p.id = tp."placeId"
            where tp."tripId" = :tripId
            order by tp.sequence asc
            """,
            Map.of("tripId", tripId));

    List<String> pointIds =
        pointRows.stream().map(row -> json.stringValue(row.get("id"))).filter(Objects::nonNull).toList();

    Map<String, List<Map<String, Object>>> mediaByPoint = new HashMap<>();
    if (!pointIds.isEmpty()) {
      List<Map<String, Object>> mediaRows =
          db.list(
              """
              select
                id,
                "tripPointId" as trip_point_id,
                "originalName" as original_name,
                caption,
                "takenAt" as taken_at,
                "storageKey" as storage_key,
                bucket,
                status,
                "mimeType" as mime_type,
                width,
                height,
                "exifLatitude" as exif_latitude,
                "exifLongitude" as exif_longitude
              from "MediaAsset"
              where "tripPointId" in (:pointIds)
              order by "takenAt" asc nulls last, "createdAt" asc
              """,
              Map.of("pointIds", pointIds));
      mediaByPoint =
          mediaRows.stream()
              .collect(Collectors.groupingBy(row -> json.stringValue(row.get("trip_point_id"))));
    }

    List<Map<String, Object>> points = new ArrayList<>();
    for (Map<String, Object> row : pointRows) {
      Map<String, Object> point = new LinkedHashMap<>();
      String pointId = json.stringValue(row.get("id"));
      point.put("id", pointId);
      point.put("title", row.get("title"));
      point.put("note", row.get("note"));
      point.put("customPlaceName", row.get("custom_place_name"));
      point.put("startedAt", json.instantValue(row.get("started_at")));
      point.put("endedAt", json.instantValue(row.get("ended_at")));
      point.put("latitude", json.doubleValue(row.get("latitude")));
      point.put("longitude", json.doubleValue(row.get("longitude")));
      point.put("sequence", json.intValue(row.get("sequence")));
      point.put("sourceType", row.get("source_type"));
      point.put("mediaCount", json.intValue(row.get("media_count")));
      point.put("place", toPlaceSummary(row));
      List<Map<String, Object>> mediaAssets =
          mediaByPoint.getOrDefault(pointId, List.of()).stream().map(mediaService::toMedia).toList();
      point.put("mediaAssets", mediaAssets);
      points.add(point);
    }
    return points;
  }

  private void refreshTripAggregates(String tripId) {
    List<Map<String, Object>> points =
        db.list(
            """
            select
              tp.id,
              tp.sequence,
              tp."startedAt" as started_at,
              tp."endedAt" as ended_at,
              tp.latitude,
              tp.longitude,
              (select count(*) from "MediaAsset" m where m."tripPointId" = tp.id) as media_count
            from "TripPoint" tp
            where tp."tripId" = :tripId
            order by tp.sequence asc
            """,
            Map.of("tripId", tripId));

    int pointCount = points.size();
    int mediaCount = 0;
    Instant startedAt = null;
    Instant endedAt = null;
    List<Map<String, Object>> routePreview = new ArrayList<>();

    for (Map<String, Object> point : points) {
      Integer pointMediaCount = json.intValue(point.get("media_count"));
      mediaCount += pointMediaCount == null ? 0 : pointMediaCount;
      Instant pointStart = json.instantValue(point.get("started_at"));
      Instant pointEnd = json.instantValue(point.get("ended_at"));
      if (startedAt == null) {
        startedAt = pointStart;
      }
      endedAt = pointEnd == null ? pointStart : pointEnd;

      db.update(
          """
          update "TripPoint"
          set "mediaCount" = :mediaCount, "updatedAt" = now()
          where id = :id
          """,
          Map.of("mediaCount", pointMediaCount == null ? 0 : pointMediaCount, "id", point.get("id")));

      Double latitude = json.doubleValue(point.get("latitude"));
      Double longitude = json.doubleValue(point.get("longitude"));
      if (latitude != null && longitude != null) {
        Map<String, Object> previewPoint = new LinkedHashMap<>();
        previewPoint.put("pointId", point.get("id"));
        previewPoint.put("sequence", json.intValue(point.get("sequence")));
        previewPoint.put("latitude", latitude);
        previewPoint.put("longitude", longitude);
        routePreview.add(previewPoint);
      }
    }

    Map<String, Object> tripAggregateParams = new LinkedHashMap<>();
    tripAggregateParams.put("id", tripId);
    tripAggregateParams.put("pointCount", pointCount);
    tripAggregateParams.put("mediaCount", mediaCount);
    tripAggregateParams.put("startedAt", startedAt == null ? null : startedAt.toString());
    tripAggregateParams.put("endedAt", endedAt == null ? null : endedAt.toString());
    tripAggregateParams.put("routePreview", json.toJson(routePreview));

    db.update(
        """
        update "Trip"
        set
          "pointCount" = :pointCount,
          "mediaCount" = :mediaCount,
          "startedAt" = cast(:startedAt as timestamp),
          "endedAt" = cast(:endedAt as timestamp),
          "routePreview" = cast(:routePreview as jsonb),
          "updatedAt" = now()
        where id = :id
        """,
        tripAggregateParams);

    db.update(
        """
        update "Post"
        set "pointCount" = :pointCount, "mediaCount" = :mediaCount, "updatedAt" = now()
        where "tripId" = :tripId
        """,
        Map.of("tripId", tripId, "pointCount", pointCount, "mediaCount", mediaCount));
  }

  private void reindexPoints(String tripId) {
    List<Map<String, Object>> points =
        db.list(
            """
            select id
            from "TripPoint"
            where "tripId" = :tripId
            order by sequence asc, "startedAt" asc
            """,
            Map.of("tripId", tripId));

    for (int index = 0; index < points.size(); index++) {
      db.update(
          """
          update "TripPoint"
          set sequence = :sequence, "updatedAt" = now()
          where id = :id
          """,
          Map.of("sequence", index + 1, "id", points.get(index).get("id")));
    }
  }

  private Map<String, Object> assertTripOwner(String userId, String tripId) {
    userService.ensureExists(userId);
    Map<String, Object> trip =
        db.first(
            """
            select
              id,
              title,
              summary,
              kind,
              visibility,
              "cityName" as city_name,
              "provinceName" as province_name,
              "countryCode" as country_code,
              "coverMediaId" as cover_media_id,
              "startedAt" as started_at,
              "endedAt" as ended_at,
              "pointCount" as point_count,
              "mediaCount" as media_count
            from "Trip"
            where id = :id and "ownerId" = :ownerId and "isLine" = false
            """,
            Map.of("id", tripId, "ownerId", userId));

    if (trip == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found");
    }

    return trip;
  }

  private Map<String, Object> loadPointRow(String tripId, String pointId) {
    Map<String, Object> point =
        db.first(
            """
            select
              id,
              "placeId" as place_id,
              "customPlaceName" as custom_place_name,
              title,
              note,
              "startedAt" as started_at,
              "endedAt" as ended_at,
              latitude,
              longitude,
              "sourceType" as source_type,
              "addressSnapshot" as address_snapshot
            from "TripPoint"
            where id = :id and "tripId" = :tripId
            """,
            Map.of("id", pointId, "tripId", tripId));

    if (point == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip point not found");
    }

    return point;
  }

  private Map<String, Object> loadTripPostRef(String tripId) {
    Map<String, Object> row =
        db.first("select id from \"Post\" where \"tripId\" = :tripId", Map.of("tripId", tripId));
    if (row == null) {
      return null;
    }
    return Map.of("id", row.get("id"));
  }

  private Map<String, Object> findPlace(String placeId) {
    Map<String, Object> place =
        db.first(
            """
            select
              id,
              name,
              "formattedAddress" as formatted_address,
              "cityName" as city_name,
              "districtName" as district_name,
              latitude,
              longitude
            from "Place"
            where id = :id
            """,
            Map.of("id", placeId));

    if (place == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Place not found");
    }

    return place;
  }

  private Map<String, Object> toPlaceSummary(Map<String, Object> row) {
    if (row.get("place_id") == null) {
      return null;
    }

    Map<String, Object> place = new LinkedHashMap<>();
    place.put("id", row.get("place_id"));
    place.put("name", row.get("place_name"));
    place.put("cityName", row.get("place_city_name"));
    place.put("districtName", row.get("place_district_name"));
    place.put("latitude", json.doubleValue(row.get("place_latitude")));
    place.put("longitude", json.doubleValue(row.get("place_longitude")));
    return place;
  }

  private Map<String, Object> placeSnapshot(Map<String, Object> place) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("name", place.get("name"));
    snapshot.put("formattedAddress", place.get("formatted_address"));
    snapshot.put("cityName", place.get("city_name"));
    snapshot.put("districtName", place.get("district_name"));
    return snapshot;
  }

  private List<Map<String, Object>> normalizeRoutePreview(Object rawValue) {
    List<Map<String, Object>> preview = json.parseListOfMaps(rawValue);
    return preview.stream()
        .map(
            item -> {
              Map<String, Object> point = new LinkedHashMap<>();
              point.put("pointId", item.get("pointId"));
              point.put("sequence", json.intValue(item.get("sequence")));
              point.put("latitude", json.doubleValue(item.get("latitude")));
              point.put("longitude", json.doubleValue(item.get("longitude")));
              return point;
            })
        .toList();
  }

  private Map<String, Object> loadMediaById(String mediaId) {
    Map<String, Object> row =
        db.first(
            """
            select
              id,
              "originalName" as original_name,
              caption,
              "takenAt" as taken_at,
              "storageKey" as storage_key,
              bucket,
              status,
              "mimeType" as mime_type,
              width,
              height,
              "exifLatitude" as exif_latitude,
              "exifLongitude" as exif_longitude
            from "MediaAsset"
            where id = :id
            """,
            Map.of("id", mediaId));
    return row == null ? null : mediaService.toMedia(row);
  }

  private void logEvent(
      String userId, String eventType, Map<String, Object> payload, String tripId, String postId) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", json.newId("event"));
    params.put("userId", userId);
    params.put("tripId", tripId);
    params.put("postId", postId);
    params.put("eventType", eventType);
    params.put("payload", payload == null ? null : json.toJson(payload));
    db.update(
        """
        insert into "UserActionEvent" (id, "userId", "tripId", "postId", "eventType", payload)
        values (:id, :userId, :tripId, :postId, :eventType, cast(:payload as jsonb))
        """,
        params);
  }

  private List<Cluster> buildClusters(
      List<Map<String, Object>> mediaRows, int timeGapMinutes, int distanceGapKm) {
    List<Cluster> clusters = new ArrayList<>();

    for (Map<String, Object> media : mediaRows) {
      Instant takenAt = json.instantValue(media.get("taken_at"));
      if (takenAt == null) {
        takenAt = json.instantValue(media.get("created_at"));
      }
      Double latitude = json.doubleValue(media.get("exif_latitude"));
      Double longitude = json.doubleValue(media.get("exif_longitude"));
      String mediaId = json.stringValue(media.get("id"));

      Cluster current = clusters.isEmpty() ? null : clusters.getLast();
      if (current == null) {
        clusters.add(new Cluster(takenAt, takenAt, latitude, longitude, new ArrayList<>(List.of(mediaId))));
        continue;
      }

      long gapMinutes = Math.max(0L, (takenAt.toEpochMilli() - current.endedAt().toEpochMilli()) / 60000L);
      Double distanceGap = GeoSupport.haversineInKm(current.latitude(), current.longitude(), latitude, longitude);
      boolean split =
          gapMinutes > timeGapMinutes
              || (distanceGap != null && distanceGap > distanceGapKm);

      if (split) {
        clusters.add(new Cluster(takenAt, takenAt, latitude, longitude, new ArrayList<>(List.of(mediaId))));
      } else {
        current.mediaAssetIds().add(mediaId);
        clusters.set(
            clusters.size() - 1,
            new Cluster(
                current.startedAt(),
                takenAt,
                latitude != null ? latitude : current.latitude(),
                longitude != null ? longitude : current.longitude(),
                current.mediaAssetIds()));
      }
    }

    return clusters;
  }

  private int clamp(Integer value, int defaultValue, int min, int max) {
    if (value == null) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, value));
  }

  private String defaultValue(String value, String defaultValue) {
    return isBlank(value) ? defaultValue : value;
  }

  private String instantToString(Object value) {
    Instant instant = json.instantValue(value);
    return instant == null ? null : instant.toString();
  }

  private Object coalesce(Object preferred, Object fallback) {
    return preferred != null ? preferred : fallback;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private record Cluster(
      Instant startedAt,
      Instant endedAt,
      Double latitude,
      Double longitude,
      List<String> mediaAssetIds) {}
}
