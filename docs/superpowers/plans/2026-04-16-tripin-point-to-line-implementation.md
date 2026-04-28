# TripIn Point-To-Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a point-first TripIn workflow where users create standalone image-backed points, organize them through an inbox of candidate lines, and complete editable lines in the existing Spring Boot API and Expo mobile app.

**Architecture:** Keep `Trip` as the persisted line object and make `TripPoint` capable of existing outside a line by allowing `tripId` and `startedAt` to be nullable. Add a new `PointsService` + `PointsController` for standalone point CRUD and inbox read models, generate candidate lines on read with a pure grouping helper, and keep publish/feed behavior as a later step on top of completed lines. On the client, replace the trip-first creator flow with `Home`, `Inbox`, and `LineEditor` screens driven by new `Point`, `CandidateLine`, and `InboxResponse` types.

**Tech Stack:** Spring Boot 3.3 + JDBC + PostgreSQL, Expo React Native 0.81 + TypeScript 5.9, Vitest for pure frontend state helpers, JUnit 5 / MockMvc for Java tests.

---

## Pre-Flight Notes

- The active backend is `services/api-java`. The NestJS service under `services/api` remains a schema reference and should stay in sync for future tooling.
- `d:\tripin` is currently not a Git repository. Every commit step below includes a PowerShell fallback that writes a checkpoint line when `.git` is missing.
- The current mobile entrypoint is `apps/mobile/index.ts`, which registers `src/app/AppRoot.tsx`. Ignore the older `apps/mobile/App.tsx` and `src/screens/*` copies.

## File Map

### Backend schema and rules

- Create: `services/api-java/src/main/resources/schema.sql`
- Create: `services/api-java/src/main/java/com/tripin/api/support/PointStateSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/CandidateLineSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/TripCompletionSupport.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/PointStateSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/CandidateLineSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/TripCompletionSupportTest.java`
- Modify: `services/api-java/src/main/resources/application.properties`
- Modify: `services/api/prisma/schema.prisma`
- Modify: `services/api/prisma/manual-init.sql`

### Backend API surface

- Create: `services/api-java/src/main/java/com/tripin/api/controller/PointsController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/PointsService.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/PointsControllerTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/TripsControllerTest.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/web/Requests.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/controller/TripsController.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/TripsService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/DevSupportService.java`
- Modify: `README.md`

### Mobile domain and screens

- Create: `apps/mobile/vitest.config.ts`
- Create: `apps/mobile/src/app/point-drafts.ts`
- Create: `apps/mobile/src/app/inbox-selectors.ts`
- Create: `apps/mobile/src/app/inbox-selectors.test.ts`
- Create: `apps/mobile/src/app/line-editor-state.ts`
- Create: `apps/mobile/src/app/line-editor-state.test.ts`
- Create: `apps/mobile/src/app/mobile-screens/HomeScreen.tsx`
- Create: `apps/mobile/src/app/mobile-screens/InboxScreen.tsx`
- Create: `apps/mobile/src/app/mobile-screens/LineEditorScreen.tsx`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/types.ts`
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/src/app/AppRoot.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/PostDetailScreen.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/MyScreen.tsx`

## Implementation Order

### Task 1: Make The Schema Point-First And Add Pure Rule Helpers

**Files:**
- Create: `services/api-java/src/main/resources/schema.sql`
- Create: `services/api-java/src/main/java/com/tripin/api/support/PointStateSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/CandidateLineSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/TripCompletionSupport.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/PointStateSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/CandidateLineSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/TripCompletionSupportTest.java`
- Modify: `services/api-java/src/main/resources/application.properties`
- Modify: `services/api/prisma/schema.prisma`
- Modify: `services/api/prisma/manual-init.sql`

- [ ] **Step 1: Write failing helper tests for point state, candidate grouping, and line completion**

```java
package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class PointStateSupportTest {
  @Test
  void returnsRecordedWhenPointOnlyHasImage() {
    PointStateSupport.PointSnapshot point =
        new PointStateSupport.PointSnapshot("point-1", null, null, null, null, 1);

    assertEquals(PointStateSupport.PointState.RECORDED, PointStateSupport.from(point));
  }

  @Test
  void returnsNeedsCompletionWhenOnlyTimeExists() {
    PointStateSupport.PointSnapshot point =
        new PointStateSupport.PointSnapshot("point-2", null, Instant.parse("2026-04-07T02:00:00Z"), null, null, 1);

    assertEquals(PointStateSupport.PointState.NEEDS_COMPLETION, PointStateSupport.from(point));
  }

  @Test
  void returnsReadyForLineWhenTimeAndPlaceExist() {
    PointStateSupport.PointSnapshot point =
        new PointStateSupport.PointSnapshot("point-3", "place-great-wall", Instant.parse("2026-04-07T02:00:00Z"), 40.0, 116.0, 1);

    assertEquals(PointStateSupport.PointState.READY_FOR_LINE, PointStateSupport.from(point));
  }
}
```

```java
package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class CandidateLineSupportTest {
  @Test
  void groupsNearbySameDayPointsIntoOneCandidateLine() {
    List<CandidateLineSupport.CandidatePoint> points =
        List.of(
            new CandidateLineSupport.CandidatePoint("point-great-wall", "Great Wall", Instant.parse("2026-04-07T02:00:00Z"), 40.3598, 116.0204),
            new CandidateLineSupport.CandidatePoint("point-forbidden-city", "Forbidden City", Instant.parse("2026-04-07T07:30:00Z"), 39.9163, 116.3972));

    List<CandidateLineSupport.CandidateLine> grouped =
        CandidateLineSupport.group(points, 480, 80.0);

    assertEquals(1, grouped.size());
    assertEquals(List.of("point-great-wall", "point-forbidden-city"), grouped.getFirst().pointIds());
  }
}
```

```java
package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class TripCompletionSupportTest {
  @Test
  void lineIsIncompleteWhenAnyPointNeedsCompletion() {
    assertFalse(
        TripCompletionSupport.isComplete(
            "Beijing one-day line",
            List.of(
                PointStateSupport.PointState.READY_FOR_LINE,
                PointStateSupport.PointState.NEEDS_COMPLETION)));
  }

  @Test
  void lineIsCompleteWhenTitleExistsAndAllPointsAreReady() {
    assertTrue(
        TripCompletionSupport.isComplete(
            "Beijing one-day line",
            List.of(
                PointStateSupport.PointState.READY_FOR_LINE,
                PointStateSupport.PointState.READY_FOR_LINE)));
  }
}
```

- [ ] **Step 2: Run the helper tests and confirm they fail because the support classes do not exist yet**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointStateSupportTest,CandidateLineSupportTest,TripCompletionSupportTest"
```

Expected:

- `COMPILATION ERROR`
- Missing symbols for `PointStateSupport`, `CandidateLineSupport`, or `TripCompletionSupport`

- [ ] **Step 3: Implement the support classes and point-first schema bootstrap**

Add this to `services/api-java/src/main/resources/application.properties`:

```properties
spring.sql.init.mode=always
spring.sql.init.schema-locations=classpath:schema.sql
```

Create `services/api-java/src/main/resources/schema.sql` by copying the current `services/api/prisma/manual-init.sql` content and applying these exact changes:

```sql
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "isCompleted" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "TripPoint" ALTER COLUMN "tripId" DROP NOT NULL;
ALTER TABLE "TripPoint" ALTER COLUMN "startedAt" DROP NOT NULL;
ALTER TABLE "TripPoint" ALTER COLUMN "sequence" SET DEFAULT 0;

ALTER TABLE "TripPoint" DROP CONSTRAINT IF EXISTS "TripPoint_tripId_fkey";
ALTER TABLE "TripPoint"
  ADD CONSTRAINT "TripPoint_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Update the reference schema in `services/api/prisma/schema.prisma`:

