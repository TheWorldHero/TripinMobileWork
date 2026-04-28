package com.tripin.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tripin.api.service.LinesService;
import com.tripin.api.web.CurrentUserResolver;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(LinesController.class)
class LinesControllerTest {
  @Autowired private MockMvc mockMvc;

  @MockBean private LinesService linesService;
  @MockBean private CurrentUserResolver currentUserResolver;

  @Test
  void createsLine() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(linesService.createLine(eq("demo-user"), any()))
        .thenReturn(java.util.Map.of("id", "line-1", "pointCount", 0));

    mockMvc
        .perform(
            post("/v1/lines")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"title":"My line","summary":"Route notes","visibility":"PRIVATE"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("line-1"));
  }

  @Test
  void getsLineDetail() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(linesService.getLine("demo-user", "line-1"))
        .thenReturn(java.util.Map.of("id", "line-1", "pointCount", 2));

    mockMvc
        .perform(get("/v1/lines/line-1").header("x-user-id", "demo-user"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pointCount").value(2));
  }

  @Test
  void attachesPointsToLine() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(linesService.attachPoints(eq("demo-user"), eq("line-1"), any()))
        .thenReturn(java.util.Map.of("id", "line-1", "pointCount", 2));

    mockMvc
        .perform(
            post("/v1/lines/line-1/attach-points")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"pointIds":["point-1","point-2"]}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pointCount").value(2));
  }

  @Test
  void reordersPointsOnLine() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(linesService.reorderPoints(eq("demo-user"), eq("line-1"), any()))
        .thenReturn(java.util.Map.of("id", "line-1", "pointCount", 2));

    mockMvc
        .perform(
            post("/v1/lines/line-1/reorder-points")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"pointIds":["point-2","point-1"]}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("line-1"));
  }
}
