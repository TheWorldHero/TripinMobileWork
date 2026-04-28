package com.tripin.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tripin.api.service.RoutesService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(RoutesController.class)
class RoutesControllerTest {
  @Autowired private MockMvc mockMvc;

  @MockBean private RoutesService routesService;
  @MockBean private CurrentUserResolver currentUserResolver;

  @Test
  void refreshesLineRoutes() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(routesService.refreshLineRoutes("demo-user", "line-1"))
        .thenReturn(Map.of("lineId", "line-1", "segmentsUpdated", 2));

    mockMvc
        .perform(post("/v1/routes/lines/line-1/refresh").header("x-user-id", "demo-user"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.segmentsUpdated").value(2));
  }
}
