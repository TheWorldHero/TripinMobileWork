package com.tripin.api.controller;

import com.tripin.api.service.GeoService;
import com.tripin.api.service.PostsService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/posts")
public class PostsController {
  private final PostsService postsService;
  private final GeoService geoService;
  private final CurrentUserResolver currentUserResolver;

  public PostsController(
      PostsService postsService, GeoService geoService, CurrentUserResolver currentUserResolver) {
    this.postsService = postsService;
    this.geoService = geoService;
    this.currentUserResolver = currentUserResolver;
  }

  /** 附近发现：按坐标返回附近已发布帖子，按距离升序。literal /nearby 优先于 /{postId}。 */
  @GetMapping("/nearby")
  public List<Map<String, Object>> nearby(
      @RequestParam Double lat,
      @RequestParam Double lng,
      @RequestParam(required = false) Double radiusKm,
      @RequestParam(required = false) Integer limit) {
    return geoService.nearby(lat, lng, radiusKm, limit);
  }

  @GetMapping("/{postId}")
  public Map<String, Object> getPost(
      @RequestHeader(value = "x-user-id", required = false) String userId, @PathVariable String postId) {
    return postsService.getPost(currentUserResolver.resolve(userId), postId);
  }

  @DeleteMapping("/{postId}")
  public Map<String, Object> deletePost(
      @RequestHeader(value = "x-user-id", required = false) String userId, @PathVariable String postId) {
    return postsService.deletePost(currentUserResolver.resolve(userId), postId);
  }
}
