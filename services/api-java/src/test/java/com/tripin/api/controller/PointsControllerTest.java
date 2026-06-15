package com.tripin.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tripin.api.service.PointsService;
import com.tripin.api.web.CurrentUserResolver;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PointsController.class)
class PointsControllerTest {
  @Autowired private MockMvc mockMvc;

  @MockBean private PointsService pointsService;
  @MockBean private CurrentUserResolver currentUserResolver;

  @Test
  void createsDraftPointFromMedia() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(pointsService.createDraftPoint(eq("demo-user"), any()))
        .thenReturn(java.util.Map.of("id", "point-1", "state", "NEEDS_LOCATION"));

    mockMvc
        .perform(
            post("/v1/points")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"mediaAssetIds":["media-1"],"capturedAt":"2026-04-17T10:00:00Z"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.state").value("NEEDS_LOCATION"));
  }

  @Test
  void confirmsPointLocationIntoReadyForLine() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(pointsService.confirmLocation(eq("demo-user"), eq("point-1"), any()))
        .thenReturn(java.util.Map.of("id", "point-1", "state", "READY_FOR_LINE"));

    mockMvc
        .perform(
            patch("/v1/points/point-1/location")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"placeId":"place-1","latitude":31.2304,"longitude":121.4737,"checkInAt":"2026-04-17T10:10:00Z"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.state").value("READY_FOR_LINE"));
  }

  @Test
  void loadsInboxForCurrentUser() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    java.util.Map<String, Object> inbox = new java.util.LinkedHashMap<>();
    inbox.put("items", java.util.List.of());
    inbox.put("nextCursor", null);
    when(pointsService.getInbox(eq("demo-user"), any())).thenReturn(inbox);

    mockMvc
        .perform(get("/v1/points/inbox").header("x-user-id", "demo-user"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isArray());
  }
}
