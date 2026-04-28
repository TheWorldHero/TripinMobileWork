package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.GeoSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.support.RouteSegmentFallbackSupport;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DevSupportService {
  private final DbSupport db;
  private final JsonSupport json;
  private final TransactionTemplate transactionTemplate;

  public DevSupportService(DbSupport db, JsonSupport json, TransactionTemplate transactionTemplate) {
    this.db = db;
    this.json = json;
    this.transactionTemplate = transactionTemplate;
  }

  public Map<String, Object> getStatus() {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("ok", true);
    response.put("users", db.longValue("select count(*) from \"User\"", Map.of()));
    response.put("trips", db.longValue("select count(*) from \"Trip\"", Map.of()));
    response.put("posts", db.longValue("select count(*) from \"Post\"", Map.of()));
    return response;
  }

  public Map<String, Object> seedDemo(boolean reset) {
    transactionTemplate.executeWithoutResult(
        status -> {
          if (reset) {
            db.update("delete from \"RouteSegment\"", Map.of());
            db.update("delete from \"LinePoint\"", Map.of());
            db.update("delete from \"Point\"", Map.of());
            db.update("delete from \"Comment\"", Map.of());
            db.update("delete from \"PostLike\"", Map.of());
            db.update("delete from \"PostSave\"", Map.of());
            db.update("delete from \"FeedImpression\"", Map.of());
            db.update("delete from \"UserActionEvent\"", Map.of());
            db.update("delete from \"Post\"", Map.of());
            db.update("delete from \"MediaAsset\"", Map.of());
            db.update("delete from \"TripPoint\"", Map.of());
            db.update("delete from \"Trip\"", Map.of());
            db.update("delete from \"Place\"", Map.of());
            db.update("delete from \"User\"", Map.of());
          }

          upsertUsers();
          upsertPlaces();
          upsertTrip();
          upsertMedia();
          upsertPoints();
          upsertInboxPoint();
          upsertEditingLine();
          upsertPublishedLine();
          finalizeTripAndPost();
          upsertEngagement();
        });

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("ok", true);
    response.put("users", 2);
    response.put("posts", 1);
    response.put("tripId", "trip-beijing-spring-weekend");
    response.put("postId", "post-beijing-spring-weekend");
    return response;
  }

  private void upsertUsers() {
    db.update(
        """
        insert into "User" (id, username, "displayName", bio, status)
        values ('demo-user', 'demo', 'Demo User', 'Local MVP tester', 'ACTIVE')
        on conflict (id) do update set
          username = excluded.username,
          "displayName" = excluded."displayName",
          bio = excluded.bio,
          "updatedAt" = now()
        """,
        Map.of());

    db.update(
        """
        insert into "User" (id, username, "displayName", bio, status)
        values ('creator-li', 'liwen', 'Li Wen', 'Map-first life timeline creator', 'ACTIVE')
        on conflict (id) do update set
          username = excluded.username,
          "displayName" = excluded."displayName",
          bio = excluded.bio,
          "updatedAt" = now()
        """,
        Map.of());
  }

  private void upsertPlaces() {
    upsertPlace(
        "place-beijing-temple-heaven",
        "Temple of Heaven",
        "Temple of Heaven Park, Dongcheng, Beijing",
        "Beijing",
        "Beijing",
        "Dongcheng",
        39.882245,
        116.406605);
    upsertPlace(
        "place-beijing-qianmen",
        "Qianmen Street",
        "Qianmen Street, Dongcheng, Beijing",
        "Beijing",
        "Beijing",
        "Dongcheng",
        39.899051,
        116.397942);
    upsertPlace(
        "place-beijing-shichahai",
        "Shichahai",
        "Shichahai, Xicheng, Beijing",
        "Beijing",
        "Beijing",
        "Xicheng",
        39.948698,
        116.379151);
    upsertPlace(
        "place-beijing-798",
        "798 Art District",
        "798 Art District, Chaoyang, Beijing",
        "Beijing",
        "Beijing",
        "Chaoyang",
        39.984123,
        116.497512);
  }

  private void upsertInboxPoint() {
    upsertInboxMedia();
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", "point-inbox-demo");
    params.put("ownerId", "demo-user");
    params.put("title", "Inbox draft point");
    params.put("note", "A point waiting for location confirmation.");
    params.put("capturedAt", "2026-04-17T06:30:00Z");
    params.put("mediaAssetIds", json.toJson(List.of("media-inbox-demo")));
    db.update(
        """
        insert into "Point" (
          id, "ownerId", title, note, "capturedAt", "mediaCount", "mediaAssetIds"
        )
        values (
          :id, :ownerId, :title, :note, cast(:capturedAt as timestamp(3)), 1,
          cast(:mediaAssetIds as jsonb)
        )
        on conflict (id) do update set
          "ownerId" = excluded."ownerId",
          title = excluded.title,
          note = excluded.note,
          "capturedAt" = excluded."capturedAt",
          "mediaCount" = excluded."mediaCount",
          "mediaAssetIds" = excluded."mediaAssetIds",
          "updatedAt" = now()
        """,
        params);
  }

  private void upsertInboxMedia() {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", "media-inbox-demo");
    params.put("caption", "Inbox photo waiting for a place confirmation.");
    params.put("takenAt", "2026-04-17T06:24:00Z");
    params.put("latitude", 39.9111);
    params.put("longitude", 116.3979);
    db.update(
        """
        insert into "MediaAsset" (
          id, "ownerId", bucket, "storageKey", "originalName", "mimeType", bytes,
          width, height, caption, "takenAt", "exifLatitude", "exifLongitude", status
        )
        values (
          :id, 'demo-user', 'tripin-media', 'demo/' || :id || '.jpg', :id || '.jpg',
          'image/jpeg', 1800000, 1600, 900, :caption, cast(:takenAt as timestamptz),
          :latitude, :longitude, cast('READY' as "MediaStatus")
        )
        on conflict (id) do update set
          caption = excluded.caption,
          "takenAt" = excluded."takenAt",
          "exifLatitude" = excluded."exifLatitude",
          "exifLongitude" = excluded."exifLongitude",
          status = excluded.status,
          "updatedAt" = now()
        """,
        params);
  }

  private void upsertEditingLine() {
    upsertLine(
        "line-demo-editing",
        "demo-user",
        "Editing line",
        "Draft line that is still being arranged on mobile.",
        "DRAFT");
    upsertLinePoint(
        "line-demo-editing",
        "point-editing-1",
        "Editing start",
        "Ready for line editing.",
        "place-beijing-qianmen",
        39.899051,
        116.397942,
        1,
        "2026-04-17T07:00:00Z",
        "2026-04-17T07:05:00Z",
        List.of("media-temple-1"));
    upsertLinePoint(
        "line-demo-editing",
        "point-editing-2",
        "Editing finish",
        "Second anchor for the draft line.",
        "place-beijing-shichahai",
        39.948698,
        116.379151,
        2,
        "2026-04-17T07:20:00Z",
        "2026-04-17T07:30:00Z",
        List.of("media-qianmen-1"));
  }

  private void upsertPublishedLine() {
    upsertLine(
        "line-demo-published",
        "creator-li",
        "Published Beijing loop",
        "A published line backed by stored route segments.",
        "PUBLISHED");
    upsertLinePoint(
        "line-demo-published",
        "point-published-1",
        "Temple of Heaven",
        "Start of the published loop.",
        "place-beijing-temple-heaven",
        39.882245,
        116.406605,
        1,
        "2026-04-05T00:30:00Z",
        "2026-04-05T00:40:00Z",
        List.of("media-temple-1"));
    upsertLinePoint(
        "line-demo-published",
        "point-published-2",
        "Qianmen Street",
        "Midpoint for the published loop.",
        "place-beijing-qianmen",
        39.899051,
        116.397942,
        2,
        "2026-04-05T06:20:00Z",
        "2026-04-05T06:25:00Z",
        List.of("media-qianmen-1"));
    upsertLinePoint(
        "line-demo-published",
        "point-published-3",
        "Shichahai",
        "Late afternoon lakeside stop.",
        "place-beijing-shichahai",
        39.948698,
        116.379151,
        3,
        "2026-04-05T11:20:00Z",
        "2026-04-05T11:25:00Z",
        List.of("media-shichahai-1"));
    upsertLinePoint(
        "line-demo-published",
        "point-published-4",
        "798 Art District",
        "Finish for the published line.",
        "place-beijing-798",
        39.984123,
        116.497512,
        4,
        "2026-04-06T09:00:00Z",
        "2026-04-06T09:30:00Z",
        List.of("media-798-1"));
    upsertRouteSegmentsForPublishedLine();
  }

  private void upsertLine(
      String id, String ownerId, String title, String summary, String status) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", id);
    params.put("ownerId", ownerId);
    params.put("title", title);
    params.put("summary", summary);
    params.put("status", status);
    db.update(
        """
        insert into "Trip" (
          id, "ownerId", title, summary, kind, status, visibility, "isLine"
        )
        values (
          :id, :ownerId, :title, :summary, cast('MIXED' as "TripKind"),
          cast(:status as "TripStatus"), cast('PUBLIC' as "Visibility"), true
        )
        on conflict (id) do update set
          "ownerId" = excluded."ownerId",
          title = excluded.title,
          summary = excluded.summary,
          status = excluded.status,
          visibility = excluded.visibility,
          "isLine" = excluded."isLine",
          "updatedAt" = now()
        """,
        params);
  }

  private void upsertLinePoint(
      String lineId,
      String pointId,
      String title,
      String note,
      String placeId,
      double latitude,
      double longitude,
      int sequence,
      String checkInAt,
      String departureAt,
      List<String> mediaAssetIds) {
    Map<String, Object> pointParams = new LinkedHashMap<>();
    pointParams.put("id", pointId);
    pointParams.put("ownerId", lineId.startsWith("line-demo-editing") ? "demo-user" : "creator-li");
    pointParams.put("placeId", placeId);
    pointParams.put("title", title);
    pointParams.put("note", note);
    pointParams.put("checkInAt", checkInAt);
    pointParams.put("latitude", latitude);
    pointParams.put("longitude", longitude);
    pointParams.put("mediaAssetIds", json.toJson(mediaAssetIds));
    db.update(
        """
        insert into "Point" (
          id, "ownerId", "placeId", title, note, "checkInAt", latitude, longitude,
          "mediaCount", "mediaAssetIds"
        )
        values (
          :id, :ownerId, :placeId, :title, :note, cast(:checkInAt as timestamp(3)),
          :latitude, :longitude, 1, cast(:mediaAssetIds as jsonb)
        )
        on conflict (id) do update set
          "ownerId" = excluded."ownerId",
          "placeId" = excluded."placeId",
          title = excluded.title,
          note = excluded.note,
          "checkInAt" = excluded."checkInAt",
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          "mediaCount" = excluded."mediaCount",
          "mediaAssetIds" = excluded."mediaAssetIds",
          "updatedAt" = now()
        """,
        pointParams);

    Map<String, Object> linePointParams = new LinkedHashMap<>();
    linePointParams.put("id", pointId.replace("point-", "line-point-"));
    linePointParams.put("lineId", lineId);
    linePointParams.put("pointId", pointId);
    linePointParams.put("sequence", sequence);
    linePointParams.put("departureAt", departureAt);
    db.update(
        """
        insert into "LinePoint" (
          id, "lineId", "pointId", sequence, "departureAt"
        )
        values (
          :id, :lineId, :pointId, :sequence, cast(:departureAt as timestamp(3))
        )
        on conflict (id) do update set
          "lineId" = excluded."lineId",
          "pointId" = excluded."pointId",
          sequence = excluded.sequence,
          "departureAt" = excluded."departureAt"
        """,
        linePointParams);
  }

  private void upsertRouteSegmentsForPublishedLine() {
    db.update("delete from \"RouteSegment\" where \"lineId\" = 'line-demo-published'", Map.of());
    List<Map<String, Object>> routePoints =
        List.of(
            routePoint("point-published-1", 1, 39.882245, 116.406605),
            routePoint("point-published-2", 2, 39.899051, 116.397942),
            routePoint("point-published-3", 3, 39.948698, 116.379151),
            routePoint("point-published-4", 4, 39.984123, 116.497512));
    long totalDistance = 0L;
    long totalDuration = 0L;
    for (int index = 0; index < routePoints.size() - 1; index++) {
      Map<String, Object> from = routePoints.get(index);
      Map<String, Object> to = routePoints.get(index + 1);
      double fromLat = (double) from.get("latitude");
      double fromLon = (double) from.get("longitude");
      double toLat = (double) to.get("latitude");
      double toLon = (double) to.get("longitude");
      long distanceMeters =
          Math.max(1L, Math.round(GeoSupport.haversineInKm(fromLat, fromLon, toLat, toLon) * 1000.0));
      long durationSeconds = Math.max(60L, Math.round(distanceMeters / 11.11d));
      totalDistance += distanceMeters;
      totalDuration += durationSeconds;
      db.update(
          """
          insert into "RouteSegment" (
            id, "lineId", "fromPointId", "toPointId", provider, "distanceMeters",
            "durationSeconds", polyline, strategy, "rawRoutePayload"
          )
          values (
            :id, 'line-demo-published', :fromPointId, :toPointId, 'SEED', :distanceMeters,
            :durationSeconds, :polyline, 'straight_line', cast(null as jsonb)
          )
          on conflict (id) do update set
            "fromPointId" = excluded."fromPointId",
            "toPointId" = excluded."toPointId",
            provider = excluded.provider,
            "distanceMeters" = excluded."distanceMeters",
            "durationSeconds" = excluded."durationSeconds",
            polyline = excluded.polyline,
            strategy = excluded.strategy
          """,
          Map.of(
              "id", "route-segment-demo-" + (index + 1),
              "fromPointId", from.get("pointId"),
              "toPointId", to.get("pointId"),
              "distanceMeters", distanceMeters,
              "durationSeconds", durationSeconds,
              "polyline",
                  RouteSegmentFallbackSupport.straightLine(
                      List.of(
                          new RouteSegmentFallbackSupport.RoutePoint(fromLat, fromLon),
                          new RouteSegmentFallbackSupport.RoutePoint(toLat, toLon)))));
    }

    db.update(
        """
        update "Trip"
        set "pointCount" = 4,
            "mediaCount" = 4,
            "totalDistanceMeters" = :totalDistance,
            "totalDurationSeconds" = :totalDuration,
            "routePreview" = cast(:routePreview as jsonb),
            "startedAt" = cast('2026-04-04T23:00:00Z' as timestamptz),
            "endedAt" = cast('2026-04-06T09:30:00Z' as timestamptz),
            "publishedAt" = cast('2026-04-06T12:00:00Z' as timestamptz),
            status = cast('PUBLISHED' as "TripStatus"),
            visibility = cast('PUBLIC' as "Visibility"),
            "updatedAt" = now()
        where id = 'line-demo-published'
        """,
        Map.of(
            "totalDistance", totalDistance,
            "totalDuration", totalDuration,
            "routePreview",
                json.toJson(
                    new Object[] {
                      routePoints.get(0), routePoints.get(1), routePoints.get(2), routePoints.get(3)
                    })));
  }

  private void upsertPlace(
      String providerId,
      String name,
      String formattedAddress,
      String provinceName,
      String cityName,
      String districtName,
      double latitude,
      double longitude) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", providerId);
    params.put("providerId", providerId);
    params.put("name", name);
    params.put("formattedAddress", formattedAddress);
    params.put("provinceName", provinceName);
    params.put("cityName", cityName);
    params.put("districtName", districtName);
    params.put("latitude", latitude);
    params.put("longitude", longitude);
    db.update(
        """
        insert into "Place" (
          id, provider, "providerId", name, "formattedAddress", "provinceName",
          "cityName", "districtName", "countryCode", latitude, longitude
        )
        values (
          :id, cast('AMAP' as "PlaceProvider"), :providerId, :name, :formattedAddress,
          :provinceName, :cityName, :districtName, 'CN', :latitude, :longitude
        )
        on conflict (provider, "providerId") do update set
          name = excluded.name,
          "formattedAddress" = excluded."formattedAddress",
          "provinceName" = excluded."provinceName",
          "cityName" = excluded."cityName",
          "districtName" = excluded."districtName",
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          "updatedAt" = now()
        """,
        params);
  }

  private void upsertTrip() {
    db.update(
        """
        insert into "Trip" (
          id, "ownerId", title, summary, kind, status, visibility,
          "cityName", "provinceName", "countryCode"
        )
        values (
          'trip-beijing-spring-weekend', 'creator-li',
          'Beijing spring weekend route',
          'A slow weekend route from the Temple of Heaven to Shichahai and 798.',
          cast('MIXED' as "TripKind"),
          cast('DRAFT' as "TripStatus"),
          cast('PUBLIC' as "Visibility"),
          'Beijing', 'Beijing', 'CN'
        )
        on conflict (id) do update set
          title = excluded.title,
          summary = excluded.summary,
          kind = excluded.kind,
          visibility = excluded.visibility,
          "cityName" = excluded."cityName",
          "provinceName" = excluded."provinceName",
          "updatedAt" = now()
        """,
        Map.of());
  }

  private void upsertMedia() {
    upsertMedia(
        "media-temple-1",
        "Soft light and red walls early in the morning.",
        "2026-04-04T23:18:00Z",
        39.882245,
        116.406605);
    upsertMedia(
        "media-qianmen-1",
        "Lunch and a walk through the street after noon.",
        "2026-04-05T05:10:00Z",
        39.899051,
        116.397942);
    upsertMedia(
        "media-shichahai-1",
        "The lake in late afternoon is the calmest moment of the day.",
        "2026-04-05T10:35:00Z",
        39.948698,
        116.379151);
    upsertMedia(
        "media-798-1",
        "798 is good for a slower second afternoon.",
        "2026-04-06T07:20:00Z",
        39.984123,
        116.497512);
  }

  private void upsertMedia(
      String id, String caption, String takenAt, double latitude, double longitude) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", id);
    params.put("caption", caption);
    params.put("takenAt", takenAt);
    params.put("latitude", latitude);
    params.put("longitude", longitude);
    db.update(
        """
        insert into "MediaAsset" (
          id, "ownerId", "tripId", "storageKey", bucket, "originalName",
          "mimeType", bytes, width, height, caption, "takenAt",
          "exifLatitude", "exifLongitude", status
        )
        values (
          :id, 'creator-li', 'trip-beijing-spring-weekend', 'demo/' || :id || '.jpg', 'tripin-media',
          :id || '.jpg', 'image/jpeg', 2400000, 1440, 1080, :caption,
          cast(:takenAt as timestamptz), :latitude, :longitude, cast('READY' as "MediaStatus")
        )
        on conflict (id) do update set
          "tripId" = excluded."tripId",
          caption = excluded.caption,
          "takenAt" = excluded."takenAt",
          "exifLatitude" = excluded."exifLatitude",
          "exifLongitude" = excluded."exifLongitude",
          status = excluded.status,
          "updatedAt" = now()
        """,
        params);
  }

  private void upsertPoints() {
    upsertPoint(
        "point-temple",
        "place-beijing-temple-heaven",
        "Temple of Heaven morning",
        "Start the weekend early with quiet light and a short walk.",
        "2026-04-04T23:00:00Z",
        "2026-04-05T00:30:00Z",
        39.882245,
        116.406605,
        1,
        "media-temple-1");
    upsertPoint(
        "point-qianmen",
        "place-beijing-qianmen",
        "Qianmen walk",
        "Lunch first, then a slower street walk in the old district.",
        "2026-04-05T04:40:00Z",
        "2026-04-05T06:20:00Z",
        39.899051,
        116.397942,
        2,
        "media-qianmen-1");
    upsertPoint(
        "point-shichahai",
        "place-beijing-shichahai",
        "Shichahai at dusk",
        "The lakeside walk is a good way to close the first day.",
        "2026-04-05T09:50:00Z",
        "2026-04-05T11:20:00Z",
        39.948698,
        116.379151,
        3,
        "media-shichahai-1");
    upsertPoint(
        "point-798",
        "place-beijing-798",
        "798 afternoon",
        "Keep the second afternoon open for galleries and street photography.",
        "2026-04-06T06:20:00Z",
        "2026-04-06T09:30:00Z",
        39.984123,
        116.497512,
        4,
        "media-798-1");
  }

  private void upsertPoint(
      String id,
      String placeId,
      String title,
      String note,
      String startedAt,
      String endedAt,
      double latitude,
      double longitude,
      int sequence,
      String mediaId) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("placeId", placeId);
    snapshot.put("title", title);

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", id);
    params.put("placeId", placeId);
    params.put("title", title);
    params.put("note", note);
    params.put("startedAt", startedAt);
    params.put("endedAt", endedAt);
    params.put("latitude", latitude);
    params.put("longitude", longitude);
    params.put("sequence", sequence);
    params.put("addressSnapshot", json.toJson(snapshot));
    db.update(
        """
        insert into "TripPoint" (
          id, "tripId", "placeId", title, note, "startedAt", "endedAt",
          latitude, longitude, sequence, "sourceType", "mediaCount", "addressSnapshot"
        )
        values (
          :id, 'trip-beijing-spring-weekend', :placeId, :title, :note,
          cast(:startedAt as timestamptz), cast(:endedAt as timestamptz),
          :latitude, :longitude, :sequence, cast('MANUAL' as "PointSource"),
          1, cast(:addressSnapshot as jsonb)
        )
        on conflict (id) do update set
          "placeId" = excluded."placeId",
          title = excluded.title,
          note = excluded.note,
          "startedAt" = excluded."startedAt",
          "endedAt" = excluded."endedAt",
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          sequence = excluded.sequence,
          "sourceType" = excluded."sourceType",
          "mediaCount" = excluded."mediaCount",
          "addressSnapshot" = excluded."addressSnapshot",
          "updatedAt" = now()
        """,
        params);

    db.update(
        """
        update "MediaAsset"
        set "tripId" = 'trip-beijing-spring-weekend', "tripPointId" = :pointId, "updatedAt" = now()
        where id = :mediaId
        """,
        Map.of("pointId", id, "mediaId", mediaId));
  }

  private void finalizeTripAndPost() {
    Map<String, Object> routePoint1 = routePoint("point-temple", 1, 39.882245, 116.406605);
    Map<String, Object> routePoint2 = routePoint("point-qianmen", 2, 39.899051, 116.397942);
    Map<String, Object> routePoint3 = routePoint("point-shichahai", 3, 39.948698, 116.379151);
    Map<String, Object> routePoint4 = routePoint("point-798", 4, 39.984123, 116.497512);

    db.update(
        """
        update "Trip"
        set
          "coverMediaId" = 'media-temple-1',
          "pointCount" = 4,
          "mediaCount" = 4,
          "routePreview" = cast(:routePreview as jsonb),
          "startedAt" = cast('2026-04-04T23:00:00Z' as timestamptz),
          "endedAt" = cast('2026-04-06T09:30:00Z' as timestamptz),
          status = cast('PUBLISHED' as "TripStatus"),
          visibility = cast('PUBLIC' as "Visibility"),
          "publishedAt" = cast('2026-04-06T12:00:00Z' as timestamptz),
          "updatedAt" = now()
        where id = 'trip-beijing-spring-weekend'
        """,
        Map.of("routePreview", json.toJson(new Object[] {routePoint1, routePoint2, routePoint3, routePoint4})));

    db.update(
        """
        insert into "Post" (
          id, "tripId", "authorId", title, summary, "cityName", "coverMediaId",
          "pointCount", "mediaCount", status, visibility, "publishedAt"
        )
        values (
          'post-beijing-spring-weekend',
          'trip-beijing-spring-weekend',
          'creator-li',
          'Beijing spring weekend route',
          'Temple of Heaven, Qianmen, Shichahai, and 798 across a relaxed weekend.',
          'Beijing',
          'media-temple-1',
          4,
          4,
          cast('ACTIVE' as "PostStatus"),
          cast('PUBLIC' as "Visibility"),
          cast('2026-04-06T12:00:00Z' as timestamptz)
        )
        on conflict ("tripId") do update set
          title = excluded.title,
          summary = excluded.summary,
          "cityName" = excluded."cityName",
          "coverMediaId" = excluded."coverMediaId",
          "pointCount" = excluded."pointCount",
          "mediaCount" = excluded."mediaCount",
          status = excluded.status,
          visibility = excluded.visibility,
          "publishedAt" = excluded."publishedAt",
          "updatedAt" = now()
        """,
        Map.of());
  }

  private Map<String, Object> routePoint(String pointId, int sequence, double latitude, double longitude) {
    Map<String, Object> point = new LinkedHashMap<>();
    point.put("pointId", pointId);
    point.put("sequence", sequence);
    point.put("latitude", latitude);
    point.put("longitude", longitude);
    return point;
  }

  private void upsertEngagement() {
    db.update(
        """
        insert into "PostLike" (id, "postId", "userId")
        values ('like-demo-1', 'post-beijing-spring-weekend', 'demo-user')
        on conflict ("postId", "userId") do nothing
        """,
        Map.of());
    db.update(
        """
        insert into "PostSave" (id, "postId", "userId")
        values ('save-demo-1', 'post-beijing-spring-weekend', 'demo-user')
        on conflict ("postId", "userId") do nothing
        """,
        Map.of());
    db.update(
        """
        insert into "Comment" (id, "postId", "userId", content)
        values (
          'comment-demo-1',
          'post-beijing-spring-weekend',
          'demo-user',
          'This route layout makes the whole weekend easy to replay.'
        )
        on conflict (id) do update set
          content = excluded.content,
          "updatedAt" = now()
        """,
        Map.of());
  }
}
