package com.tripin.api.service;

import com.tripin.api.mq.DomainEvent;
import com.tripin.api.mq.EventPublisher;
import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * 关注关系：关注/取关 + 状态与计数。关注成功（新建）时发 user_followed 事件触发站内通知。
 */
@Service
public class FollowService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final EventPublisher events;

  public FollowService(DbSupport db, JsonSupport json, UserService userService, EventPublisher events) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.events = events;
  }

  public Map<String, Object> follow(String followerId, String followeeId) {
    if (followerId.equals(followeeId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot follow yourself");
    }
    userService.ensureExists(followerId);
    userService.findRequired(followeeId);

    int inserted =
        db.update(
            """
            insert into "UserFollow" (id, "followerId", "followeeId")
            values (:id, :follower, :followee)
            on conflict ("followerId", "followeeId") do nothing
            """,
            Map.of("id", json.newId("follow"), "follower", followerId, "followee", followeeId));
    if (inserted > 0) {
      events.publish(DomainEvent.userFollowed(followerId, followeeId));
    }
    return status(followerId, followeeId);
  }

  public Map<String, Object> unfollow(String followerId, String followeeId) {
    db.update(
        "delete from \"UserFollow\" where \"followerId\" = :follower and \"followeeId\" = :followee",
        Map.of("follower", followerId, "followee", followeeId));
    return status(followerId, followeeId);
  }

  public Map<String, Object> status(String viewerId, String targetId) {
    boolean following =
        viewerId != null
            && !viewerId.equals(targetId)
            && db.first(
                    "select id from \"UserFollow\" where \"followerId\" = :v and \"followeeId\" = :t",
                    Map.of("v", viewerId, "t", targetId))
                != null;

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("userId", targetId);
    result.put("following", following);
    result.put("followersCount", countFollowers(targetId));
    result.put("followingCount", countFollowing(targetId));
    return result;
  }

  private int countFollowers(String userId) {
    Integer count =
        db.integer(
            "select count(*) from \"UserFollow\" where \"followeeId\" = :id", Map.of("id", userId));
    return count == null ? 0 : count;
  }

  private int countFollowing(String userId) {
    Integer count =
        db.integer(
            "select count(*) from \"UserFollow\" where \"followerId\" = :id", Map.of("id", userId));
    return count == null ? 0 : count;
  }
}
