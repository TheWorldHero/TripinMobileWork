package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.web.Requests.UpdatePreferenceRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * 用户偏好：通知开关（点赞/评论/关注）+ 首页范围（all/following）+ 语言。
 *
 * <p>无记录时按全部默认返回；{@link #allows} 供通知消费端判断是否生成对应通知。
 */
@Service
public class PreferenceService {
  private final DbSupport db;
  private final UserService userService;

  public PreferenceService(DbSupport db, UserService userService) {
    this.db = db;
    this.userService = userService;
  }

  public Map<String, Object> get(String userId) {
    userService.ensureExists(userId);
    Map<String, Object> row =
        db.first(
            """
            select
              "userId" as user_id,
              "notifyLikes" as notify_likes,
              "notifyComments" as notify_comments,
              "notifyFollows" as notify_follows,
              "feedScope" as feed_scope,
              language
            from "UserPreference"
            where "userId" = :userId
            """,
            Map.of("userId", userId));
    return row == null ? defaults(userId) : toPreference(row);
  }

  /** 通知消费端调用：该用户是否允许某类通知（prefKey = notifyLikes/notifyComments/notifyFollows）。 */
  public boolean allows(String userId, String prefKey) {
    Map<String, Object> row =
        db.first(
            """
            select "notifyLikes" as l, "notifyComments" as c, "notifyFollows" as f
            from "UserPreference"
            where "userId" = :userId
            """,
            Map.of("userId", userId));
    if (row == null) {
      return true; // 默认全部开启
    }
    Object value =
        switch (prefKey) {
          case "notifyLikes" -> row.get("l");
          case "notifyComments" -> row.get("c");
          case "notifyFollows" -> row.get("f");
          default -> Boolean.TRUE;
        };
    return !(value instanceof Boolean bool) || bool;
  }

  public Map<String, Object> update(String userId, UpdatePreferenceRequest request) {
    Map<String, Object> current = get(userId);
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("userId", userId);
    params.put("notifyLikes", pick(request == null ? null : request.notifyLikes(), current.get("notifyLikes")));
    params.put(
        "notifyComments", pick(request == null ? null : request.notifyComments(), current.get("notifyComments")));
    params.put(
        "notifyFollows", pick(request == null ? null : request.notifyFollows(), current.get("notifyFollows")));
    params.put("feedScope", normalizeScope(request == null ? null : request.feedScope(), current.get("feedScope")));
    params.put("language", pickString(request == null ? null : request.language(), current.get("language")));

    db.update(
        """
        insert into "UserPreference"
          ("userId", "notifyLikes", "notifyComments", "notifyFollows", "feedScope", language, "updatedAt")
        values
          (:userId, :notifyLikes, :notifyComments, :notifyFollows, :feedScope, :language, now())
        on conflict ("userId") do update set
          "notifyLikes" = excluded."notifyLikes",
          "notifyComments" = excluded."notifyComments",
          "notifyFollows" = excluded."notifyFollows",
          "feedScope" = excluded."feedScope",
          language = excluded.language,
          "updatedAt" = now()
        """,
        params);
    return get(userId);
  }

  private Object pick(Boolean requested, Object fallback) {
    return requested != null ? requested : fallback;
  }

  private Object pickString(String requested, Object fallback) {
    return requested != null && !requested.isBlank() ? requested : fallback;
  }

  private Object normalizeScope(String requested, Object fallback) {
    if (requested == null || requested.isBlank()) {
      return fallback;
    }
    return "following".equalsIgnoreCase(requested) ? "following" : "all";
  }

  private Map<String, Object> defaults(String userId) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("userId", userId);
    result.put("notifyLikes", true);
    result.put("notifyComments", true);
    result.put("notifyFollows", true);
    result.put("feedScope", "all");
    result.put("language", "zh");
    return result;
  }

  private Map<String, Object> toPreference(Map<String, Object> row) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("userId", row.get("user_id"));
    result.put("notifyLikes", row.get("notify_likes"));
    result.put("notifyComments", row.get("notify_comments"));
    result.put("notifyFollows", row.get("notify_follows"));
    result.put("feedScope", row.get("feed_scope"));
    result.put("language", row.get("language"));
    return result;
  }
}