```prisma
model Trip {
  id           String       @id @default(cuid())
  ownerId      String
  title        String
  summary      String?
  kind         TripKind     @default(MIXED)
  status       TripStatus   @default(DRAFT)
  visibility   Visibility   @default(PRIVATE)
  cityName     String?
  provinceName String?
  countryCode  String       @default("CN")
  coverMediaId String?
  startedAt    DateTime?
  endedAt      DateTime?
  pointCount   Int          @default(0)
  mediaCount   Int          @default(0)
  routePreview Json?
  isCompleted  Boolean      @default(false)
  publishedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model TripPoint {
  id              String       @id @default(cuid())
  tripId          String?
  placeId         String?
  title           String?
  note            String?
  customPlaceName String?
  startedAt       DateTime?
  endedAt         DateTime?
  latitude        Decimal?     @db.Decimal(10, 7)
  longitude       Decimal?     @db.Decimal(10, 7)
  sequence        Int          @default(0)
  sourceType      PointSource  @default(HYBRID)
  mediaCount      Int          @default(0)
  addressSnapshot Json?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  trip            Trip?        @relation(fields: [tripId], references: [id], onDelete: SetNull)
  place           Place?       @relation(fields: [placeId], references: [id])
  mediaAssets     MediaAsset[]
}
```

Create `services/api-java/src/main/java/com/tripin/api/support/PointStateSupport.java`:

```java
package com.tripin.api.support;

import java.time.Instant;

public final class PointStateSupport {
  private PointStateSupport() {}

  public enum PointState {
    RECORDED,
    NEEDS_COMPLETION,
    READY_FOR_LINE
  }

  public record PointSnapshot(
      String pointId,
      String placeId,
      Instant startedAt,
      Double latitude,
      Double longitude,
      int mediaCount) {}

  public static PointState from(PointSnapshot point) {
    if (point.mediaCount() <= 0) {
      throw new IllegalArgumentException("point must have at least one image");
    }

    boolean hasTime = point.startedAt() != null;
    boolean hasPlace =
        point.placeId() != null || (point.latitude() != null && point.longitude() != null);

    if (hasTime && hasPlace) {
      return PointState.READY_FOR_LINE;
    }
    if (!hasTime && !hasPlace) {
      return PointState.RECORDED;
    }
    return PointState.NEEDS_COMPLETION;
  }
}
```

Create `services/api-java/src/main/java/com/tripin/api/support/CandidateLineSupport.java`:

```java
package com.tripin.api.support;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class CandidateLineSupport {
  private CandidateLineSupport() {}

  public record CandidatePoint(
      String pointId,
      String title,
      Instant startedAt,
      Double latitude,
      Double longitude) {}

  public record CandidateLine(
      String candidateId,
      Instant startedAt,
      Instant endedAt,
      List<String> pointIds) {}

  public static List<CandidateLine> group(
      List<CandidatePoint> rawPoints, int timeGapMinutes, double distanceGapKm) {
    List<CandidatePoint> points =
        rawPoints.stream()
            .sorted(Comparator.comparing(CandidatePoint::startedAt))
            .toList();

    List<CandidateLine> lines = new ArrayList<>();
    List<String> currentPointIds = new ArrayList<>();
    Instant currentStart = null;
    Instant currentEnd = null;
    CandidatePoint last = null;
    int candidateIndex = 1;

    for (CandidatePoint point : points) {
      boolean split =
          last != null
              && (Duration.between(last.startedAt(), point.startedAt()).toMinutes() > timeGapMinutes
                  || GeoSupport.haversineInKm(
                          last.latitude(), last.longitude(), point.latitude(), point.longitude())
                      > distanceGapKm);

      if (split) {
        lines.add(new CandidateLine("candidate-" + candidateIndex++, currentStart, currentEnd, List.copyOf(currentPointIds)));
        currentPointIds = new ArrayList<>();
        currentStart = null;
      }

      if (currentStart == null) {
        currentStart = point.startedAt();
      }
      currentEnd = point.startedAt();
      currentPointIds.add(point.pointId());
      last = point;
    }

    if (!currentPointIds.isEmpty()) {
      lines.add(new CandidateLine("candidate-" + candidateIndex, currentStart, currentEnd, List.copyOf(currentPointIds)));
    }

    return lines;
  }
}
```

Create `services/api-java/src/main/java/com/tripin/api/support/TripCompletionSupport.java`:

```java
package com.tripin.api.support;

import java.util.List;

public final class TripCompletionSupport {
  private TripCompletionSupport() {}

  public static boolean isComplete(String title, List<PointStateSupport.PointState> pointStates) {
    return title != null
        && !title.isBlank()
        && !pointStates.isEmpty()
        && pointStates.stream().allMatch(state -> state == PointStateSupport.PointState.READY_FOR_LINE);
  }
}
```

- [ ] **Step 4: Run the helper tests again and then compile the backend**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointStateSupportTest,CandidateLineSupportTest,TripCompletionSupportTest"
npm run build:api
```

Expected:

- Maven ends with `BUILD SUCCESS`
- `npm run build:api` ends with Maven compile success

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add services/api-java/src/main/resources/application.properties services/api-java/src/main/resources/schema.sql services/api-java/src/main/java/com/tripin/api/support/PointStateSupport.java services/api-java/src/main/java/com/tripin/api/support/CandidateLineSupport.java services/api-java/src/main/java/com/tripin/api/support/TripCompletionSupport.java services/api-java/src/test/java/com/tripin/api/support/PointStateSupportTest.java services/api-java/src/test/java/com/tripin/api/support/CandidateLineSupportTest.java services/api-java/src/test/java/com/tripin/api/support/TripCompletionSupportTest.java services/api/prisma/schema.prisma services/api/prisma/manual-init.sql
  git commit -m "feat: add point-first schema and domain helpers"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 1 complete - point-first schema and domain helpers"
}
```

### Task 2: Add Standalone Point And Inbox APIs

**Files:**
- Create: `services/api-java/src/main/java/com/tripin/api/controller/PointsController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/PointsService.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/PointsControllerTest.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/web/Requests.java`

- [ ] **Step 1: Write the failing controller contract test for create point and inbox**

```java
package com.tripin.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tripin.api.service.PointsService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;

@WebMvcTest(PointsController.class)
class PointsControllerTest {
  @Autowired private MockMvc mockMvc;

  @MockBean private PointsService pointsService;
  @MockBean private CurrentUserResolver currentUserResolver;

  @Test
  void createsStandalonePoint() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(pointsService.createPoint(eq("demo-user"), any()))
        .thenReturn(Map.of("id", "point-great-wall", "state", "READY_FOR_LINE"));

    mockMvc.perform(
            post("/v1/points")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                  {
                    "mediaAssetIds": ["media-great-wall"],
                    "startedAt": "2026-04-07T02:00:00Z",
                    "placeId": "place-great-wall"
                  }
                  """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("point-great-wall"))
        .andExpect(jsonPath("$.state").value("READY_FOR_LINE"));
  }

  @Test
  void returnsInboxReadModel() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(pointsService.getInbox("demo-user"))
        .thenReturn(
            Map.of(
                "unassignedPoints", List.of(Map.of("id", "point-great-wall", "state", "READY_FOR_LINE")),
                "candidateLines", List.of(Map.of("candidateId", "candidate-1", "pointIds", List.of("point-great-wall")))));

    mockMvc.perform(get("/v1/points/inbox").header("x-user-id", "demo-user"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unassignedPoints[0].id").value("point-great-wall"))
        .andExpect(jsonPath("$.candidateLines[0].candidateId").value("candidate-1"));
  }
}
```

- [ ] **Step 2: Run the controller test and confirm it fails because the controller and service do not exist**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointsControllerTest"
```

Expected:

- `COMPILATION ERROR`
- Missing `PointsController` and `PointsService`

- [ ] **Step 3: Add request DTOs, controller, and service**

Update `services/api-java/src/main/java/com/tripin/api/web/Requests.java` with these records:

```java
public record CreatePointRequest(
    List<String> mediaAssetIds,
    String startedAt,
    String endedAt,
    String placeId,
    String customPlaceName,
    String title,
    String note,
    Double latitude,
    Double longitude) {}

