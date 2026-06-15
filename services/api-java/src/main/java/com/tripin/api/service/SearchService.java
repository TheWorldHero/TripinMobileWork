package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * 统一搜索：帖子（标题/简介/城市）、用户（用户名/昵称）、地点（复用高德 {@link PlacesService}）。
 *
 * <p>type = all | posts | users | places。帖子/用户走 Postgres ILIKE；地点走高德 Web 服务。
 */
@Service
public class SearchService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final PlacesService placesService;

  public SearchService(
      DbSupport db, JsonSupport json, UserService userService, PlacesService placesService) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.placesService = placesService;
  }

  public Map<String, Object> search(String rawQuery, String type, Integer rawLimit) {
    String query = rawQuery == null ? "" : rawQuery.trim();
    int limit = rawLimit == null ? 20 : Math.max(1, Math.min(50, rawLimit));
    String mode = type == null || type.isBlank() ? "all" : type.toLowerCase();

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("query", query);
    result.put("posts", wantsPosts(mode) ? searchPosts(query, limit) : List.of());
    result.put("users", wantsUsers(mode) ? searchUsers(query, limit) : List.of());
    result.put("places", wantsPlaces(mode) ? searchPlaces(query, limit) : List.of());
    return result;
  }

  private boolean wantsPosts(String mode) {
    return mode.equals("all") || mode.equals("posts");
  }

  private boolean wantsUsers(String mode) {
    return mode.equals("all") || mode.equals("users");
  }

  private boolean wantsPlaces(String mode) {
    return mode.equals("all") || mode.equals("places");
  }

  private List<Map<String, Object>> searchPosts(String query, int limit) {
    if (query.isEmpty()) {
      return List.of();
    }
    String like = "%" + query + "%";
    return db
        .list(
            """
            select
              p.id,
              p.title,
              p.summary,
              p."cityName" as city_name,
              p."pointCount" as point_count,
              p."mediaCount" as media_count,
              p."coverMediaId" as cover_media_id,
              p."publishedAt" as published_at,
              u.id as author_id,
              u.username as author_username,
              u."displayName" as author_display_name,
              u."avatarUrl" as author_avatar_url
            from "Post" p
            join "User" u on u.id = p."authorId"
            where p.status = cast('ACTIVE' as "PostStatus")
              and p.visibility = cast('PUBLIC' as "Visibility")
              and (p.title ilike :like or p.summary ilike :like or p."cityName" ilike :like)
            order by p."publishedAt" desc
            limit :limit
            """,
            Map.of("like", like, "limit", limit))
        .stream()
        .map(this::toPostResult)
        .toList();
  }

  private List<Map<String, Object>> searchUsers(String query, int limit) {
    if (query.isEmpty()) {
      return List.of();
    }
    String like = "%" + query + "%";
    return db
        .list(
            """
            select
              u.id,
              u.username,
              u."displayName" as display_name,
              u."avatarUrl" as avatar_url,
              u.bio,
              (select count(*) from "UserFollow" f where f."followeeId" = u.id) as followers_count,
              (select count(*) from "Post" p
                 where p."authorId" = u.id
                   and p.status = cast('ACTIVE' as "PostStatus")
                   and p.visibility = cast('PUBLIC' as "Visibility")) as posts_count
            from "User" u
            where u.username ilike :like or u."displayName" ilike :like
            order by followers_count desc, u."createdAt" desc
            limit :limit
            """,
            Map.of("like", like, "limit", limit))
        .stream()
        .map(this::toUserResult)
        .toList();
  }

  private List<Map<String, Object>> searchPlaces(String query, int limit) {
    if (query.isEmpty()) {
      return List.of();
    }
    try {
      return placesService.search(query, null, null, null, null, limit);
    } catch (Exception exception) {
      // 高德未配置或不可达：地点结果为空，不影响帖子/用户搜索
      return List.of();
    }
  }

  private Map<String, Object> toPostResult(Map<String, Object> row) {
    Map<String, Object> author = new LinkedHashMap<>();
    author.put("id", row.get("author_id"));
    author.put("username", row.get("author_username"));
    author.put("displayName", row.get("author_display_name"));
    author.put("avatarUrl", row.get("author_avatar_url"));

    Map<String, Object> post = new LinkedHashMap<>();
    post.put("id", row.get("id"));
    post.put("title", row.get("title"));
    post.put("summary", row.get("summary"));
    post.put("cityName", row.get("city_name"));
    post.put("pointCount", row.get("point_count"));
    post.put("mediaCount", row.get("media_count"));
    post.put("publishedAt", json.instantValue(row.get("published_at")));
    post.put("author", author);

    if (row.get("cover_media_id") != null) {
      Map<String, Object> cover =
          db.first(
              """
              select id, "originalName" as "originalName", caption, "storageKey" as "storageKey",
                     bucket, status, "mimeType" as "mimeType", width, height
              from "MediaAsset"
              where id = :id
              """,
              Map.of("id", row.get("cover_media_id")));
      post.put("coverMedia", cover);
    } else {
      post.put("coverMedia", null);
    }
    return post;
  }

  private Map<String, Object> toUserResult(Map<String, Object> row) {
    Map<String, Object> user = userService.toSummary(row);
    user.put("followersCount", row.get("followers_count"));
    user.put("postsCount", row.get("posts_count"));
    return user;
  }
}
