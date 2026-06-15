package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.web.Requests.CreateUserRequest;
import com.tripin.api.web.Requests.UpdateUserRequest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
  private final DbSupport db;
  private final JsonSupport json;

  public UserService(DbSupport db, JsonSupport json) {
    this.db = db;
    this.json = json;
  }

  public Map<String, Object> create(CreateUserRequest request) {
    if (request == null || isBlank(request.id()) || isBlank(request.displayName())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id and displayName are required");
    }

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", request.id());
    params.put("username", request.username());
    params.put("displayName", request.displayName());
    params.put("avatarUrl", request.avatarUrl());
    params.put("bio", request.bio());

    db.update(
        """
        insert into "User" (id, username, "displayName", "avatarUrl", bio, status)
        values (:id, :username, :displayName, :avatarUrl, :bio, 'ACTIVE')
        on conflict (id) do update set
          username = excluded.username,
          "displayName" = excluded."displayName",
          "avatarUrl" = excluded."avatarUrl",
          bio = excluded.bio,
          "updatedAt" = now()
        """,
        params);

    return findRequired(request.id());
  }

  public Map<String, Object> ensureExists(String userId) {
    Map<String, Object> existing = find(userId);
    if (existing != null) {
      return existing;
    }

    db.update(
        """
        insert into "User" (id, "displayName", status)
        values (:id, :displayName, 'ACTIVE')
        on conflict (id) do nothing
        """,
        Map.of("id", userId, "displayName", "demo-user".equals(userId) ? "Demo User" : userId));

    return findRequired(userId);
  }

  public Map<String, Object> update(String currentUserId, String targetUserId, UpdateUserRequest request) {
    if (!currentUserId.equals(targetUserId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot edit another user");
    }

    Map<String, Object> existing = ensureExists(targetUserId);
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", targetUserId);
    params.put("username", request == null || isBlank(request.username()) ? existing.get("username") : request.username());
    params.put(
        "displayName",
        request == null || isBlank(request.displayName())
            ? existing.get("displayName")
            : request.displayName());
    params.put("avatarUrl", request == null ? existing.get("avatarUrl") : coalesce(request.avatarUrl(), existing.get("avatarUrl")));
    params.put("bio", request == null ? existing.get("bio") : coalesce(request.bio(), existing.get("bio")));

    db.update(
        """
        update "User"
        set
          username = :username,
          "displayName" = :displayName,
          "avatarUrl" = :avatarUrl,
          bio = :bio,
          "updatedAt" = now()
        where id = :id
        """,
        params);

    return findRequired(targetUserId);
  }

  public List<Map<String, Object>> listPublishedPosts(String userId, Integer rawLimit, Integer rawOffset) {
    ensureExists(userId);
    int limit = clampPageSize(rawLimit);
    int offset = rawOffset == null ? 0 : Math.max(0, rawOffset);
    return db.list(
            """
            select
              p.id,
              p.title,
              p.summary,
              p."cityName" as city_name,
              p."pointCount" as point_count,
              p."mediaCount" as media_count,
              p."publishedAt" as published_at,
              p."coverMediaId" as cover_media_id,
              u.id as author_id,
              u.username as author_username,
              u."displayName" as author_display_name,
              u."avatarUrl" as author_avatar_url,
              u.bio as author_bio,
              t.id as trip_id,
              t.title as trip_title,
              t.kind as trip_kind,
              t."startedAt" as trip_started_at,
              t."endedAt" as trip_ended_at,
              t."routePreview" as trip_route_preview,
              (select count(*) from "PostLike" pl where pl."postId" = p.id) as likes_count,
              (select count(*) from "PostSave" ps where ps."postId" = p.id) as saves_count,
              (select count(*) from "Comment" c where c."postId" = p.id) as comments_count
            from "Post" p
            join "User" u on u.id = p."authorId"
            join "Trip" t on t.id = p."tripId"
            where p."authorId" = :userId
              and p.status = cast('ACTIVE' as "PostStatus")
              and p.visibility = cast('PUBLIC' as "Visibility")
            order by p."publishedAt" desc
            limit :limit offset :offset
            """,
            Map.of("userId", userId, "limit", limit, "offset", offset))
        .stream()
        .map(row -> toPostCard(row, userId))
        .toList();
  }

  public List<Map<String, Object>> listSavedPosts(String userId, Integer rawLimit, Integer rawOffset) {
    ensureExists(userId);
    int limit = clampPageSize(rawLimit);
    int offset = rawOffset == null ? 0 : Math.max(0, rawOffset);
    return db.list(
            """
            select
              p.id,
              p.title,
              p.summary,
              p."cityName" as city_name,
              p."pointCount" as point_count,
              p."mediaCount" as media_count,
              p."publishedAt" as published_at,
              p."coverMediaId" as cover_media_id,
              u.id as author_id,
              u.username as author_username,
              u."displayName" as author_display_name,
              u."avatarUrl" as author_avatar_url,
              u.bio as author_bio,
              t.id as trip_id,
              t.title as trip_title,
              t.kind as trip_kind,
              t."startedAt" as trip_started_at,
              t."endedAt" as trip_ended_at,
              t."routePreview" as trip_route_preview,
              (select count(*) from "PostLike" pl where pl."postId" = p.id) as likes_count,
              (select count(*) from "PostSave" ps where ps."postId" = p.id) as saves_count,
              (select count(*) from "Comment" c where c."postId" = p.id) as comments_count
            from "PostSave" s
            join "Post" p on p.id = s."postId"
            join "User" u on u.id = p."authorId"
            join "Trip" t on t.id = p."tripId"
            where s."userId" = :userId
              and p.status = cast('ACTIVE' as "PostStatus")
              and p.visibility = cast('PUBLIC' as "Visibility")
            order by s."createdAt" desc
            limit :limit offset :offset
            """,
            Map.of("userId", userId, "limit", limit, "offset", offset))
        .stream()
        .map(row -> toPostCard(row, userId))
        .toList();
  }

  private int clampPageSize(Integer value) {
    if (value == null) {
      return 50;
    }
    return Math.max(1, Math.min(100, value));
  }

  public Map<String, Object> findRequired(String userId) {
    Map<String, Object> user = find(userId);
    if (user == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    }
    return user;
  }

  public Map<String, Object> toSummary(Map<String, Object> row) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", row.get("id"));
    result.put("email", row.get("email"));
    result.put("username", row.get("username"));
    result.put("displayName", row.containsKey("display_name") ? row.get("display_name") : row.get("displayName"));
    result.put("avatarUrl", row.containsKey("avatar_url") ? row.get("avatar_url") : row.get("avatarUrl"));
    result.put("bio", row.get("bio"));
    return result;
  }

  private Map<String, Object> find(String userId) {
    Map<String, Object> row =
        db.first(
            """
            select
              id,
              email,
              username,
              "displayName" as display_name,
              "avatarUrl" as avatar_url,
              bio,
              status,
              "createdAt" as created_at,
              "updatedAt" as updated_at
            from "User"
            where id = :id
            """,
            Map.of("id", userId));

    if (row == null) {
      return null;
    }

    Map<String, Object> result = toSummary(row);
    result.put("status", row.get("status"));
    result.put("createdAt", instantOrNow(row.get("created_at")));
    result.put("updatedAt", instantOrNow(row.get("updated_at")));
    return result;
  }

  private Map<String, Object> toPostCard(Map<String, Object> row, String viewerUserId) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", row.get("id"));
    result.put("title", row.get("title"));
    result.put("summary", row.get("summary"));
    result.put("cityName", row.get("city_name"));
    result.put("pointCount", row.get("point_count"));
    result.put("mediaCount", row.get("media_count"));
    result.put("publishedAt", instantOrNow(row.get("published_at")));

    Map<String, Object> authorRow = new LinkedHashMap<>();
    authorRow.put("id", row.get("author_id"));
    authorRow.put("email", null);
    authorRow.put("username", row.get("author_username"));
    authorRow.put("display_name", row.get("author_display_name"));
    authorRow.put("avatar_url", row.get("author_avatar_url"));
    authorRow.put("bio", row.get("author_bio"));
    result.put("author", toSummary(authorRow));

    Map<String, Object> trip = new LinkedHashMap<>();
    trip.put("id", row.get("trip_id"));
    trip.put("title", row.get("trip_title"));
    trip.put("kind", row.get("trip_kind"));
    trip.put("startedAt", json.instantValue(row.get("trip_started_at")));
    trip.put("endedAt", json.instantValue(row.get("trip_ended_at")));
    trip.put("routePreview", json.parseListOfMaps(row.get("trip_route_preview")));
    result.put("trip", trip);

    if (row.get("cover_media_id") != null) {
      Map<String, Object> cover = db.first(
          """
          select
            id,
            "originalName" as "originalName",
            caption,
            "takenAt" as "takenAt",
            "storageKey" as "storageKey",
            bucket,
            status,
            "mimeType" as "mimeType",
            width,
            height,
            "exifLatitude" as "exifLatitude",
            "exifLongitude" as "exifLongitude"
          from "MediaAsset"
          where id = :id
          """,
          Map.of("id", row.get("cover_media_id")));
      result.put("coverMedia", cover);
    } else {
      result.put("coverMedia", null);
    }

    Map<String, Object> counts = new LinkedHashMap<>();
    counts.put("likes", row.get("likes_count"));
    counts.put("saves", row.get("saves_count"));
    counts.put("comments", row.get("comments_count"));
    result.put("_count", counts);

    Map<String, Object> viewerState = new LinkedHashMap<>();
    viewerState.put(
        "liked",
        db.first(
                "select id from \"PostLike\" where \"postId\" = :postId and \"userId\" = :userId",
                Map.of("postId", row.get("id"), "userId", viewerUserId))
            != null);
    viewerState.put(
        "saved",
        db.first(
                "select id from \"PostSave\" where \"postId\" = :postId and \"userId\" = :userId",
                Map.of("postId", row.get("id"), "userId", viewerUserId))
            != null);
    result.put("viewerState", viewerState);

    return result;
  }

  private Instant instantOrNow(Object value) {
    Instant instant = json.instantValue(value);
    return instant == null ? Instant.now() : instant;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private Object coalesce(Object preferred, Object fallback) {
    return preferred != null ? preferred : fallback;
  }
}