public record UpdatePointRequest(
    String startedAt,
    String endedAt,
    String placeId,
    String customPlaceName,
    String title,
    String note,
    Double latitude,
    Double longitude) {}
```

Create `services/api-java/src/main/java/com/tripin/api/controller/PointsController.java`:

```java
package com.tripin.api.controller;

import com.tripin.api.service.PointsService;
import com.tripin.api.web.CurrentUserResolver;
import com.tripin.api.web.Requests.CreatePointRequest;
import com.tripin.api.web.Requests.UpdatePointRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/points")
public class PointsController {
  private final PointsService pointsService;
  private final CurrentUserResolver currentUserResolver;

  public PointsController(PointsService pointsService, CurrentUserResolver currentUserResolver) {
    this.pointsService = pointsService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping
  public Map<String, Object> create(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @RequestBody CreatePointRequest request) {
    return pointsService.createPoint(currentUserResolver.resolve(userId), request);
  }

  @PatchMapping("/{pointId}")
  public Map<String, Object> update(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String pointId,
      @RequestBody UpdatePointRequest request) {
    return pointsService.updatePoint(currentUserResolver.resolve(userId), pointId, request);
  }

  @GetMapping("/inbox")
  public Map<String, Object> inbox(
      @RequestHeader(value = "x-user-id", required = false) String userId) {
    return pointsService.getInbox(currentUserResolver.resolve(userId));
  }
}
```

Create `services/api-java/src/main/java/com/tripin/api/service/PointsService.java` with these concrete entry points:

```java
package com.tripin.api.service;

import com.tripin.api.support.CandidateLineSupport;
import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.support.PointStateSupport;
import com.tripin.api.web.Requests.CreatePointRequest;
import com.tripin.api.web.Requests.UpdatePointRequest;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PointsService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final TransactionTemplate transactionTemplate;

  public PointsService(DbSupport db, JsonSupport json, UserService userService, TransactionTemplate transactionTemplate) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.transactionTemplate = transactionTemplate;
  }

  public Map<String, Object> createPoint(String userId, CreatePointRequest request) {
    if (request == null || request.mediaAssetIds() == null || request.mediaAssetIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mediaAssetIds is required");
    }

    userService.ensureExists(userId);
    String pointId = json.newId("point");

    transactionTemplate.executeWithoutResult(
        status -> {
          db.update(
              """
              insert into "TripPoint" (
                id, "tripId", "placeId", "customPlaceName", title, note,
                "startedAt", "endedAt", latitude, longitude, sequence, "sourceType"
              )
              values (
                :id, null, :placeId, :customPlaceName, :title, :note,
                cast(:startedAt as timestamptz), cast(:endedAt as timestamptz),
                :latitude, :longitude, 0, cast('MANUAL' as "PointSource")
              )
              """,
              Map.of(
                  "id", pointId,
                  "placeId", request.placeId(),
                  "customPlaceName", request.customPlaceName(),
                  "title", request.title(),
                  "note", request.note(),
                  "startedAt", request.startedAt(),
                  "endedAt", request.endedAt(),
                  "latitude", request.latitude(),
                  "longitude", request.longitude()));

          for (String mediaAssetId : request.mediaAssetIds()) {
            db.update(
                """
                update "MediaAsset"
                set "tripId" = null, "tripPointId" = :pointId, "updatedAt" = now()
                where id = :mediaId and "ownerId" = :ownerId
                """,
                Map.of("pointId", pointId, "mediaId", mediaAssetId, "ownerId", userId));
          }
        });

    return loadPointView(pointId);
  }

  public Map<String, Object> updatePoint(String userId, String pointId, UpdatePointRequest request) {
    userService.ensureExists(userId);
    db.update(
        """
        update "TripPoint"
        set
          "placeId" = coalesce(:placeId, "placeId"),
          "customPlaceName" = coalesce(:customPlaceName, "customPlaceName"),
          title = coalesce(:title, title),
          note = coalesce(:note, note),
          "startedAt" = coalesce(cast(:startedAt as timestamptz), "startedAt"),
          "endedAt" = coalesce(cast(:endedAt as timestamptz), "endedAt"),
          latitude = coalesce(:latitude, latitude),
          longitude = coalesce(:longitude, longitude),
          "updatedAt" = now()
        where id = :id
        """,
        Map.of(
            "id", pointId,
            "placeId", request.placeId(),
            "customPlaceName", request.customPlaceName(),
            "title", request.title(),
            "note", request.note(),
            "startedAt", request.startedAt(),
            "endedAt", request.endedAt(),
            "latitude", request.latitude(),
            "longitude", request.longitude()));
    return loadPointView(pointId);
  }

  public Map<String, Object> getInbox(String userId) {
    userService.ensureExists(userId);
    List<Map<String, Object>> rawPoints =
        db.list(
            """
            select
              tp.id,
              tp.title,
              tp."placeId" as place_id,
              tp."startedAt" as started_at,
              tp.latitude,
              tp.longitude,
              coalesce(count(m.id), 0) as media_count
            from "TripPoint" tp
            join "MediaAsset" m on m."tripPointId" = tp.id and m."ownerId" = :ownerId
            where tp."tripId" is null
            group by tp.id
            order by tp."startedAt" asc nulls last, tp."createdAt" asc
            """,
            Map.of("ownerId", userId));

    List<Map<String, Object>> unassignedPoints = rawPoints.stream().map(this::toPointView).toList();
    List<CandidateLineSupport.CandidatePoint> readyPoints =
        rawPoints.stream()
            .map(this::toCandidatePointOrNull)
            .filter(point -> point != null)
            .collect(Collectors.toList());

    List<Map<String, Object>> candidateLines =
        CandidateLineSupport.group(readyPoints, 480, 80.0).stream()
            .map(
                line ->
                    Map.of(
                        "candidateId", line.candidateId(),
                        "startedAt", line.startedAt().toString(),
                        "endedAt", line.endedAt().toString(),
                        "pointIds", line.pointIds()))
            .toList();

    return Map.of("unassignedPoints", unassignedPoints, "candidateLines", candidateLines);
  }
}
```

Add these helper methods at the end of `PointsService.java` so the service snippet is complete:

```java
  private Map<String, Object> loadPointView(String pointId) {
    Map<String, Object> row =
        db.first(
            """
            select
              tp.id,
              tp."tripId" as trip_id,
              tp.title,
              tp.note,
              tp."customPlaceName" as custom_place_name,
              tp."placeId" as place_id,
              tp."startedAt" as started_at,
              tp."endedAt" as ended_at,
              tp.latitude,
              tp.longitude,
              coalesce(count(m.id), 0) as media_count
            from "TripPoint" tp
            join "MediaAsset" m on m."tripPointId" = tp.id
            where tp.id = :pointId
            group by tp.id
            """,
            Map.of("pointId", pointId));

    return toPointView(row);
  }

  private Map<String, Object> toPointView(Map<String, Object> row) {
    PointStateSupport.PointState state =
        PointStateSupport.from(
            new PointStateSupport.PointSnapshot(
                json.stringValue(row.get("id")),
                json.stringValue(row.get("place_id")),
                json.instantValue(row.get("started_at")),
                json.doubleValue(row.get("latitude")),
                json.doubleValue(row.get("longitude")),
                json.intValue(row.get("media_count"))));

    return Map.of(
        "id", row.get("id"),
        "tripId", row.get("trip_id"),
        "title", row.get("title"),
        "note", row.get("note"),
        "customPlaceName", row.get("custom_place_name"),
        "startedAt", json.instantValue(row.get("started_at")),
        "endedAt", json.instantValue(row.get("ended_at")),
        "latitude", json.doubleValue(row.get("latitude")),
        "longitude", json.doubleValue(row.get("longitude")),
        "mediaCount", json.intValue(row.get("media_count")),
        "state", state.name());
  }

  private CandidateLineSupport.CandidatePoint toCandidatePointOrNull(Map<String, Object> row) {
    PointStateSupport.PointState state =
        PointStateSupport.from(
            new PointStateSupport.PointSnapshot(
                json.stringValue(row.get("id")),
                json.stringValue(row.get("place_id")),
                json.instantValue(row.get("started_at")),
                json.doubleValue(row.get("latitude")),
                json.doubleValue(row.get("longitude")),
                json.intValue(row.get("media_count"))));

    if (state != PointStateSupport.PointState.READY_FOR_LINE) {
      return null;
    }

    return new CandidateLineSupport.CandidatePoint(
        json.stringValue(row.get("id")),
        json.stringValue(row.get("title")),
        json.instantValue(row.get("started_at")),
        json.doubleValue(row.get("latitude")),
        json.doubleValue(row.get("longitude")));
  }
