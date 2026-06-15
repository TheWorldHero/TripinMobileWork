package com.tripin.api.service;

import com.tripin.api.mq.DomainEvent;
import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * 站内通知中心。
 *
 * <p>{@link #handle} 是 MQ 消费端（或同步降级）入口：把点赞/评论/关注事件按收件人偏好落成通知。
 * 其余方法供 REST 查询/标记已读。
 */
@Service
public class NotificationService {
  private final DbSupport db;
  private final JsonSupport json;
  private final PreferenceService preferences;

  public NotificationService(DbSupport db, JsonSupport json, PreferenceService preferences) {
    this.db = db;
    this.json = json;
    this.preferences = preferences;
  }

  // ─────────────────────────── 消费端：事件 → 通知 ───────────────────────────

  public void handle(DomainEvent event) {
    if (event == null || event.type() == null) {
      return;
    }
    switch (event.type()) {
      case DomainEvent.POST_LIKED -> createPostNotification(event, "like", "notifyLikes");
      case DomainEvent.POST_COMMENTED -> createPostNotification(event, "comment", "notifyComments");
      case DomainEvent.USER_FOLLOWED -> createFollowNotification(event);
      default -> {
        // 未知/占位事件（如 __init__）：忽略
      }
    }
  }

  private void createPostNotification(DomainEvent event, String type, String prefKey) {
    String recipient = event.targetUserId();
    if (recipient == null && event.postId() != null) {
      recipient = db.string("select \"authorId\" from \"Post\" where id = :id", Map.of("id", event.postId()));
    }
    if (recipient == null || recipient.equals(event.actorId())) {
      return; // 收件人不存在，或自己操作自己的帖子：不通知
    }
    if (!preferences.allows(recipient, prefKey)) {
      return;
    }
    insert(recipient, type, event.actorId(), event.postId(), event.commentId());
  }

  private void createFollowNotification(DomainEvent event) {
    String recipient = event.targetUserId();
    if (recipient == null || recipient.equals(event.actorId())) {
      return;
    }
    if (!preferences.allows(recipient, "notifyFollows")) {
      return;
    }
    insert(recipient, "follow", event.actorId(), null, null);
  }

  private void insert(String userId, String type, String actorId, String postId, String commentId) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", json.newId("notif"));
    params.put("userId", userId);
    params.put("type", type);
    params.put("actorId", actorId);
    params.put("postId", postId);
    params.put("commentId", commentId);
    db.update(
        """
        insert into "Notification" (id, "userId", type, "actorId", "postId", "commentId")
        values (:id, :userId, :type, :actorId, :postId, :commentId)
        """,
        params);
  }

  // ─────────────────────────── 查询端 ───────────────────────────

  public Map<String, Object> list(String userId, Integer rawLimit, Integer rawOffset) {
    int limit = rawLimit == null ? 30 : Math.max(1, Math.min(100, rawLimit));
    int offset = rawOffset == null ? 0 : Math.max(0, rawOffset);
    List<Map<String, Object>> items =
        db
            .list(
                """
                select
                  n.id,
                  n.type,
                  n."isRead" as is_read,
                  n."postId" as post_id,
                  n."commentId" as comment_id,
                  n."createdAt" as created_at,
                  a.id as actor_id,
                  a.username as actor_username,
                  a."displayName" as actor_display_name,
                  a."avatarUrl" as actor_avatar_url,
                  p.title as post_title
                from "Notification" n
                join "User" a on a.id = n."actorId"
                left join "Post" p on p.id = n."postId"
                where n."userId" = :userId
                order by n."createdAt" desc
                limit :limit offset :offset
                """,
                Map.of("userId", userId, "limit", limit, "offset", offset))
            .stream()
            .map(this::toNotification)
            .toList();

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("items", items);
    result.put("unreadCount", unreadCount(userId));
    return result;
  }

  public int unreadCount(String userId) {
    Integer count =
        db.integer(
            "select count(*) from \"Notification\" where \"userId\" = :userId and \"isRead\" = false",
            Map.of("userId", userId));
    return count == null ? 0 : count;
  }

  public Map<String, Object> markRead(String userId, String id) {
    db.update(
        "update \"Notification\" set \"isRead\" = true where id = :id and \"userId\" = :userId",
        Map.of("id", id, "userId", userId));
    return Map.of("unreadCount", unreadCount(userId));
  }

  public Map<String, Object> markAllRead(String userId) {
    db.update(
        "update \"Notification\" set \"isRead\" = true where \"userId\" = :userId and \"isRead\" = false",
        Map.of("userId", userId));
    return Map.of("unreadCount", 0);
  }

  private Map<String, Object> toNotification(Map<String, Object> row) {
    Map<String, Object> actor = new LinkedHashMap<>();
    actor.put("id", row.get("actor_id"));
    actor.put("username", row.get("actor_username"));
    actor.put("displayName", row.get("actor_display_name"));
    actor.put("avatarUrl", row.get("actor_avatar_url"));

    Map<String, Object> notification = new LinkedHashMap<>();
    notification.put("id", row.get("id"));
    notification.put("type", row.get("type"));
    notification.put("isRead", row.get("is_read"));
    notification.put("createdAt", json.instantValue(row.get("created_at")));
    notification.put("actor", actor);
    if (row.get("post_id") != null) {
      Map<String, Object> post = new LinkedHashMap<>();
      post.put("id", row.get("post_id"));
      post.put("title", row.get("post_title"));
      notification.put("post", post);
    } else {
      notification.put("post", null);
    }
    notification.put("commentId", row.get("comment_id"));
    return notification;
  }
}
