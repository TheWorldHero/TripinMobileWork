package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FeedService {
  private static final Logger log = LoggerFactory.getLogger(FeedService.class);

  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;

  public FeedService(DbSupport db, JsonSupport json, UserService userService) {
    this.db = db;
    this.json = json;
    this.userService = userService;
  }

  public Map<String, Object> getFeed(
      String userId, String cityName, String kind, Integer rawLimit, String cursor) {
    userService.ensureExists(userId);
    int limit = clamp(rawLimit, 20, 1, 50);
    List<Map<String, Object>> rows = loadRankedPosts(userId, cityName, kind, limit, cursor);
    List<Map<String, Object>> items = new ArrayList<>();
    for (int index = 0; index < rows.size(); index++) {
      Map<String, Object> row = rows.get(index);
      items.add(toFeedItem(row, userId));
      try {
        db.update(
            """
            insert into "FeedImpression" (id, "userId", "postId", source, position)
            values (:id, :userId, :postId, :source, :position)
            """,
            Map.of(
                "id", json.newId("impression"),
                "userId", userId,
                "postId", row.get("id"),
                "source", "home_feed",
                "position", index));
      } catch (Exception exception) {
        // Feed rendering should not fail because impression logging failed.
        log.warn(
            "Failed to record feed impression for post {} (user {}): {}",
            row.get("id"),
            userId,
            exception.getMessage());
      }
    }

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("items", items);
    response.put("mode", "ranked");
    response.put("nextCursor", rows.size() == limit ? json.stringValue(rows.getLast().get("id")) : null);
    return response;
  }

  private List<Map<String, Object>> loadRankedPosts(
      String userId, String cityName, String kind, int limit, String cursor) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("userId", userId);
    params.put("limit", limit);

    StringBuilder baseSql =
        new StringBuilder(
            """
            select *
            from (
            select
              p.id,
              p.title,
              p.summary,
              p."cityName" as city_name,
              p."pointCount" as point_count,
              p."mediaCount" as media_count,
              p."publishedAt" as published_at,
              p."coverMediaId" as cover_media_id,
              p."tripId" as trip_id,
              a.id as author_id,
              a.username as author_username,
              a."displayName" as author_display_name,
              a."avatarUrl" as author_avatar_url,
              a.bio as author_bio,
              t.title as trip_title,
              t.kind as trip_kind,
              t."ownerId" as trip_owner_id,
              t."startedAt" as trip_started_at,
              t."endedAt" as trip_ended_at,
              t."routePreview" as trip_route_preview,
              (select count(*) from "PostLike" pl where pl."postId" = p.id) as likes_count,
              (select count(*) from "PostSave" ps where ps."postId" = p.id) as saves_count,
              (select count(*) from "Comment" c where c."postId" = p.id) as comments_count,
              (
                coalesce((select count(*) * 4 from "PostLike" pl where pl."postId" = p.id), 0)
                + coalesce((select count(*) * 6 from "PostSave" ps where ps."postId" = p.id), 0)
                + coalesce((select count(*) * 3 from "Comment" c where c."postId" = p.id), 0)
              ) as engagement_score,
              case when p."cityName" is not null and exists (
                select 1
                from "PostSave" ps2
                join "Post" saved_post on saved_post.id = ps2."postId"
                where ps2."userId" = :userId
                  and saved_post."cityName" = p."cityName"
              ) then 12 else 0 end as city_interest_score,
              case when exists (
                select 1
                from "PostLike" pl2
                join "Post" liked_post on liked_post.id = pl2."postId"
                join "Trip" liked_trip on liked_trip.id = liked_post."tripId"
                where pl2."userId" = :userId
                  and liked_trip.kind = t.kind
              ) then 10 else 0 end as kind_interest_score,
              case when exists (
                select 1
                from "PostSave" ps3
                where ps3."userId" = :userId
                  and ps3."postId" = p.id
              ) then -200 else 0 end as duplicate_penalty,
              case when p."authorId" = :userId then -60 else 0 end as self_penalty,
              case when exists (
                select 1
                from "UserActionEvent" uae
                where uae."userId" = :userId
                  and uae."postId" = p.id
                  and uae."eventType" = 'DETAIL_VIEW'
              ) then -18 else 0 end as repeat_view_penalty
            from "Post" p
            join "User" a on a.id = p."authorId"
            join "Trip" t on t.id = p."tripId"
            where p.status = cast('ACTIVE' as "PostStatus")
              and p.visibility = cast('PUBLIC' as "Visibility")
            """);

    if (!isBlank(cityName)) {
      baseSql.append(" and p.\"cityName\" = :cityName");
      params.put("cityName", cityName);
    }
    if (!isBlank(kind)) {
      baseSql.append(" and t.kind = cast(:kind as \"TripKind\")");
      params.put("kind", kind);
    }
    if (!isBlank(cursor)) {
      Map<String, Object> cursorRow =
          db.first(
              """
              select "publishedAt" as published_at
              from "Post"
              where id = :id
              """,
              Map.of("id", cursor));
      if (cursorRow != null) {
        baseSql.append(
            """
             and (
               p."publishedAt" < :cursorPublishedAt
               or (p."publishedAt" = :cursorPublishedAt and p.id < :cursorId)
             )
            """);
        params.put("cursorPublishedAt", cursorRow.get("published_at"));
        params.put("cursorId", cursor);
      }
    }

    baseSql.append(
        """
            ) ranked
        """);

    StringBuilder sql =
        new StringBuilder(baseSql)
            .append(
        """
         order by
           (
             coalesce(engagement_score, 0)
             + coalesce(city_interest_score, 0)
             + coalesce(kind_interest_score, 0)
             + coalesce(duplicate_penalty, 0)
             + coalesce(self_penalty, 0)
             + coalesce(repeat_view_penalty, 0)
             + greatest(0::numeric, 30 - floor(extract(epoch from (now() - published_at)) / 3600))
           ) desc,
           published_at desc,
           id desc
         limit :limit
        """);
    return db.list(sql.toString(), params);
  }

  private Map<String, Object> toFeedItem(Map<String, Object> row, String viewerUserId) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", row.get("id"));
    item.put("title", row.get("title"));
    item.put("summary", row.get("summary"));
    item.put("cityName", row.get("city_name"));
    item.put("pointCount", json.intValue(row.get("point_count")));
    item.put("mediaCount", json.intValue(row.get("media_count")));
    item.put("publishedAt", json.instantValue(row.get("published_at")));
    item.put("coverMedia", loadMediaById(json.stringValue(row.get("cover_media_id"))));

    Map<String, Object> authorRow = new LinkedHashMap<>();
    authorRow.put("id", row.get("author_id"));
    authorRow.put("username", row.get("author_username"));
    authorRow.put("display_name", row.get("author_display_name"));
    authorRow.put("avatar_url", row.get("author_avatar_url"));
    authorRow.put("bio", row.get("author_bio"));
    item.put("author", userService.toSummary(authorRow));

    Map<String, Object> trip = new LinkedHashMap<>();
    trip.put("id", row.get("trip_id"));
    trip.put("title", row.get("trip_title"));
    trip.put("kind", row.get("trip_kind"));
    trip.put("startedAt", json.instantValue(row.get("trip_started_at")));
    trip.put("endedAt", json.instantValue(row.get("trip_ended_at")));
    trip.put("routePreview", json.parseListOfMaps(row.get("trip_route_preview")));
    item.put("trip", trip);

    Map<String, Object> counts = new LinkedHashMap<>();
    counts.put("likes", json.intValue(row.get("likes_count")));
    counts.put("saves", json.intValue(row.get("saves_count")));
    counts.put("comments", json.intValue(row.get("comments_count")));
    item.put("_count", counts);

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
    item.put("viewerState", viewerState);
    return item;
  }

  private Map<String, Object> loadMediaById(String mediaId) {
    if (mediaId == null || mediaId.isBlank()) {
      return null;
    }

    return db.first(
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
        Map.of("id", mediaId));
  }

  private int clamp(Integer value, int defaultValue, int min, int max) {
    if (value == null) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, value));
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