```

- [ ] **Step 4: Run the controller test and backend compile**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointsControllerTest"
npm run build:api
```

Expected:

- `PointsControllerTest` passes
- Backend compile succeeds

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add services/api-java/src/main/java/com/tripin/api/web/Requests.java services/api-java/src/main/java/com/tripin/api/controller/PointsController.java services/api-java/src/main/java/com/tripin/api/service/PointsService.java services/api-java/src/test/java/com/tripin/api/controller/PointsControllerTest.java
  git commit -m "feat: add standalone points and inbox api"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 2 complete - standalone points and inbox api"
}
```

### Task 3: Extend Trip APIs Into Real Line Editing APIs

**Files:**
- Modify: `services/api-java/src/main/java/com/tripin/api/web/Requests.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/controller/TripsController.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/TripsService.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/TripsControllerTest.java`

- [ ] **Step 1: Write the failing controller test for attach and detach point actions**

```java
package com.tripin.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tripin.api.service.TripsService;
import com.tripin.api.web.CurrentUserResolver;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;

@WebMvcTest(TripsController.class)
class TripsControllerTest {
  @Autowired private MockMvc mockMvc;

  @MockBean private TripsService tripsService;
  @MockBean private CurrentUserResolver currentUserResolver;

  @Test
  void attachesExistingPointsToLine() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(tripsService.attachPoints(eq("demo-user"), eq("trip-beijing"), any()))
        .thenReturn(Map.of("id", "trip-beijing", "pointCount", 2));

    mockMvc.perform(
            post("/v1/trips/trip-beijing/points/attach")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                  { "pointIds": ["point-great-wall", "point-forbidden-city"] }
                  """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pointCount").value(2));
  }

  @Test
  void detachesPointsBackToInbox() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(tripsService.detachPoints(eq("demo-user"), eq("trip-beijing"), any()))
        .thenReturn(Map.of("id", "trip-beijing", "pointCount", 1));

    mockMvc.perform(
            post("/v1/trips/trip-beijing/points/detach")
                .header("x-user-id", "demo-user")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                  { "pointIds": ["point-forbidden-city"] }
                  """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pointCount").value(1));
  }
}
```

- [ ] **Step 2: Run the controller test and confirm it fails because attach and detach endpoints do not exist**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=TripsControllerTest"
```

Expected:

- `COMPILATION ERROR`
- Missing `attachPoints` and `detachPoints` methods or missing controller mappings

- [ ] **Step 3: Add attach and detach request records plus service/controller methods**

Add this record to `services/api-java/src/main/java/com/tripin/api/web/Requests.java`:

```java
public record MutateLinePointsRequest(List<String> pointIds) {}
```

Add these endpoints to `services/api-java/src/main/java/com/tripin/api/controller/TripsController.java`:

```java
  @PostMapping("/{tripId}/points/attach")
  public Map<String, Object> attachPoints(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @RequestBody MutateLinePointsRequest request) {
    return tripsService.attachPoints(currentUserResolver.resolve(userId), tripId, request);
  }

  @PostMapping("/{tripId}/points/detach")
  public Map<String, Object> detachPoints(
      @RequestHeader(value = "x-user-id", required = false) String userId,
      @PathVariable String tripId,
      @RequestBody MutateLinePointsRequest request) {
    return tripsService.detachPoints(currentUserResolver.resolve(userId), tripId, request);
  }
```

Add these concrete methods to `services/api-java/src/main/java/com/tripin/api/service/TripsService.java`:

```java
  public Map<String, Object> attachPoints(String userId, String tripId, MutateLinePointsRequest request) {
    assertTripOwner(userId, tripId);
    if (request == null || request.pointIds() == null || request.pointIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds is required");
    }

    Integer maxSequence =
        db.integer("select coalesce(max(sequence), 0) from \"TripPoint\" where \"tripId\" = :tripId", Map.of("tripId", tripId));
    int baseSequence = maxSequence == null ? 0 : maxSequence;

    transactionTemplate.executeWithoutResult(
        status -> {
          for (int index = 0; index < request.pointIds().size(); index++) {
            String pointId = request.pointIds().get(index);
            db.update(
                """
                update "TripPoint"
                set "tripId" = :tripId, sequence = :sequence, "updatedAt" = now()
                where id = :pointId
                """,
                Map.of("tripId", tripId, "sequence", baseSequence + index + 1, "pointId", pointId));
            db.update(
                """
                update "MediaAsset"
                set "tripId" = :tripId, "updatedAt" = now()
                where "tripPointId" = :pointId
                """,
                Map.of("tripId", tripId, "pointId", pointId));
          }
          refreshTripAggregates(tripId);
          refreshTripCompletion(tripId);
        });

    return getTrip(userId, tripId);
  }

  public Map<String, Object> detachPoints(String userId, String tripId, MutateLinePointsRequest request) {
    assertTripOwner(userId, tripId);
    if (request == null || request.pointIds() == null || request.pointIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pointIds is required");
    }

    transactionTemplate.executeWithoutResult(
        status -> {
          for (String pointId : request.pointIds()) {
            db.update(
                """
                update "TripPoint"
                set "tripId" = null, sequence = 0, "updatedAt" = now()
                where id = :pointId and "tripId" = :tripId
                """,
                Map.of("pointId", pointId, "tripId", tripId));
            db.update(
                """
                update "MediaAsset"
                set "tripId" = null, "updatedAt" = now()
                where "tripPointId" = :pointId
                """,
                Map.of("pointId", pointId));
          }
          reindexPoints(tripId);
          refreshTripAggregates(tripId);
          refreshTripCompletion(tripId);
        });

    return getTrip(userId, tripId);
  }
```

Update `loadTripView`, `createPoint`, `updatePoint`, `publishTrip`, and aggregate refresh logic in `TripsService.java` with these exact behaviors:

```java
result.put("isCompleted", Boolean.TRUE.equals(trip.get("is_completed")));
```

In `loadTripPoints`, include point readiness in every returned point payload:

```java
PointStateSupport.PointState state =
    PointStateSupport.from(
        new PointStateSupport.PointSnapshot(
            pointId,
            json.stringValue(row.get("place_id")),
            json.instantValue(row.get("started_at")),
            json.doubleValue(row.get("latitude")),
            json.doubleValue(row.get("longitude")),
            json.intValue(row.get("media_count"))));
point.put("state", state.name());
```

```java
if (!Boolean.TRUE.equals(trip.get("is_completed"))) {
  throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip must be complete before publishing");
}
```

