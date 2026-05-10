package com.tripin.api.service;

import com.tripin.api.cache.PostCacheService;
import com.tripin.api.cache.RedisBloomFilter;
import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PostsService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final TripsService tripsService;
  private final RedisBloomFilter postBloomFilter;
  private final PostCacheService postCache;

  public PostsService(
      DbSupport db,
      JsonSupport json,
      UserService userService,
      TripsService tripsService,
      RedisBloomFilter postBloomFilter,
      PostCacheService postCache) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.tripsService = tripsService;
    this.postBloomFilter = postBloomFilter;
    this.postCache = postCache;
  }

  public Map<String, Object> getPost(String viewerUserId, String postId) {
    userService.ensureExists(viewerUserId);

    if (!postBloomFilter.mightContain(postId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
    }

    Map<String, Object> core = postCache.get(postId);
    if (core == null) {
      core = loadPostCore(postId);
      postCache.put(postId, core);
    }
    postCache.recordAccess(postId);

    Map<String, Object> result = new LinkedHashMap<>(core);
    result.put("viewerState", loadViewerState(postId, viewerUserId));
    return result;
  }

  private Map<String, Object> loadPostCore(String postId) {
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
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
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

  private Map<String, Object> loadViewerState(String postId, String viewerUserId) {
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
    return viewerState;
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
