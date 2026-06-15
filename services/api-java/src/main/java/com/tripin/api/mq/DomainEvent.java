package com.tripin.api.mq;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 领域事件——通过 Redis Streams 异步投递，消费端据此生成站内通知。
 *
 * <p>字段全部以字符串形式进出 Stream（Redis Stream 的 field-value 即字符串）。
 */
public record DomainEvent(
    String type, String actorId, String targetUserId, String postId, String commentId) {

  public static final String POST_LIKED = "post_liked";
  public static final String POST_COMMENTED = "post_commented";
  public static final String USER_FOLLOWED = "user_followed";

  public Map<String, String> toMap() {
    Map<String, String> map = new LinkedHashMap<>();
    map.put("type", nullToEmpty(type));
    map.put("actorId", nullToEmpty(actorId));
    map.put("targetUserId", nullToEmpty(targetUserId));
    map.put("postId", nullToEmpty(postId));
    map.put("commentId", nullToEmpty(commentId));
    return map;
  }

  public static DomainEvent fromMap(Map<String, String> map) {
    return new DomainEvent(
        blankToNull(map.get("type")),
        blankToNull(map.get("actorId")),
        blankToNull(map.get("targetUserId")),
        blankToNull(map.get("postId")),
        blankToNull(map.get("commentId")));
  }

  public static DomainEvent postLiked(String actorId, String targetUserId, String postId) {
    return new DomainEvent(POST_LIKED, actorId, targetUserId, postId, null);
  }

  public static DomainEvent postCommented(
      String actorId, String targetUserId, String postId, String commentId) {
    return new DomainEvent(POST_COMMENTED, actorId, targetUserId, postId, commentId);
  }

  public static DomainEvent userFollowed(String actorId, String targetUserId) {
    return new DomainEvent(USER_FOLLOWED, actorId, targetUserId, null, null);
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }
}