```java
private void refreshTripCompletion(String tripId) {
  List<Map<String, Object>> points =
      db.list(
          """
          select
            tp.id,
            tp."placeId" as place_id,
            tp."startedAt" as started_at,
            tp.latitude,
            tp.longitude,
            coalesce(tp."mediaCount", 0) as media_count
          from "TripPoint" tp
          where tp."tripId" = :tripId
          order by tp.sequence asc
          """,
          Map.of("tripId", tripId));

  String title = db.stringValue("select title from \"Trip\" where id = :tripId", Map.of("tripId", tripId));
  List<PointStateSupport.PointState> pointStates =
      points.stream()
          .map(
              row ->
                  PointStateSupport.from(
                      new PointStateSupport.PointSnapshot(
                          json.stringValue(row.get("id")),
                          json.stringValue(row.get("place_id")),
                          json.instantValue(row.get("started_at")),
                          json.doubleValue(row.get("latitude")),
                          json.doubleValue(row.get("longitude")),
                          json.intValue(row.get("media_count")))))
          .toList();

  boolean isCompleted = TripCompletionSupport.isComplete(title, pointStates);
  db.update(
      """
      update "Trip"
      set "isCompleted" = :isCompleted, "updatedAt" = now()
      where id = :tripId
      """,
      Map.of("tripId", tripId, "isCompleted", isCompleted));
}
```

- [ ] **Step 4: Run the trip controller test and a full backend test pass**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=TripsControllerTest,PointStateSupportTest,CandidateLineSupportTest,TripCompletionSupportTest,PointsControllerTest"
npm run build:api
```

Expected:

- All listed tests pass
- Backend compile succeeds

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add services/api-java/src/main/java/com/tripin/api/web/Requests.java services/api-java/src/main/java/com/tripin/api/controller/TripsController.java services/api-java/src/main/java/com/tripin/api/service/TripsService.java services/api-java/src/test/java/com/tripin/api/controller/TripsControllerTest.java
  git commit -m "feat: add line editing attach detach flow"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 3 complete - line editing attach detach flow"
}
```

### Task 4: Seed Point-First Demo Data And Document The New API

**Files:**
- Modify: `services/api-java/src/main/java/com/tripin/api/service/DevSupportService.java`
- Modify: `README.md`

- [ ] **Step 1: Write a failing manual verification checklist based on the approved Beijing one-day scenario**

Add this checklist to your working notes before editing code:

```text
1. Seed data should produce:
   - one completed published line
   - one draft editable line
   - at least two standalone unassigned points
   - one point missing place
   - one point missing time
2. After seed, GET /api/v1/points/inbox must return both candidate lines and needs-completion points.
3. Home data should have a "continue editing" draft line without creating any new content manually.
```

- [ ] **Step 2: Run the existing seed and confirm it does not create inbox-ready data**

Run:

```powershell
curl -X POST http://localhost:3000/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
curl http://localhost:3000/api/v1/points/inbox -H "x-user-id: demo-user"
```

Expected:

- Seed succeeds
- Inbox request fails or returns no standalone points, proving the current seed is insufficient

- [ ] **Step 3: Update the seed and README**

Extend `services/api-java/src/main/java/com/tripin/api/service/DevSupportService.java` with these concrete changes:

```java
private void upsertStandalonePoints() {
  upsertStandalonePoint(
      "point-great-wall-live",
      "Great Wall live check-in",
      "Shot on the wall before heading back to the city.",
      "2026-04-07T02:00:00Z",
      "place-great-wall",
      40.3598,
      116.0204,
      "media-great-wall-live");

  upsertStandalonePoint(
      "point-forbidden-city-posthoc",
      "Forbidden City post-hoc",
      "Added after the trip from the photo roll.",
      "2026-04-07T07:30:00Z",
      "place-forbidden-city",
      39.9163,
      116.3972,
      "media-forbidden-city-posthoc");

  upsertStandalonePoint(
      "point-missing-place",
      "Needs place",
      "This point only has a remembered time.",
      "2026-04-07T10:00:00Z",
      null,
      null,
      null,
      "media-missing-place");

  upsertStandalonePoint(
      "point-missing-time",
      "Needs time",
      "This point has a place but no reliable time yet.",
      null,
      "place-beijing-798",
      39.984123,
      116.497512,
      "media-missing-time");
}
```

Update the README API section with the new calls:

```markdown
- `POST /api/v1/points`
- `PATCH /api/v1/points/:pointId`
- `GET /api/v1/points/inbox`
- `POST /api/v1/trips/:tripId/points/attach`
- `POST /api/v1/trips/:tripId/points/detach`
```

- [ ] **Step 4: Rerun the seed and verify the inbox**

Run:

```powershell
curl -X POST http://localhost:3000/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
curl http://localhost:3000/api/v1/points/inbox -H "x-user-id: creator-li"
```

Expected:

- Inbox JSON includes `unassignedPoints`
- Inbox JSON includes `candidateLines`
- At least one point shows `state` as `NEEDS_COMPLETION`

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add services/api-java/src/main/java/com/tripin/api/service/DevSupportService.java README.md
  git commit -m "chore: seed point-first demo data"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 4 complete - seed point-first demo data"
}
```

### Task 5: Add Mobile Domain Types, API Client Methods, And Pure State Tests

**Files:**
- Create: `apps/mobile/vitest.config.ts`
- Create: `apps/mobile/src/app/point-drafts.ts`
- Create: `apps/mobile/src/app/inbox-selectors.ts`
- Create: `apps/mobile/src/app/inbox-selectors.test.ts`
- Create: `apps/mobile/src/app/line-editor-state.ts`
- Create: `apps/mobile/src/app/line-editor-state.test.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/types.ts`
- Modify: `apps/mobile/src/lib/api.ts`

- [ ] **Step 1: Add failing Vitest tests for inbox selectors and line completion**

```ts
import { describe, expect, it } from 'vitest';
import { splitInboxSections } from './inbox-selectors';

describe('splitInboxSections', () => {
  it('separates ready points from needs-completion points', () => {
    const sections = splitInboxSections({
      unassignedPoints: [
        { id: 'point-ready', state: 'READY_FOR_LINE' },
        { id: 'point-needs-place', state: 'NEEDS_COMPLETION' },
      ],
      candidateLines: [],
    } as any);

    expect(sections.readyPointIds).toEqual(['point-ready']);
    expect(sections.needsCompletionIds).toEqual(['point-needs-place']);
  });
});
```

```ts
import { describe, expect, it } from 'vitest';
import { canCompleteLine, insertPointIds } from './line-editor-state';

