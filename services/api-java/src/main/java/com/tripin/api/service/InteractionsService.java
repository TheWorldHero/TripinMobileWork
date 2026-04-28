package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.web.Requests.CreateCommentRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InteractionsService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;

  public InteractionsService(DbSupport db, JsonSupport json, UserService userService) {
    this.db = db;
    this.json = json;
    this.userService = userService;
  }

  public Map<String, Object> likePost(String userId, String postId) {
    ensurePostAndUser(userId, postId);
    db.update(
        """
        insert into "PostLike" (id, "postId", "userId")
        values (:id, :postId, :userId)
        on conflict ("postId", "userId") do nothing
        """,
        Map.of("id", json.newId("like"), "postId", postId, "userId", userId));
    logEvent(userId, postId, "post_liked", null);
    return getPostInteractionState(postId, userId);
  }

  public Map<String, Object> unlikePost(String userId, String postId) {
    ensurePostAndUser(userId, postId);
    db.update(
        "delete from \"PostLike\" where \"postId\" = :postId and \"userId\" = :userId",
        Map.of("postId", postId, "userId", userId));
    return getPostInteractionState(postId, userId);
  }

  public Map<String, Object> savePost(String userId, String postId) {
    ensurePostAndUser(userId, postId);
    db.update(
        """
        insert into "PostSave" (id, "postId", "userId")
        values (:id, :postId, :userId)
        on conflict ("postId", "userId") do nothing
        """,
        Map.of("id", json.newId("save"), "postId", postId, "userId", userId));
    logEvent(userId, postId, "post_saved", null);
    return getPostInteractionState(postId, userId);
  }

  public Map<String, Object> unsavePost(String userId, String postId) {
    ensurePostAndUser(userId, postId);
    db.update(
        "delete from \"PostSave\" where \"postId\" = :postId and \"userId\" = :userId",
        Map.of("postId", postId, "userId", userId));
    return getPostInteractionState(postId, userId);
  }

  public Map<String, Object> createComment(String userId, String postId, CreateCommentRequest request) {
    ensurePostAndUser(userId, postId);
    if (request == null || request.content() == null || request.content().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
    }

    String commentId = json.newId("comment");
    db.update(
        """
        insert into "Comment" (id, "postId", "userId", content)
        values (:id, :postId, :userId, :content)
        """,
        Map.of("id", commentId, "postId", postId, "userId", userId, "content", request.content()));

    Map<String, Object> user = userService.findRequired(userId);
    Map<String, Object> comment =
        db.first(
            """
            select id, content, "createdAt" as created_at
            from "Comment"
            where id = :id
            """,
            Map.of("id", commentId));

    logEvent(userId, postId, "post_commented", Map.of("contentLength", request.content().length()));

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", comment.get("id"));
    result.put("content", comment.get("content"));
    result.put("createdAt", json.instantValue(comment.get("created_at")));
    result.put("user", userService.toSummary(user));
    return result;
  }

  public List<Map<String, Object>> listComments(String postId) {
    ensurePostExists(postId);
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

  private Map<String, Object> ensurePostAndUser(String userId, String postId) {
    userService.ensureExists(userId);
    return ensurePostExists(postId);
  }

  private Map<String, Object> ensurePostExists(String postId) {
    Map<String, Object> post = db.first("select id from \"Post\" where id = :id", Map.of("id", postId));
    if (post == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
    }
    return post;
  }

  private Map<String, Object> getPostInteractionState(String postId, String userId) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("postId", postId);

    Map<String, Object> counts = new LinkedHashMap<>();
    counts.put(
        "likes",
        db.integer("select count(*) from \"PostLike\" where \"postId\" = :postId", Map.of("postId", postId)));
    counts.put(
        "saves",
        db.integer("select count(*) from \"PostSave\" where \"postId\" = :postId", Map.of("postId", postId)));
    counts.put(
        "comments",
        db.integer("select count(*) from \"Comment\" where \"postId\" = :postId", Map.of("postId", postId)));
    response.put("counts", counts);

    Map<String, Object> viewerState = new LinkedHashMap<>();
    viewerState.put(
        "liked",
        db.first(
                "select id from \"PostLike\" where \"postId\" = :postId and \"userId\" = :userId",
                Map.of("postId", postId, "userId", userId))
            != null);
    viewerState.put(
        "saved",
        db.first(
                "select id from \"PostSave\" where \"postId\" = :postId and \"userId\" = :userId",
                Map.of("postId", postId, "userId", userId))
            != null);
    response.put("viewerState", viewerState);
    return response;
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

  private void logEvent(String userId, String postId, String eventType, Map<String, Object> payload) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", json.newId("event"));
    params.put("userId", userId);
    params.put("postId", postId);
    params.put("eventType", eventType);
    params.put("payload", payload == null ? null : json.toJson(payload));
    db.update(
        """
        insert into "UserActionEvent" (id, "userId", "postId", "eventType", payload)
        values (:id, :userId, :postId, :eventType, cast(:payload as jsonb))
        """,
        params);
  }
}
