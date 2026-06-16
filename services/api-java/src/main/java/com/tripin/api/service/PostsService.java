package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PostsService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final TripsService tripsService;
  private final CacheService cacheService;
  private final TransactionTemplate transactionTemplate;

  public PostsService(
      DbSupport db,
      JsonSupport json,
      UserService userService,
      TripsService tripsService,
      CacheService cacheService,
      TransactionTemplate transactionTemplate) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.tripsService = tripsService;
    this.cacheService = cacheService;
    this.transactionTemplate = transactionTemplate;
  }

  public Map<String, Object> getPost(String viewerUserId, String postId) {
    userService.ensureExists(viewerUserId);

    // 帖子详情的"可共享"部分走 Redis 缓存（Cache-Aside + 三防）；不存在时缓存空值占位。
    Map<String, Object> result =
        cacheService.getPostDetail(postId, () -> loadSharedPostDetail(postId));
    if (result == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
    }

    // 浏览者相关状态（是否点赞/收藏）按用户变化，不进缓存，每次实时查。
    Map<String, Object> viewerState = new LinkedHashMap<>();
    viewerState.put(
        "liked",
        db.first(
                "select id from \"PostLike\" where \"postId\" = :postId and \"userId\" = :userId",
                Map.of("postId", postId, "userId", viewerUserId))
            != null);
    viewerState.put(
        "saved",
        db.first(
                "select id from \"PostSave\" where \"postId\" = :postId and \"userId\" = :userId",
                Map.of("postId", postId, "userId", viewerUserId))
            != null);
    result.put("viewerState", viewerState);
    return result;
  }

  /** 帖子详情的可共享部分（与浏览者无关，可缓存）。不存在返回 null（由缓存层落空值占位防穿透）。 */
  private Map<String, Object> loadSharedPostDetail(String postId) {
    Map<String, Object> row =
        db.first(
            """
            select
              p.id,
              p.title,
              p.summary,
              p."cityName" as city_name,
              p."publishedAt" as published_at,
              p."pointCount" as point_count,
              p."mediaCount" as media_count,
              p."tripId" as trip_id,
              a.id as author_id,
              a.username as author_username,
              a."displayName" as author_display_name,
              a."avatarUrl" as author_avatar_url,
              a.bio as author_bio,
              (select count(*) from "PostLike" pl where pl."postId" = p.id) as likes_count,
              (select count(*) from "PostSave" ps where ps."postId" = p.id) as saves_count,
              (select count(*) from "Comment" c where c."postId" = p.id) as comments_count
            from "Post" p
            join "User" a on a.id = p."authorId"
            where p.id = :id
              and p.status = cast('ACTIVE' as "PostStatus")
              and p.visibility in (cast('PUBLIC' as "Visibility"), cast('UNLISTED' as "Visibility"))
            """,
            Map.of("id", postId));

    if (row == null) {
      return null;
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", row.get("id"));
    result.put("title", row.get("title"));
    result.put("summary", row.get("summary"));
    result.put("cityName", row.get("city_name"));
    result.put("publishedAt", json.instantValue(row.get("published_at")));
    result.put("pointCount", json.intValue(row.get("point_count")));
    result.put("mediaCount", json.intValue(row.get("media_count")));

    Map<String, Object> authorRow = new LinkedHashMap<>();
    authorRow.put("id", row.get("author_id"));
    authorRow.put("username", row.get("author_username"));
    authorRow.put("display_name", row.get("author_display_name"));
    authorRow.put("avatar_url", row.get("author_avatar_url"));
    authorRow.put("bio", row.get("author_bio"));
    result.put("author", userService.toSummary(authorRow));

    result.put("trip", tripsService.loadTripView(json.stringValue(row.get("trip_id"))));
    result.put("comments", loadComments(postId));

    Map<String, Object> counts = new LinkedHashMap<>();
    counts.put("likes", json.intValue(row.get("likes_count")));
    counts.put("saves", json.intValue(row.get("saves_count")));
    counts.put("comments", json.intValue(row.get("comments_count")));
    result.put("counts", counts);
    return result;
  }

  public Map<String, Object> deletePost(String userId, String postId) {
    userService.ensureExists(userId);
    Map<String, Object> row =
        db.first(
            "select id, \"authorId\" as author_id, \"tripId\" as trip_id from \"Post\" where id = :id",
            Map.of("id", postId));
    if (row == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
    }
    if (!userId.equals(json.stringValue(row.get("author_id")))) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can delete this post");
    }

    String tripId = json.stringValue(row.get("trip_id"));
    transactionTemplate.executeWithoutResult(
        status -> {
          // Likes, saves, comments and impressions cascade with the post row.
          db.update("delete from \"Post\" where id = :id", Map.of("id", postId));
          // The backing trip is kept (archived) so its points/media remain editable as a draft.
          db.update(
              """
              update "Trip"
              set status = cast('ARCHIVED' as "TripStatus"), "updatedAt" = now()
              where id = :id
              """,
              Map.of("id", tripId));
        });

    cacheService.evictPostDetail(postId);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("ok", true);
    result.put("postId", postId);
    result.put("tripId", tripId);
    return result;
  }

  private List<Map<String, Object>> loadComments(String postId) {
    return db.list(
            """
            select
              c.id,
              c.content,
              c."createdAt" as created_at,
              u.id as user_id,
              u.username as user_username,
              u."displayName" as user_display_name,
              u."avatarUrl" as user_avatar_url,
              u.bio as user_bio
            from "Comment" c
            join "User" u on u.id = c."userId"
            where c."postId" = :postId
            order by c."createdAt" asc
            """,
            Map.of("postId", postId))
        .stream()
        .map(this::toComment)
        .toList();
  }

  private Map<String, Object> toComment(Map<String, Object> row) {
    Map<String, Object> userRow = new LinkedHashMap<>();
    userRow.put("id", row.get("user_id"));
    userRow.put("username", row.get("user_username"));
    userRow.put("display_name", row.get("user_display_name"));
    userRow.put("avatar_url", row.get("user_avatar_url"));
    userRow.put("bio", row.get("user_bio"));

    Map<String, Object> comment = new LinkedHashMap<>();
    comment.put("id", row.get("id"));
    comment.put("content", row.get("content"));
    comment.put("createdAt", json.instantValue(row.get("created_at")));
    comment.put("user", userService.toSummary(userRow));
    return comment;
  }
}