describe('line-editor-state', () => {
  it('inserts point ids after the selected index', () => {
    expect(insertPointIds(['a', 'b'], ['c'], 0)).toEqual(['a', 'c', 'b']);
  });

  it('blocks completion when any point needs completion', () => {
    expect(
      canCompleteLine('Beijing one-day line', [
        { id: 'point-1', state: 'READY_FOR_LINE' },
        { id: 'point-2', state: 'NEEDS_COMPLETION' },
      ] as any),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the mobile tests and confirm they fail because Vitest and the helpers are missing**

Run:

```powershell
npm --workspace apps/mobile exec vitest run src/app/inbox-selectors.test.ts src/app/line-editor-state.test.ts
```

Expected:

- command failure because `vitest` is not installed
- or module resolution failures for missing helper files

- [ ] **Step 3: Add the mobile test harness, new types, API methods, and helper implementations**

Update `apps/mobile/package.json`:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "export:web": "expo export --platform web",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2",
    "vitest": "^2.1.9"
  }
}
```

Create `apps/mobile/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Add these types to `apps/mobile/src/types.ts`:

```ts
export type PointState = 'RECORDED' | 'NEEDS_COMPLETION' | 'READY_FOR_LINE';

export interface TripPoint {
  id: string;
  title?: string | null;
  note?: string | null;
  customPlaceName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  sequence: number;
  sourceType: PointSource;
  mediaCount: number;
  place?: PlaceSummary | null;
  mediaAssets: MediaAsset[];
  state: PointState;
}

export interface RecordPoint {
  id: string;
  title?: string | null;
  note?: string | null;
  customPlaceName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  state: PointState;
  tripId?: string | null;
  mediaCount: number;
  mediaAssets: MediaAsset[];
  place?: PlaceSummary | null;
}

export interface CandidateLine {
  candidateId: string;
  startedAt: string;
  endedAt: string;
  pointIds: string[];
}

export interface InboxResponse {
  unassignedPoints: RecordPoint[];
  candidateLines: CandidateLine[];
}
```

Update `Trip` in `apps/mobile/src/types.ts`:

```ts
  isCompleted: boolean;
```

Update `apps/mobile/src/lib/api.ts`:

```ts
import type { InboxResponse, RecordPoint } from '../types';
```

```ts
    getInbox() {
      return request<InboxResponse>('/points/inbox');
    },
    createPoint(dto: {
      mediaAssetIds: string[];
      startedAt?: string;
      endedAt?: string;
      placeId?: string;
      customPlaceName?: string;
      title?: string;
      note?: string;
      latitude?: number;
      longitude?: number;
    }) {
      return request<RecordPoint>('/points', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    updatePoint(pointId: string, dto: {
      startedAt?: string;
      endedAt?: string;
      placeId?: string;
      customPlaceName?: string;
      title?: string;
      note?: string;
      latitude?: number;
      longitude?: number;
    }) {
      return request<RecordPoint>(`/points/${pointId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    attachPoints(tripId: string, pointIds: string[]) {
      return request<Trip>(`/trips/${tripId}/points/attach`, {
        method: 'POST',
        body: JSON.stringify({ pointIds }),
      });
    },
    detachPoints(tripId: string, pointIds: string[]) {
      return request<Trip>(`/trips/${tripId}/points/detach`, {
        method: 'POST',
        body: JSON.stringify({ pointIds }),
      });
    },
```

Create `apps/mobile/src/app/inbox-selectors.ts`:

```ts
import type { InboxResponse } from '../types';

export function splitInboxSections(inbox: InboxResponse) {
  return {
    readyPointIds: inbox.unassignedPoints.filter((point) => point.state === 'READY_FOR_LINE').map((point) => point.id),
    needsCompletionIds: inbox.unassignedPoints.filter((point) => point.state !== 'READY_FOR_LINE').map((point) => point.id),
    candidateIds: inbox.candidateLines.map((line) => line.candidateId),
  };
}
```

Create `apps/mobile/src/app/line-editor-state.ts`:

```ts
import type { RecordPoint } from '../types';

export function insertPointIds(existingIds: string[], incomingIds: string[], selectedIndex: number) {
  const safeIndex = Math.max(0, Math.min(selectedIndex + 1, existingIds.length));
  return [...existingIds.slice(0, safeIndex), ...incomingIds, ...existingIds.slice(safeIndex)];
}

export function canCompleteLine(title: string, points: Pick<RecordPoint, 'state'>[]) {
  return title.trim().length > 0 && points.length > 0 && points.every((point) => point.state === 'READY_FOR_LINE');
}
```

Create `apps/mobile/src/app/point-drafts.ts`:

```ts
export interface QuickPointDraft {
  originalName: string;
  caption: string;
  takenAt: string;
  latitude: string;
  longitude: string;
}

export function createBlankQuickPointDraft(): QuickPointDraft {
  return {
    originalName: `memory-${Date.now()}.jpg`,
    caption: '',
    takenAt: new Date().toISOString().slice(0, 16),
    latitude: '',
    longitude: '',
  };
}
```

- [ ] **Step 4: Run the mobile tests and TypeScript check**

Run:

```powershell
npm --workspace apps/mobile exec vitest run src/app/inbox-selectors.test.ts src/app/line-editor-state.test.ts
npm --workspace apps/mobile exec tsc --noEmit
```

Expected:

- Vitest reports `2 passed`
- `tsc --noEmit` completes without errors

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/mobile/package.json apps/mobile/vitest.config.ts apps/mobile/src/types.ts apps/mobile/src/lib/api.ts apps/mobile/src/app/point-drafts.ts apps/mobile/src/app/inbox-selectors.ts apps/mobile/src/app/inbox-selectors.test.ts apps/mobile/src/app/line-editor-state.ts apps/mobile/src/app/line-editor-state.test.ts
  git commit -m "feat: add mobile point-first types and state helpers"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 5 complete - mobile point-first types and state helpers"
}
```

### Task 6: Build The Home And Inbox Screens

**Files:**
- Create: `apps/mobile/src/app/mobile-screens/HomeScreen.tsx`
- Create: `apps/mobile/src/app/mobile-screens/InboxScreen.tsx`
- Modify: `apps/mobile/src/app/AppRoot.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/MyScreen.tsx`

- [ ] **Step 1: Write the screen-level state contract in AppRoot before implementing the views**

Add these state variables to `apps/mobile/src/app/AppRoot.tsx`:

```ts
type TabKey = 'home' | 'inbox' | 'library' | 'feed';

const [inbox, setInbox] = useState<InboxResponse>({ unassignedPoints: [], candidateLines: [] });
const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
const [quickPointDraft, setQuickPointDraft] = useState(createBlankQuickPointDraft());
```

The bootstrap request block should become:

```ts
const [health, feed, trips, inboxResponse, placeStatus] = await Promise.all([
  api.getHealth(),
  api.getFeed(),
  api.getTrips(),
  api.getInbox(),
  api.getPlaceStatus(),
]);
```

- [ ] **Step 2: Run the mobile typecheck and confirm it fails because `InboxResponse` and the screens are not wired yet**

Run:

```powershell
npm --workspace apps/mobile exec tsc --noEmit
```

Expected:

- Type errors for missing `HomeScreen`, `InboxScreen`, `InboxResponse`, or unused tab values

- [ ] **Step 3: Implement the Home and Inbox screens and wire them into `AppRoot.tsx`**

Create `apps/mobile/src/app/mobile-screens/HomeScreen.tsx`:

```tsx
import { ScrollView, Text, TextInput } from 'react-native';
import { Button, EmptyState, HeroCard, MetricPill, SectionCard, uiStyles } from '../../components/MobileUi';
import type { InboxResponse, Trip } from '../../types';

interface HomeScreenProps {
  draft: { originalName: string; caption: string; takenAt: string; latitude: string; longitude: string };
  onChangeDraft: (patch: Partial<HomeScreenProps['draft']>) => void;
  onQuickCheckIn: () => void | Promise<void>;
  onOpenTrip: (tripId: string) => void | Promise<void>;
  onOpenInbox: () => void;
  inbox: InboxResponse;
  trips: Trip[];
}

export function HomeScreen({ draft, onChangeDraft, onQuickCheckIn, onOpenTrip, onOpenInbox, inbox, trips }: HomeScreenProps) {
  const activeTrip = trips.find((trip) => !trip.isCompleted) ?? null;

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="Resume your line"
        subtitle="Create a point in seconds, then come back later to shape it into a replayable line."
        aside={<MetricPill value={inbox.unassignedPoints.length} label="inbox points" />}
      />

      <SectionCard title="Quick check-in" subtitle="Minimum input is one image-backed point." action={<Button label="Save point" variant="secondary" onPress={onQuickCheckIn} />}>
        <TextInput value={draft.originalName} onChangeText={(value) => onChangeDraft({ originalName: value })} style={uiStyles.textInput} placeholder="Photo file name" />
        <TextInput value={draft.caption} onChangeText={(value) => onChangeDraft({ caption: value })} style={[uiStyles.textInput, uiStyles.multilineInput]} multiline placeholder="Optional one-line note" />
      </SectionCard>

      {activeTrip ? (
        <SectionCard title="Continue editing" subtitle="Jump back into the current line without hunting for it.">
          <Text style={uiStyles.cardTitle}>{activeTrip.title}</Text>
          <Text style={uiStyles.cardBodyText}>{activeTrip.summary || 'No summary yet.'}</Text>
          <Button label="Open line editor" onPress={() => void onOpenTrip(activeTrip.id)} />
        </SectionCard>
      ) : (
        <EmptyState title="No active line yet" description="Create a few points and use the inbox to start a new line." />
      )}

      <SectionCard title="Inbox summary" subtitle="Candidate lines and incomplete points should always be visible from home." action={<Button label="Open inbox" variant="ghost" onPress={onOpenInbox} />}>
        <Text style={uiStyles.cardBodyText}>{`Candidate lines: ${inbox.candidateLines.length}`}</Text>
        <Text style={uiStyles.cardBodyText}>{`Needs completion: ${inbox.unassignedPoints.filter((point) => point.state !== 'READY_FOR_LINE').length}`}</Text>
      </SectionCard>
    </ScrollView>
  );
}
```

Create `apps/mobile/src/app/mobile-screens/InboxScreen.tsx`:

```tsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../../components/MobileUi';
import type { InboxResponse, RecordPoint } from '../../types';

interface InboxScreenProps {
  inbox: InboxResponse;
  onCreateTripFromPointIds: (pointIds: string[]) => void | Promise<void>;
}

export function InboxScreen({ inbox, onCreateTripFromPointIds }: InboxScreenProps) {
  const cardStyle = {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
    gap: 8,
  } as const;

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard title="Inbox" subtitle="Unassigned points and system candidate lines live here until they become a real line." />

      <SectionCard title="Candidate lines" subtitle="System suggestions based on time and place proximity.">
        {inbox.candidateLines.length ? (
          inbox.candidateLines.map((candidate) => (
            <Pressable key={candidate.candidateId} style={cardStyle}>
              <Text style={uiStyles.cardTitle}>{candidate.candidateId}</Text>
              <Text style={uiStyles.cardBodyText}>{`${candidate.pointIds.length} points`}</Text>
              <Button label="Create line from candidate" onPress={() => void onCreateTripFromPointIds(candidate.pointIds)} />
            </Pressable>
          ))
        ) : (
          <EmptyState title="No candidate lines yet" description="Create two or more ready points and they will appear here." />
        )}
      </SectionCard>

      <SectionCard title="Unassigned points" subtitle="Points stay here until you attach them to a line.">
        {inbox.unassignedPoints.map((point: RecordPoint) => (
          <View key={point.id} style={cardStyle}>
            <Text style={uiStyles.cardTitle}>{point.title || point.customPlaceName || point.id}</Text>
            <Text style={uiStyles.cardBodyText}>{point.state}</Text>
            <Text style={uiStyles.metaText}>{`${point.mediaCount} images`}</Text>
          </View>
        ))}
      </SectionCard>
    </ScrollView>
  );
}
```

Wire the screens into `apps/mobile/src/app/AppRoot.tsx`:

```tsx
import { HomeScreen } from './mobile-screens/HomeScreen';
import { InboxScreen } from './mobile-screens/InboxScreen';
import { LineEditorScreen } from './mobile-screens/LineEditorScreen';
import { createBlankQuickPointDraft } from './point-drafts';
```

```tsx
{selectedTripId ? (
  <LineEditorScreen
    trip={myTrips.find((trip) => trip.id === selectedTripId) ?? null}
    inboxPoints={inbox.unassignedPoints}
    onBack={() => setSelectedTripId(null)}
    onAttachPoints={(pointIds) => handleAttachPoints(selectedTripId, pointIds)}
    onDetachPoint={(pointId) => handleDetachPoint(selectedTripId, pointId)}
    onAddInlinePoint={handleAddInlinePoint}
    onPublishTrip={() => handlePublishTrip(selectedTripId)}
  />
) : tab === 'home' ? (
  <HomeScreen
    draft={quickPointDraft}
    onChangeDraft={(patch) => setQuickPointDraft((prev) => ({ ...prev, ...patch }))}
    onQuickCheckIn={handleQuickCheckIn}
    onOpenTrip={handleOpenTrip}
    onOpenInbox={() => setTab('inbox')}
    inbox={inbox}
    trips={myTrips}
  />
) : tab === 'inbox' ? (
  <InboxScreen
    inbox={inbox}
    onCreateTripFromPointIds={handleCreateTripFromCandidate}
  />
) : tab === 'library' ? (
  <MyScreen trips={myTrips} onOpenTrip={handleOpenTrip} />
) : (
  <FeedScreen
    apiBaseUrl={apiBaseUrl}
    onChangeApiBaseUrl={setApiBaseUrl}
    onSeedDemo={handleSeedDemo}
    onRefresh={handleRefresh}
    onOpenPost={handleOpenPost}
    items={feedItems}
  />
)}
```

- [ ] **Step 4: Run the mobile typecheck and verify the app still builds**

Run:

```powershell
npm --workspace apps/mobile exec tsc --noEmit
npm run build:mobile
```

Expected:

- TypeScript succeeds
- Expo web export completes without fatal errors

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/mobile/src/app/AppRoot.tsx apps/mobile/src/app/mobile-screens/HomeScreen.tsx apps/mobile/src/app/mobile-screens/InboxScreen.tsx apps/mobile/src/app/mobile-screens/MyScreen.tsx
  git commit -m "feat: add point-first home and inbox screens"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 6 complete - point-first home and inbox screens"
}
```

### Task 7: Replace The Studio With A Real Line Editor

**Files:**
- Create: `apps/mobile/src/app/mobile-screens/LineEditorScreen.tsx`
- Modify: `apps/mobile/src/app/AppRoot.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/PostDetailScreen.tsx`

- [ ] **Step 1: Add the line editor behavior contract to AppRoot**

Add these handlers to `apps/mobile/src/app/AppRoot.tsx`:

```ts
async function handleCreateTripFromCandidate(pointIds: string[]) {
  const trip = await api.createTrip({
    title: 'Untitled line',
    summary: 'Created from inbox candidate',
    kind: 'MIXED',
    visibility: 'PRIVATE',
  });
  const updatedTrip = await api.attachPoints(trip.id, pointIds);
  setSelectedTripId(updatedTrip.id);
  await refreshCollections(updatedTrip.id);
}

async function handleQuickCheckIn() {
  const media = await api.createMediaAsset({
    originalName: quickPointDraft.originalName,
    mimeType: 'image/jpeg',
    bytes: 2400000,
    width: 1440,
    height: 1080,
    caption: quickPointDraft.caption,
    takenAt: new Date(quickPointDraft.takenAt).toISOString(),
    exifLatitude: quickPointDraft.latitude ? Number(quickPointDraft.latitude) : undefined,
    exifLongitude: quickPointDraft.longitude ? Number(quickPointDraft.longitude) : undefined,
  });
  await api.markMediaReady(media.id);
  await api.createPoint({
    mediaAssetIds: [media.id],
    startedAt: new Date(quickPointDraft.takenAt).toISOString(),
    latitude: quickPointDraft.latitude ? Number(quickPointDraft.latitude) : undefined,
    longitude: quickPointDraft.longitude ? Number(quickPointDraft.longitude) : undefined,
    note: quickPointDraft.caption || undefined,
  });
  setQuickPointDraft(createBlankQuickPointDraft());
  await refreshCollections();
}

async function handleAttachPoints(tripId: string | null, pointIds: string[]) {
  if (!tripId) {
    return;
  }
  await api.attachPoints(tripId, pointIds);
  await refreshCollections(tripId);
}

async function handleDetachPoint(tripId: string | null, pointId: string) {
  if (!tripId) {
    return;
  }
  await api.detachPoints(tripId, [pointId]);
  await refreshCollections(tripId);
}

async function handleAddInlinePoint() {
  if (!selectedTripId) {
    return;
  }
  const media = await api.createMediaAsset({
    originalName: `inline-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
    bytes: 2400000,
    width: 1440,
    height: 1080,
    caption: 'Inline point',
  });
  await api.markMediaReady(media.id);
  await api.createTripPoint(selectedTripId, {
    mediaAssetIds: [media.id],
    note: 'Inline point',
    sourceType: 'MANUAL',
  });
  await refreshCollections(selectedTripId);
}

async function handlePublishTrip(tripId: string | null) {
  if (!tripId) {
    return;
  }
  await api.publishTrip(tripId, { visibility: 'PUBLIC' });
  await refreshCollections(tripId);
}
```

- [ ] **Step 2: Run TypeScript and confirm the line editor screen is still missing**

Run:

```powershell
npm --workspace apps/mobile exec tsc --noEmit
```

Expected:

- Missing import or prop errors for `LineEditorScreen`

- [ ] **Step 3: Implement `LineEditorScreen.tsx` and finish the line editing wiring**

Create `apps/mobile/src/app/mobile-screens/LineEditorScreen.tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native';
import { Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../../components/MobileUi';
import { RoutePreview } from '../../components/RoutePreview';
import { canCompleteLine } from '../line-editor-state';
import type { RecordPoint, Trip } from '../../types';

interface LineEditorScreenProps {
  trip: Trip | null;
  inboxPoints: RecordPoint[];
  onBack: () => void;
  onAttachPoints: (pointIds: string[]) => void | Promise<void>;
  onDetachPoint: (pointId: string) => void | Promise<void>;
  onAddInlinePoint: () => void | Promise<void>;
  onPublishTrip: () => void | Promise<void>;
}

export function LineEditorScreen({ trip, inboxPoints, onBack, onAttachPoints, onDetachPoint, onAddInlinePoint, onPublishTrip }: LineEditorScreenProps) {
  if (!trip) {
    return <EmptyState title="No line selected" description="Open a draft line from home or inbox." />;
  }

  const completionAllowed = canCompleteLine(trip.title, trip.points as any);
  const cardStyle = {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
    gap: 8,
  } as const;

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <Button label="Back" variant="ghost" onPress={onBack} />
      <HeroCard title={trip.title} subtitle="Edit the line in place and add points without leaving this screen." />

      <SectionCard title="Line summary" subtitle="The route shape should stay visible while editing.">
        <RoutePreview points={trip.routePreview} height={220} />
        <Text style={uiStyles.cardBodyText}>{trip.summary || 'No summary yet.'}</Text>
        <Text style={uiStyles.metaText}>{trip.isCompleted ? 'Completed line' : 'Still editing'}</Text>
      </SectionCard>

      <SectionCard title="Inline point creation" subtitle="This must stay inside the line editor.">
        <Button label="Add point inside line" variant="secondary" onPress={onAddInlinePoint} />
      </SectionCard>

      <SectionCard title="Attach inbox points" subtitle="Pull ready points in without going back to the inbox.">
        {inboxPoints.length ? (
          inboxPoints.map((point) => (
            <View key={point.id} style={cardStyle}>
              <Text style={uiStyles.cardTitle}>{point.title || point.id}</Text>
              <Text style={uiStyles.cardBodyText}>{point.state}</Text>
              <Button label="Attach to line" onPress={() => void onAttachPoints([point.id])} />
            </View>
          ))
        ) : (
          <EmptyState title="No inbox points" description="Create more points from home or detach points from other lines." />
        )}
      </SectionCard>

      <SectionCard title="Current points" subtitle="Detach wrong points and keep only what belongs in this line.">
        {trip.points.map((point) => (
          <View key={point.id} style={cardStyle}>
            <Text style={uiStyles.cardTitle}>{point.title || point.customPlaceName || point.place?.name || point.id}</Text>
            <Text style={uiStyles.cardBodyText}>{point.state}</Text>
            <Button label="Detach back to inbox" variant="ghost" onPress={() => void onDetachPoint(point.id)} />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Completion" subtitle="Publish only after every point is ready for line.">
        <Text style={uiStyles.cardBodyText}>{completionAllowed ? 'Ready to publish' : 'Some points still need time or place.'}</Text>
        <Button label="Publish line" onPress={onPublishTrip} disabled={!completionAllowed} />
      </SectionCard>
    </ScrollView>
  );
}
```

Update `apps/mobile/src/app/mobile-screens/PostDetailScreen.tsx` so the route review copy matches the new line-first framing:

```tsx
<HeroCard
  title={post.title}
  subtitle={post.summary || 'No summary yet.'}
  eyebrow="Completed line"
  aside={<MetricPill value={post.pointCount} label="points" />}
/>
```

- [ ] **Step 4: Run full mobile verification**

Run:

```powershell
npm --workspace apps/mobile exec vitest run
npm --workspace apps/mobile exec tsc --noEmit
npm run build:mobile
```

Expected:

- All Vitest tests pass
- TypeScript succeeds
- Expo web export succeeds

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/mobile/src/app/AppRoot.tsx apps/mobile/src/app/mobile-screens/LineEditorScreen.tsx apps/mobile/src/app/mobile-screens/PostDetailScreen.tsx
  git commit -m "feat: add in-context line editor"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 7 complete - in-context line editor"
}
```

### Task 8: Run The End-To-End Scenario And Final Verification

**Files:**
- Modify: `README.md` if any verification note is still missing

- [ ] **Step 1: Run backend and frontend automated checks together**

Run:

```powershell
mvn -f services/api-java/pom.xml test
npm run build:api
npm --workspace apps/mobile exec vitest run
npm --workspace apps/mobile exec tsc --noEmit
npm run build:mobile
```

Expected:

- Every command completes successfully
- No compile or test failures remain

- [ ] **Step 2: Seed demo content and verify the approved Beijing scenario manually**

Run:

```powershell
curl -X POST http://localhost:3000/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
curl http://localhost:3000/api/v1/points/inbox -H "x-user-id: creator-li"
curl http://localhost:3000/api/v1/trips -H "x-user-id: creator-li"
```

Manual app verification:

1. Open the mobile app and confirm `Home` shows one quick check-in form, one continue-editing line, and inbox counts.
2. Save a new point from `Home` and confirm it appears in `Inbox`.
3. Open `Inbox`, create a line from a candidate group, and confirm the app opens the `LineEditor`.
4. In `LineEditor`, add one inline point, attach one inbox point, then detach one wrong point.
5. Confirm `Publish line` remains disabled until every point shows `READY_FOR_LINE`.
6. Publish the completed line and confirm it appears in the feed detail screen.

- [ ] **Step 3: Fix any last README gap exposed by the manual run**

If the manual run required an undocumented command, add that exact command to `README.md`. Use this exact section shape:

````markdown
## Point-first verification

1. Seed point-first demo data:

```bash
curl -X POST http://localhost:3000/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
```

2. Verify inbox data:

```bash
curl http://localhost:3000/api/v1/points/inbox -H "x-user-id: creator-li"
```
````

- [ ] **Step 4: Re-run the one command you changed documentation for**

Run:

```powershell
curl http://localhost:3000/api/v1/points/inbox -H "x-user-id: creator-li"
```

Expected:

- Response is valid JSON and matches the documented endpoint

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add README.md
  git commit -m "chore: verify point-first workflow end to end"
} else {
  Add-Content docs/superpowers/plans/point-to-line-checkpoints.log "Task 8 complete - end to end verification"
}
```

## Self-Review

### Spec coverage

- Point as the minimum unit with one image: covered by Task 2 point creation API and Task 7 quick check-in flow.
- Candidate lines generated from unassigned points: covered by Task 1 grouping helper and Task 2 inbox read model.
- Home, Inbox, and Line Editor IA: covered by Tasks 6 and 7.
- Inline point creation inside the line editor: covered by Task 7.
- Private review first and publish later: covered by Task 3 completion gate and Task 7 publish disable logic.
- Exception handling for missing time and place: covered by Task 1 point state helper, Task 2 inbox state output, and Task 7 completion gate.
- Beijing one-day benchmark scenario: covered by Task 4 seed data and Task 8 manual verification.

### Placeholder scan

- No `TBD`, `TODO`, or “implement later” markers remain.
- Every code-changing task includes concrete snippets, exact file paths, and exact commands.
- Every verification step names the expected outcome.

### Type consistency

- Backend uses `Trip` for lines, `TripPoint` for points, `PointStateSupport.PointState` for readiness, and `Trip.isCompleted` for completion gating.
- Frontend mirrors those names with `RecordPoint`, `CandidateLine`, `InboxResponse`, and `Trip.isCompleted`.
- The line editor gate uses the same ready-state semantics as the backend completion helper.
