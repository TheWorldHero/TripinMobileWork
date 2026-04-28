# TripIn Real-Map Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real-map TripIn product: a community-first mobile and web experience where users create draft points from media, confirm real places on a map, edit route-backed lines on mobile and web, and publish those lines into a mixed social feed.

**Architecture:** Keep the Spring Boot API as the system of record and geographic service layer, add a dedicated `apps/web` map experience for viewing and editing, and evolve the Expo mobile app from a Dev Client app with a local native AMap module. Persist standardized place, point, line, and route-segment data so route geometry is cached as product data rather than reconstructed ad hoc on clients.

**Tech Stack:** Spring Boot 3.3 + JDBC + PostgreSQL, Expo 54 / React Native 0.81 + TypeScript 5.9 + Expo Prebuild, local Expo native module wrapping AMap Android/iOS SDKs, Next.js 15 + React 19 + TypeScript, AMap JS API, Vitest, JUnit 5 / MockMvc.

---

## Pre-Flight Notes

- This plan supersedes `docs/superpowers/plans/2026-04-16-tripin-point-to-line-implementation.md`. Do not execute the older plan as the main roadmap.
- The scope spans three coupled subsystems: backend, web, and mobile native integration. Execute sequentially so each task leaves the repository in a runnable state.
- `d:\tripin` is still not a Git repository. Every commit step below includes a checkpoint-file fallback.
- iOS native compilation cannot be fully verified on Windows. The plan includes a Windows-safe config/prebuild validation step and a later manual Xcode verification note.
- Real-map work needs provider keys. Standardize on these environment variables:
  - Backend: `AMAP_WEB_SERVICE_KEY`
  - Mobile build-time: `AMAP_ANDROID_KEY`, `AMAP_IOS_KEY`
  - Web runtime: `NEXT_PUBLIC_AMAP_JS_KEY`

## File Map

### Workspace and app bootstrap

- Modify: `package.json`
- Modify: `.gitignore`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/next-env.d.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/.env.local.example`
- Create: `apps/mobile/app.config.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/.gitignore`
- Create: `apps/mobile/.env.example`
- Create: `apps/mobile/plugins/withTripinAmap.ts`

### Backend domain and geographic services

- Create: `services/api-java/src/main/resources/schema.sql`
- Modify: `services/api-java/src/main/resources/application.properties`
- Modify: `services/api/prisma/schema.prisma`
- Modify: `services/api/prisma/manual-init.sql`
- Create: `services/api-java/src/main/java/com/tripin/api/support/PointStateSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/FeedBlendSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/RouteSegmentFallbackSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/controller/PointsController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/controller/LinesController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/controller/RoutesController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/PointsService.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/LinesService.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/RoutesService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/PlacesService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/FeedService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/DevSupportService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/web/Requests.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/PointStateSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/FeedBlendSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/RouteSegmentFallbackSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/PointsControllerTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/LinesControllerTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/RoutesControllerTest.java`

### Web viewing and editing

- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/types.ts`
- Create: `apps/web/src/components/HomeFeed.tsx`
- Create: `apps/web/src/components/RouteMap.tsx`
- Create: `apps/web/src/components/LineEditorMap.tsx`
- Create: `apps/web/src/components/LineSidebar.tsx`
- Create: `apps/web/src/components/LocationBadge.tsx`
- Create: `apps/web/app/routes/[routeId]/page.tsx`
- Create: `apps/web/app/editor/[lineId]/page.tsx`
- Create: `apps/web/src/editor/line-editor-state.ts`
- Create: `apps/web/src/editor/line-editor-state.test.ts`

### Mobile native map and product flow

- Create: `apps/mobile/modules/tripin-amap/expo-module.config.json`
- Create: `apps/mobile/modules/tripin-amap/src/index.ts`
- Create: `apps/mobile/modules/tripin-amap/android/src/main/java/expo/modules/tripinamap/TripinAmapModule.kt`
- Create: `apps/mobile/modules/tripin-amap/android/src/main/java/expo/modules/tripinamap/TripinAmapView.kt`
- Create: `apps/mobile/modules/tripin-amap/ios/TripinAmapModule.swift`
- Create: `apps/mobile/modules/tripin-amap/ios/TripinAmapView.swift`
- Create: `apps/mobile/src/native/TripinMapView.tsx`
- Create: `apps/mobile/src/app/creation-sheet.ts`
- Create: `apps/mobile/src/app/draft-point-state.ts`
- Create: `apps/mobile/src/app/draft-point-state.test.ts`
- Create: `apps/mobile/src/app/line-editor-state.ts`
- Create: `apps/mobile/src/app/line-editor-state.test.ts`
- Create: `apps/mobile/src/app/mobile-screens/HomeScreen.tsx`
- Create: `apps/mobile/src/app/mobile-screens/LocationConfirmationScreen.tsx`
- Create: `apps/mobile/src/app/mobile-screens/LineEditorScreen.tsx`
- Modify: `apps/mobile/src/app/AppRoot.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/FeedScreen.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/PostDetailScreen.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/MyScreen.tsx`
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/src/types.ts`

### Verification and docs

- Modify: `README.md`
- Create: `docs/superpowers/plans/real-map-checkpoints.log` if `.git` remains absent

## Implementation Order

### Task 1: Bootstrap The Workspace For A Web App And Expo Prebuild

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/next-env.d.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/.env.local.example`
- Create: `apps/mobile/app.config.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/.gitignore`
- Create: `apps/mobile/.env.example`
- Create: `apps/mobile/plugins/withTripinAmap.ts`

- [ ] **Step 1: Write the failing workspace expectation down by checking that `apps/web` is missing and Expo still uses static `app.json`**

Run:

```powershell
Test-Path apps/web
Test-Path apps/mobile/app.config.ts
```

Expected:

- `False` for `apps/web`
- `False` for `apps/mobile/app.config.ts`

- [ ] **Step 2: Update the root workspace and scripts so web and prebuild commands exist**

Replace the relevant section in `package.json` with:

```json
{
  "workspaces": [
    "services/api",
    "apps/mobile",
    "apps/web"
  ],
  "scripts": {
    "dev:api": "mvn -f services/api-java/pom.xml -Dmaven.repo.local=.m2repo spring-boot:run",
    "dev:mobile": "npm --workspace apps/mobile run start",
    "dev:web": "npm --workspace apps/web run dev",
    "build:api": "mvn -f services/api-java/pom.xml -Dmaven.repo.local=.m2repo compile",
    "build:mobile": "npm --workspace apps/mobile run export:web",
    "build:web": "npm --workspace apps/web run build",
    "mobile:prebuild:android": "npm --workspace apps/mobile exec expo prebuild --platform android --no-install",
    "mobile:config": "npm --workspace apps/mobile exec expo config --type prebuild"
  }
}
```

Add this to `.gitignore`:

```gitignore
apps/web/.next/
apps/web/node_modules/
apps/mobile/android/
apps/mobile/ios/
.superpowers/
```

- [ ] **Step 3: Create the web workspace and replace static Expo config with build-time config**

Create `apps/web/package.json`:

```json
{
  "name": "web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "15.3.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "@types/react": "~19.1.0",
    "@types/react-dom": "~19.1.0",
    "typescript": "~5.9.2"
  }
}
```

Create `apps/web/app/layout.tsx`:

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'TripIn Web',
  description: 'Route viewing and editing for TripIn.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

Create `apps/web/app/page.tsx`:

```tsx
export default function Page() {
  return (
    <main style={{ padding: 32 }}>
      <h1>TripIn Web</h1>
      <p>Bootstrap screen for verifying the web workspace before feed and editor pages are wired.</p>
    </main>
  );
}
```

Create `apps/mobile/app.config.ts` and delete `apps/mobile/app.json` after the config is working:

```ts
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'TripIn',
  slug: 'tripin-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  plugins: ['./plugins/withTripinAmap'],
  ios: {
    bundleIdentifier: 'com.tripin.mobile',
    supportsTablet: true,
  },
  android: {
    package: 'com.tripin.mobile',
    edgeToEdgeEnabled: true,
  },
  extra: {
    amapAndroidKey: process.env.AMAP_ANDROID_KEY ?? '',
    amapIosKey: process.env.AMAP_IOS_KEY ?? '',
  },
};

export default config;
```

Create `apps/mobile/plugins/withTripinAmap.ts`:

```ts
import { ConfigPlugin, withAndroidManifest, withInfoPlist } from 'expo/config-plugins';

const withTripinAmap: ConfigPlugin = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    app?.['meta-data']?.push({
      $: {
        'android:name': 'com.amap.api.v2.apikey',
        'android:value': process.env.AMAP_ANDROID_KEY ?? '',
      },
    });
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.AMapApiKey = process.env.AMAP_IOS_KEY ?? '';
    mod.modResults.NSLocationWhenInUseUsageDescription =
      'TripIn needs your location to confirm real places on a map.';
    return mod;
  });

  return config;
};

export default withTripinAmap;
```

Create `apps/mobile/.env.example`:

```bash
AMAP_ANDROID_KEY=your_android_key
AMAP_IOS_KEY=your_ios_key
```

Create `apps/web/.env.local.example`:

```bash
NEXT_PUBLIC_AMAP_JS_KEY=your_web_js_key
```

- [ ] **Step 4: Install dependencies and validate both workspaces resolve**

Run:

```powershell
npm install
npm run build:web
npm run mobile:config
```

Expected:

- `npm install` completes without workspace errors
- `npm run build:web` completes with Next.js build success
- `npm run mobile:config` prints Expo prebuild config without plugin failures

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add package.json .gitignore apps/web apps/mobile/package.json apps/mobile/app.config.ts apps/mobile/.env.example apps/mobile/plugins/withTripinAmap.ts
  git commit -m "chore: bootstrap web workspace and expo prebuild config"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 1 complete - workspace bootstrap for web and expo prebuild"
}
```

### Task 2: Add Real-Map Domain Tables And Pure Backend Helpers

**Files:**
- Create: `services/api-java/src/main/resources/schema.sql`
- Modify: `services/api-java/src/main/resources/application.properties`
- Modify: `services/api/prisma/schema.prisma`
- Modify: `services/api/prisma/manual-init.sql`
- Create: `services/api-java/src/main/java/com/tripin/api/support/PointStateSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/FeedBlendSupport.java`
- Create: `services/api-java/src/main/java/com/tripin/api/support/RouteSegmentFallbackSupport.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/PointStateSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/FeedBlendSupportTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/support/RouteSegmentFallbackSupportTest.java`

- [ ] **Step 1: Write failing helper tests for point state, mixed feed blending, and route fallback**

Create `PointStateSupportTest.java`:

```java
package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class PointStateSupportTest {
  @Test
  void draftPointNeedsLocationWhenMediaExistsWithoutPlace() {
    var point = new PointStateSupport.PointSnapshot("point-1", 1, null, null, null, Instant.parse("2026-04-17T10:00:00Z"));
    assertEquals(PointStateSupport.PointState.NEEDS_LOCATION, PointStateSupport.from(point));
  }
}
```

Create `FeedBlendSupportTest.java`:

```java
package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class FeedBlendSupportTest {
  @Test
  void alternatesRecommendedAndFollowingItemsIntoOneFeed() {
    assertEquals(
        List.of("rec-1", "follow-1", "rec-2"),
        FeedBlendSupport.blend(List.of("rec-1", "rec-2"), List.of("follow-1"), 3));
  }
}
```

Create `RouteSegmentFallbackSupportTest.java`:

```java
package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class RouteSegmentFallbackSupportTest {
  @Test
  void producesStraightFallbackPolylineFromTwoPoints() {
    String polyline =
        RouteSegmentFallbackSupport.straightLine(
            List.of(new RouteSegmentFallbackSupport.RoutePoint(39.90, 116.39),
                    new RouteSegmentFallbackSupport.RoutePoint(39.91, 116.40)));
    assertTrue(polyline.contains("116.39,39.9"));
  }
}
```

- [ ] **Step 2: Run the tests and verify they fail because the support classes do not exist**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointStateSupportTest,FeedBlendSupportTest,RouteSegmentFallbackSupportTest"
```

Expected:

- `COMPILATION ERROR`
- Missing symbols for the three support classes

- [ ] **Step 3: Add schema bootstrap and helper implementations**

Append to `application.properties`:

```properties
spring.sql.init.mode=always
spring.sql.init.schema-locations=classpath:schema.sql
```

Create `schema.sql` with the core additions:

```sql
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "isCompleted" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "totalDistanceMeters" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "totalDurationSeconds" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Point" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "placeId" TEXT,
  "title" TEXT,
  "note" TEXT,
  "capturedAt" TIMESTAMP(3),
  "checkInAt" TIMESTAMP(3),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "mediaCount" INTEGER NOT NULL DEFAULT 0,
  "addressSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LinePoint" (
  "id" TEXT PRIMARY KEY,
  "lineId" TEXT NOT NULL,
  "pointId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "arrivalAt" TIMESTAMP(3),
  "departureAt" TIMESTAMP(3),
  "isLocked" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "RouteSegment" (
  "id" TEXT PRIMARY KEY,
  "lineId" TEXT NOT NULL,
  "fromPointId" TEXT NOT NULL,
  "toPointId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "distanceMeters" BIGINT NOT NULL DEFAULT 0,
  "durationSeconds" BIGINT NOT NULL DEFAULT 0,
  "polyline" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "rawRoutePayload" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Create `PointStateSupport.java`:

```java
package com.tripin.api.support;

import java.time.Instant;

public final class PointStateSupport {
  private PointStateSupport() {}

  public enum PointState { DRAFT, NEEDS_LOCATION, READY_FOR_LINE }

  public record PointSnapshot(
      String pointId,
      int mediaCount,
      String placeId,
      Double latitude,
      Double longitude,
      Instant checkInAt) {}

  public static PointState from(PointSnapshot point) {
    if (point.mediaCount() <= 0) {
      throw new IllegalArgumentException("point requires media");
    }
    boolean hasPlace = point.placeId() != null || (point.latitude() != null && point.longitude() != null);
    if (!hasPlace) {
      return PointState.NEEDS_LOCATION;
    }
    if (point.checkInAt() == null) {
      return PointState.DRAFT;
    }
    return PointState.READY_FOR_LINE;
  }
}
```

Create `FeedBlendSupport.java`:

```java
package com.tripin.api.support;

import java.util.ArrayList;
import java.util.List;

public final class FeedBlendSupport {
  private FeedBlendSupport() {}

  public static <T> List<T> blend(List<T> recommended, List<T> following, int limit) {
    List<T> result = new ArrayList<>();
    int recIndex = 0;
    int followIndex = 0;
    while (result.size() < limit && (recIndex < recommended.size() || followIndex < following.size())) {
      if (recIndex < recommended.size()) {
        result.add(recommended.get(recIndex++));
      }
      if (result.size() >= limit) {
        break;
      }
      if (followIndex < following.size()) {
        result.add(following.get(followIndex++));
      }
    }
    return result;
  }
}
```

Create `RouteSegmentFallbackSupport.java`:

```java
package com.tripin.api.support;

import java.util.List;
import java.util.stream.Collectors;

public final class RouteSegmentFallbackSupport {
  private RouteSegmentFallbackSupport() {}

  public record RoutePoint(Double latitude, Double longitude) {}

  public static String straightLine(List<RoutePoint> points) {
    return points.stream()
        .map(point -> point.longitude() + "," + point.latitude())
        .collect(Collectors.joining(";"));
  }
}
```

Update `schema.prisma` and `manual-init.sql` with matching `Point`, `LinePoint`, and `RouteSegment` models and columns. Keep `Trip` as the persisted line object.

- [ ] **Step 4: Run helper tests again and compile the backend**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointStateSupportTest,FeedBlendSupportTest,RouteSegmentFallbackSupportTest"
npm run build:api
```

Expected:

- Maven test run ends with `BUILD SUCCESS`
- `npm run build:api` ends with compile success

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add services/api-java/src/main/resources/application.properties services/api-java/src/main/resources/schema.sql services/api-java/src/main/java/com/tripin/api/support services/api-java/src/test/java/com/tripin/api/support services/api/prisma/schema.prisma services/api/prisma/manual-init.sql
  git commit -m "feat: add real-map domain tables and helpers"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 2 complete - backend domain tables and helpers"
}
```

### Task 3: Implement Point Draft, Inbox, And Line Editing APIs

**Files:**
- Create: `services/api-java/src/main/java/com/tripin/api/controller/PointsController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/controller/LinesController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/PointsService.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/LinesService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/web/Requests.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/PointsControllerTest.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/LinesControllerTest.java`

- [ ] **Step 1: Write failing controller contract tests for point draft creation, location confirmation, inbox, and line edits**

Create `PointsControllerTest.java`:

```java
@WebMvcTest(PointsController.class)
class PointsControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockBean private PointsService pointsService;
  @MockBean private CurrentUserResolver currentUserResolver;

  @Test
  void createsDraftPointFromMedia() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(pointsService.createDraftPoint(eq("demo-user"), any()))
        .thenReturn(Map.of("id", "point-1", "state", "NEEDS_LOCATION"));

    mockMvc.perform(post("/v1/points")
            .header("x-user-id", "demo-user")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
              {"mediaAssetIds":["media-1"],"capturedAt":"2026-04-17T10:00:00Z"}
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.state").value("NEEDS_LOCATION"));
  }
}
```

Create `LinesControllerTest.java`:

```java
@WebMvcTest(LinesController.class)
class LinesControllerTest {
  @Autowired private MockMvc mockMvc;
  @MockBean private LinesService linesService;
  @MockBean private CurrentUserResolver currentUserResolver;

  @Test
  void attachesPointsToLine() throws Exception {
    when(currentUserResolver.resolve("demo-user")).thenReturn("demo-user");
    when(linesService.attachPoints(eq("demo-user"), eq("line-1"), any()))
        .thenReturn(Map.of("id", "line-1", "pointCount", 2));

    mockMvc.perform(post("/v1/lines/line-1/attach-points")
            .header("x-user-id", "demo-user")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
              {"pointIds":["point-1","point-2"]}
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pointCount").value(2));
  }
}
```

- [ ] **Step 2: Run the controller tests and verify they fail because the controllers and request records do not exist**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointsControllerTest,LinesControllerTest"
```

Expected:

- `COMPILATION ERROR`
- Missing controller, service, or request types

- [ ] **Step 3: Add request models, controllers, and services for point/location/line workflows**

Add these records to `Requests.java`:

```java
public record CreatePointRequest(List<String> mediaAssetIds, String title, String note, String capturedAt) {}
public record ConfirmPointLocationRequest(String placeId, Double latitude, Double longitude, String checkInAt) {}
public record CreateLineRequest(String title, String summary, String visibility) {}
public record AttachPointsRequest(List<String> pointIds) {}
public record ReorderLinePointsRequest(List<String> pointIds) {}
```

Create `PointsController.java`:

```java
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
  public Map<String, Object> create(@RequestHeader(value = "x-user-id", required = false) String userId,
                                    @RequestBody CreatePointRequest request) {
    return pointsService.createDraftPoint(currentUserResolver.resolve(userId), request);
  }

  @PatchMapping("/{pointId}/location")
  public Map<String, Object> confirmLocation(@RequestHeader(value = "x-user-id", required = false) String userId,
                                             @PathVariable String pointId,
                                             @RequestBody ConfirmPointLocationRequest request) {
    return pointsService.confirmLocation(currentUserResolver.resolve(userId), pointId, request);
  }

  @GetMapping("/inbox")
  public Map<String, Object> inbox(@RequestHeader(value = "x-user-id", required = false) String userId) {
    return pointsService.getInbox(currentUserResolver.resolve(userId));
  }
}
```

Create `LinesController.java`:

```java
@RestController
@RequestMapping("/v1/lines")
public class LinesController {
  private final LinesService linesService;
  private final CurrentUserResolver currentUserResolver;

  public LinesController(LinesService linesService, CurrentUserResolver currentUserResolver) {
    this.linesService = linesService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping
  public Map<String, Object> create(@RequestHeader(value = "x-user-id", required = false) String userId,
                                    @RequestBody CreateLineRequest request) {
    return linesService.createLine(currentUserResolver.resolve(userId), request);
  }

  @PostMapping("/{lineId}/attach-points")
  public Map<String, Object> attach(@RequestHeader(value = "x-user-id", required = false) String userId,
                                    @PathVariable String lineId,
                                    @RequestBody AttachPointsRequest request) {
    return linesService.attachPoints(currentUserResolver.resolve(userId), lineId, request);
  }
}
```

Implement `PointsService` and `LinesService` around `JdbcTemplate` with these concrete method shapes:

```java
@Service
public class PointsService {
  private final JdbcTemplate jdbcTemplate;

  public Map<String, Object> createDraftPoint(String userId, CreatePointRequest request) {
    String pointId = UUID.randomUUID().toString();
    jdbcTemplate.update(
        "insert into \"Point\" (id, ownerId, capturedAt, mediaCount) values (?, ?, ?, ?)",
        pointId,
        userId,
        Instant.parse(request.capturedAt()),
        request.mediaAssetIds().size());
    return Map.of("id", pointId, "state", "NEEDS_LOCATION");
  }

  public Map<String, Object> confirmLocation(String userId, String pointId, ConfirmPointLocationRequest request) {
    jdbcTemplate.update(
        "update \"Point\" set placeId = ?, latitude = ?, longitude = ?, checkInAt = ? where id = ? and ownerId = ?",
        request.placeId(),
        request.latitude(),
        request.longitude(),
        Instant.parse(request.checkInAt()),
        pointId,
        userId);
    return Map.of("id", pointId, "state", "READY_FOR_LINE");
  }
}
```

```java
@Service
public class LinesService {
  private final JdbcTemplate jdbcTemplate;

  public Map<String, Object> createLine(String userId, CreateLineRequest request) {
    String lineId = UUID.randomUUID().toString();
    jdbcTemplate.update(
        "insert into \"Trip\" (id, ownerId, title, summary, visibility) values (?, ?, ?, ?, cast(? as \"Visibility\"))",
        lineId,
        userId,
        request.title(),
        request.summary(),
        request.visibility() == null ? "PRIVATE" : request.visibility());
    return Map.of("id", lineId, "title", request.title(), "pointCount", 0);
  }

  public Map<String, Object> attachPoints(String userId, String lineId, AttachPointsRequest request) {
    for (int index = 0; index < request.pointIds().size(); index++) {
      jdbcTemplate.update(
          "insert into \"LinePoint\" (id, lineId, pointId, sequence) values (?, ?, ?, ?)",
          UUID.randomUUID().toString(),
          lineId,
          request.pointIds().get(index),
          index);
    }
    return Map.of("id", lineId, "pointCount", request.pointIds().size());
  }
}
```

- [ ] **Step 4: Run the controller tests and a focused backend compile**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=PointsControllerTest,LinesControllerTest"
npm run build:api
```

Expected:

- Controller tests pass
- Backend compile succeeds with the new controllers and services

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add services/api-java/src/main/java/com/tripin/api/controller/PointsController.java services/api-java/src/main/java/com/tripin/api/controller/LinesController.java services/api-java/src/main/java/com/tripin/api/service/PointsService.java services/api-java/src/main/java/com/tripin/api/service/LinesService.java services/api-java/src/main/java/com/tripin/api/web/Requests.java services/api-java/src/test/java/com/tripin/api/controller/PointsControllerTest.java services/api-java/src/test/java/com/tripin/api/controller/LinesControllerTest.java
  git commit -m "feat: add point draft and line editing apis"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 3 complete - point and line editing APIs"
}
```

### Task 4: Add Route Planning Endpoints, Place Confirmation Behavior, And Mixed Feed Ranking

**Files:**
- Create: `services/api-java/src/main/java/com/tripin/api/controller/RoutesController.java`
- Create: `services/api-java/src/main/java/com/tripin/api/service/RoutesService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/PlacesService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/FeedService.java`
- Modify: `services/api-java/src/main/java/com/tripin/api/service/DevSupportService.java`
- Create: `services/api-java/src/test/java/com/tripin/api/controller/RoutesControllerTest.java`

- [ ] **Step 1: Write the failing route-planning controller test**

Create `RoutesControllerTest.java`:

```java
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

    mockMvc.perform(post("/v1/routes/lines/line-1/refresh").header("x-user-id", "demo-user"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.segmentsUpdated").value(2));
  }
}
```

- [ ] **Step 2: Run the test to confirm the route controller is still missing**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=RoutesControllerTest"
```

Expected:

- `COMPILATION ERROR` for missing route controller/service

- [ ] **Step 3: Implement route refresh, real-place confirmation, and mixed feed blending**

Create `RoutesController.java`:

```java
@RestController
@RequestMapping("/v1/routes")
public class RoutesController {
  private final RoutesService routesService;
  private final CurrentUserResolver currentUserResolver;

  public RoutesController(RoutesService routesService, CurrentUserResolver currentUserResolver) {
    this.routesService = routesService;
    this.currentUserResolver = currentUserResolver;
  }

  @PostMapping("/lines/{lineId}/refresh")
  public Map<String, Object> refresh(@RequestHeader(value = "x-user-id", required = false) String userId,
                                     @PathVariable String lineId) {
    return routesService.refreshLineRoutes(currentUserResolver.resolve(userId), lineId);
  }
}
```

In `RoutesService`, implement:

```java
public Map<String, Object> refreshLineRoutes(String userId, String lineId) {
  List<Map<String, Object>> points = loadOrderedLinePoints(userId, lineId);
  deleteExistingSegments(lineId);
  long totalDistance = 0L;
  long totalDuration = 0L;

  for (int index = 0; index < points.size() - 1; index++) {
    Map<String, Object> from = points.get(index);
    Map<String, Object> to = points.get(index + 1);
    PlannedSegment segment = planOrFallback(from, to);
    saveSegment(lineId, segment);
    totalDistance += segment.distanceMeters();
    totalDuration += segment.durationSeconds();
  }

  jdbcTemplate.update(
      "update \"Trip\" set totalDistanceMeters = ?, totalDurationSeconds = ? where id = ?",
      totalDistance,
      totalDuration,
      lineId);
  return Map.of("lineId", lineId, "segmentsUpdated", Math.max(points.size() - 1, 0));
}
```

Extend `PlacesService.reverseGeocode` to return a normalized recommended place shape:

```java
response.put("recommendedPlace", Map.of(
    "provider", "AMAP",
    "providerId", nullableText(poi.path("id")),
    "name", nullableText(poi.path("name")),
    "formattedAddress", nullableText(regeocode.path("formatted_address")),
    "latitude", latitude,
    "longitude", longitude,
    "source", "amap"));
```

Modify `FeedService` so `GET /v1/feed` becomes a mixed feed backed by `FeedBlendSupport`:

```java
List<Map<String, Object>> recommended = loadRecommendedPosts(userId, safeLimit);
List<Map<String, Object>> following = loadFollowingPosts(userId, safeLimit);
List<Map<String, Object>> items = FeedBlendSupport.blend(recommended, following, safeLimit);
return Map.of("items", items, "mode", "mixed");
```

Update `DevSupportService` to seed:

- one active editing line
- one inbox point with media
- one published line with route segments
- one or more places with AMap-like provider ids

- [ ] **Step 4: Run route/feed focused verification**

Run:

```powershell
mvn -f services/api-java/pom.xml test "-Dtest=RoutesControllerTest,PointsControllerTest,LinesControllerTest"
npm run build:api
```

Expected:

- All named controller tests pass
- Backend compile succeeds after route refresh logic and feed changes

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add services/api-java/src/main/java/com/tripin/api/controller/RoutesController.java services/api-java/src/main/java/com/tripin/api/service/RoutesService.java services/api-java/src/main/java/com/tripin/api/service/PlacesService.java services/api-java/src/main/java/com/tripin/api/service/FeedService.java services/api-java/src/main/java/com/tripin/api/service/DevSupportService.java services/api-java/src/test/java/com/tripin/api/controller/RoutesControllerTest.java
  git commit -m "feat: add route refresh and mixed feed backend"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 4 complete - route refresh, place confirmation, and mixed feed"
}
```

### Task 5: Build The Web Home Feed And Route Detail Surfaces

**Files:**
- Create: `apps/web/src/types.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/components/HomeFeed.tsx`
- Create: `apps/web/src/components/RouteMap.tsx`
- Create: `apps/web/src/components/LocationBadge.tsx`
- Create: `apps/web/app/routes/[routeId]/page.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Write a failing web state test for line ordering and build failure for missing web data layer**

Create `apps/web/src/editor/line-editor-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reorderPointIds } from './line-editor-state';

describe('reorderPointIds', () => {
  it('moves the dragged point to a new index', () => {
    expect(reorderPointIds(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
  });
});
```

Run:

```powershell
npm --workspace apps/web exec vitest run
```

Expected:

- Failure because Vitest and the editor state file are not installed or defined yet

- [ ] **Step 2: Add the web types and API client around the new backend endpoints**

Create `apps/web/src/types.ts`:

```ts
export interface FeedItem {
  id: string;
  title: string;
  summary?: string | null;
  pointCount: number;
  publishedAt: string;
  author: { id: string; displayName: string };
  routePreview?: { latitude: number; longitude: number }[] | null;
}

export interface LineDetail {
  id: string;
  title: string;
  summary?: string | null;
  points: Array<{ id: string; title?: string | null; latitude?: number | null; longitude?: number | null }>;
  routeSegments: Array<{ id: string; polyline: string }>;
}
```

Create `apps/web/src/lib/api.ts`:

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

export const api = {
  getFeed: () => request<{ items: import('../types').FeedItem[] }>('/feed'),
  getLine: (lineId: string) => request<import('../types').LineDetail>(`/lines/${lineId}`),
};
```

- [ ] **Step 3: Implement the home feed and route detail pages**

Create `HomeFeed.tsx`:

```tsx
import Link from 'next/link';
import type { FeedItem } from '../types';

export function HomeFeed({ items }: { items: FeedItem[] }) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      {items.map((item) => (
        <article key={item.id} style={{ padding: 20, borderRadius: 20, background: '#fffaf2' }}>
          <h2>{item.title}</h2>
          <p>{item.summary ?? 'No summary yet.'}</p>
          <Link href={`/routes/${item.id}`}>Open route</Link>
        </article>
      ))}
    </section>
  );
}
```

Create `RouteMap.tsx` as a client placeholder that later receives AMap JS in Task 6:

```tsx
'use client';

export function RouteMap({ title }: { title: string }) {
  return (
    <div style={{ minHeight: 360, borderRadius: 24, background: 'linear-gradient(180deg, #f6ecd9, #efe3cf)' }}>
      <p style={{ padding: 24 }}>Map placeholder for {title}</p>
    </div>
  );
}
```

Modify `app/page.tsx`:

```tsx
import { api } from '../src/lib/api';
import { HomeFeed } from '../src/components/HomeFeed';

export default async function Page() {
  const feed = await api.getFeed();
  return (
    <main style={{ padding: 32 }}>
      <h1>TripIn</h1>
      <HomeFeed items={feed.items} />
    </main>
  );
}
```

Create `app/routes/[routeId]/page.tsx`:

```tsx
import { api } from '../../../src/lib/api';
import { RouteMap } from '../../../src/components/RouteMap';

export default async function RoutePage({ params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = await params;
  const line = await api.getLine(routeId);
  return (
    <main style={{ padding: 32, display: 'grid', gap: 24 }}>
      <h1>{line.title}</h1>
      <RouteMap title={line.title} />
      <p>{line.summary ?? 'No summary yet.'}</p>
    </main>
  );
}
```

- [ ] **Step 4: Install web test tooling and verify web build + tests**

Run:

```powershell
npm --workspace apps/web install -D vitest
npm --workspace apps/web exec vitest run
npm run build:web
```

Expected:

- Vitest passes for the current test set
- Next.js build succeeds with the feed and route pages

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/web
  git commit -m "feat: add web feed and route detail surfaces"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 5 complete - web feed and route detail"
}
```

### Task 6: Add The Web Map Editor With AMap JS API

**Files:**
- Create: `apps/web/src/components/LineEditorMap.tsx`
- Create: `apps/web/src/components/LineSidebar.tsx`
- Create: `apps/web/src/editor/line-editor-state.ts`
- Create: `apps/web/app/editor/[lineId]/page.tsx`
- Modify: `apps/web/src/components/RouteMap.tsx`
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Write the failing line editor state test**

Create `apps/web/src/editor/line-editor-state.ts` usage test:

```ts
import { describe, expect, it } from 'vitest';
import { buildRefreshPlan } from './line-editor-state';

describe('buildRefreshPlan', () => {
  it('marks neighbor segments dirty after a reorder', () => {
    expect(buildRefreshPlan(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual(['c->a', 'a->b']);
  });
});
```

- [ ] **Step 2: Run the test and confirm the editor state helper is incomplete**

Run:

```powershell
npm --workspace apps/web exec vitest run
```

Expected:

- Failure for missing `buildRefreshPlan`

- [ ] **Step 3: Implement the web editor state, JS API loader, and editor page**

Create `line-editor-state.ts`:

```ts
export function reorderPointIds(pointIds: string[], draggedId: string, targetIndex: number) {
  const next = pointIds.filter((id) => id !== draggedId);
  next.splice(targetIndex, 0, draggedId);
  return next;
}

export function buildRefreshPlan(previousIds: string[], nextIds: string[]) {
  if (previousIds.join('|') === nextIds.join('|')) return [];
  return nextIds.slice(0, -1).map((id, index) => `${id}->${nextIds[index + 1]}`);
}
```

Create `LineEditorMap.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';

export function LineEditorMap({ amapKey }: { amapKey: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !amapKey) return;
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`;
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [amapKey]);

  return <div ref={containerRef} style={{ minHeight: 520, borderRadius: 24, background: '#efe3cf' }} />;
}
```

Create `LineSidebar.tsx`:

```tsx
'use client';

export function LineSidebar({ pointIds }: { pointIds: string[] }) {
  return (
    <aside style={{ display: 'grid', gap: 12 }}>
      {pointIds.map((id, index) => (
        <div key={id} style={{ padding: 12, borderRadius: 16, background: '#fffaf2' }}>
          <strong>{index + 1}.</strong> {id}
        </div>
      ))}
    </aside>
  );
}
```

Create `app/editor/[lineId]/page.tsx`:

```tsx
import { api } from '../../../src/lib/api';
import { LineEditorMap } from '../../../src/components/LineEditorMap';
import { LineSidebar } from '../../../src/components/LineSidebar';

export default async function EditorPage({ params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const line = await api.getLine(lineId);
  return (
    <main style={{ padding: 32, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <LineSidebar pointIds={line.points.map((point) => point.id)} />
      <LineEditorMap amapKey={process.env.NEXT_PUBLIC_AMAP_JS_KEY ?? ''} />
    </main>
  );
}
```

Extend `api.ts` with:

```ts
refreshRoutes: (lineId: string) =>
  request(`/routes/lines/${lineId}/refresh`, { method: 'POST' }),
```

- [ ] **Step 4: Run web tests and build again**

Run:

```powershell
npm --workspace apps/web exec vitest run
npm run build:web
```

Expected:

- Vitest passes
- Web build succeeds with editor route included

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/web
  git commit -m "feat: add web amap editor"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 6 complete - web amap editor"
}
```

### Task 7: Add Expo Dev Client And The Native AMap Module Foundation

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/modules/tripin-amap/expo-module.config.json`
- Create: `apps/mobile/modules/tripin-amap/src/index.ts`
- Create: `apps/mobile/modules/tripin-amap/android/src/main/java/expo/modules/tripinamap/TripinAmapModule.kt`
- Create: `apps/mobile/modules/tripin-amap/android/src/main/java/expo/modules/tripinamap/TripinAmapView.kt`
- Create: `apps/mobile/modules/tripin-amap/ios/TripinAmapModule.swift`
- Create: `apps/mobile/modules/tripin-amap/ios/TripinAmapView.swift`
- Create: `apps/mobile/src/native/TripinMapView.tsx`

- [ ] **Step 1: Write the failing mobile typecheck for a missing native map wrapper**

Create `apps/mobile/src/native/TripinMapView.tsx` import usage later in AppRoot, then run:

```powershell
npm --workspace apps/mobile exec tsc --noEmit
```

Expected:

- Type failure because the wrapper or module types are still missing

- [ ] **Step 2: Add Expo native module dependencies and prebuild-friendly scripts**

Update `apps/mobile/package.json`:

```json
{
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "export:web": "expo export --platform web"
  },
  "dependencies": {
    "expo-location": "~19.0.7",
    "expo-modules-core": "~2.5.0"
  }
}
```

- [ ] **Step 3: Create the local Expo module and JS wrapper**

Create `expo-module.config.json`:

```json
{
  "platforms": ["apple", "android"],
  "android": {
    "modules": ["expo.modules.tripinamap.TripinAmapModule"]
  },
  "apple": {
    "modules": ["TripinAmapModule"]
  }
}
```

Create `src/index.ts`:

```ts
import { requireNativeView } from 'expo';

export type TripinMapMarker = { id: string; latitude: number; longitude: number };
export type TripinMapPolyline = { id: string; coordinates: Array<{ latitude: number; longitude: number }> };

export default requireNativeView('TripinAmapView');
```

Create `TripinAmapModule.kt`:

```kotlin
package expo.modules.tripinamap

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TripinAmapModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TripinAmap")
  }
}
```

Create `TripinAmapView.kt`:

```kotlin
package expo.modules.tripinamap

import android.content.Context
import com.amap.api.maps.MapView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class TripinAmapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val mapView = MapView(context)

  init {
    addView(mapView)
    mapView.onCreate(null)
  }
}
```

Create `TripinAmapView.swift`:

```swift
import ExpoModulesCore
import MAMapKit

final class TripinAmapView: ExpoView {
  private let mapView = MAMapView(frame: .zero)

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addSubview(mapView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    mapView.frame = bounds
  }
}
```

Create `apps/mobile/src/native/TripinMapView.tsx`:

```tsx
import TripinAmapView from '../../modules/tripin-amap/src';

export interface TripinMapViewProps {
  style?: object;
  markers?: Array<{ id: string; latitude: number; longitude: number }>;
  polylines?: Array<{ id: string; coordinates: Array<{ latitude: number; longitude: number }> }>;
}

export function TripinMapView(props: TripinMapViewProps) {
  return <TripinAmapView {...props} />;
}
```

- [ ] **Step 4: Run mobile config and Android prebuild validation**

Run:

```powershell
npm install
npm run mobile:config
npm run mobile:prebuild:android
npm --workspace apps/mobile exec tsc --noEmit
```

Expected:

- Expo config succeeds
- Android prebuild generates native files without plugin crashes
- TypeScript succeeds with the JS wrapper

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/mobile/package.json apps/mobile/modules/tripin-amap apps/mobile/src/native/TripinMapView.tsx
  git commit -m "feat: add native amap module foundation"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 7 complete - native amap module foundation"
}
```

### Task 8: Rework Mobile Into A Community-First Home With A Creation Action Sheet

**Files:**
- Create: `apps/mobile/src/app/creation-sheet.ts`
- Create: `apps/mobile/src/app/draft-point-state.ts`
- Create: `apps/mobile/src/app/draft-point-state.test.ts`
- Create: `apps/mobile/src/app/mobile-screens/HomeScreen.tsx`
- Modify: `apps/mobile/src/app/AppRoot.tsx`
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/src/types.ts`
- Modify: `apps/mobile/src/app/mobile-screens/FeedScreen.tsx`

- [ ] **Step 1: Write the failing draft point state test**

Create `draft-point-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createDraftPointAfterMedia } from './draft-point-state';

describe('createDraftPointAfterMedia', () => {
  it('creates a needs-location draft after media selection', () => {
    expect(createDraftPointAfterMedia('media-1').state).toBe('NEEDS_LOCATION');
  });
});
```

- [ ] **Step 2: Run the test and confirm the helper does not exist yet**

Run:

```powershell
npm --workspace apps/mobile exec vitest run
```

Expected:

- Failure for missing helper or missing Vitest dependency

- [ ] **Step 3: Add mobile draft state, action sheet helpers, and feed-first home wiring**

Create `draft-point-state.ts`:

```ts
export function createDraftPointAfterMedia(mediaAssetId: string) {
  return {
    mediaAssetIds: [mediaAssetId],
    state: 'NEEDS_LOCATION' as const,
  };
}
```

Create `creation-sheet.ts`:

```ts
export const CREATION_ACTIONS = [
  { key: 'camera', label: '拍照' },
  { key: 'album', label: '相册导入' },
  { key: 'backfill-point', label: '补录一个点' },
  { key: 'resume-line', label: '继续编辑一条线' },
] as const;
```

Add these mobile types:

```ts
export interface DraftPoint {
  id: string;
  mediaAssetIds: string[];
  state: 'DRAFT' | 'NEEDS_LOCATION' | 'READY_FOR_LINE';
}
```

Extend `api.ts` with:

```ts
createPoint(dto: { mediaAssetIds: string[]; title?: string; note?: string; capturedAt?: string }) {
  return request('/points', { method: 'POST', body: JSON.stringify(dto) });
}

getInbox() {
  return request('/points/inbox');
}
```

Create `HomeScreen.tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native';
import { Button, HeroCard, SectionCard, uiStyles } from '../../components/MobileUi';

export function HomeScreen({ onOpenComposer }: { onOpenComposer: () => void }) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard title="TripIn" subtitle="Routes worth replaying and sharing." />
      <SectionCard title="Community" subtitle="Recommended and following routes live here first.">
        <Text style={uiStyles.cardBodyText}>This screen stays social-first.</Text>
      </SectionCard>
      <View style={{ paddingBottom: 32 }}>
        <Button label="Open creation sheet" onPress={onOpenComposer} />
      </View>
    </ScrollView>
  );
}
```

In `AppRoot.tsx`:

- rename the default tab from `studio` to `home`
- make the home feed the default selected tab
- add state for whether the creation sheet is open
- keep feed data visible even before creation starts

- [ ] **Step 4: Run mobile tests and typecheck**

Run:

```powershell
npm --workspace apps/mobile install -D vitest
npm --workspace apps/mobile exec vitest run
npm --workspace apps/mobile exec tsc --noEmit
```

Expected:

- Vitest passes
- TypeScript succeeds

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/mobile/src/app apps/mobile/src/lib/api.ts apps/mobile/src/types.ts apps/mobile/src/app/mobile-screens/HomeScreen.tsx
  git commit -m "feat: make mobile home community first"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 8 complete - mobile community-first home and action sheet"
}
```

### Task 9: Add Mobile Location Confirmation And The Map-Driven Line Editor

**Files:**
- Create: `apps/mobile/src/app/line-editor-state.ts`
- Create: `apps/mobile/src/app/line-editor-state.test.ts`
- Create: `apps/mobile/src/app/mobile-screens/LocationConfirmationScreen.tsx`
- Create: `apps/mobile/src/app/mobile-screens/LineEditorScreen.tsx`
- Modify: `apps/mobile/src/app/AppRoot.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/PostDetailScreen.tsx`
- Modify: `apps/mobile/src/app/mobile-screens/MyScreen.tsx`
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/src/types.ts`

- [ ] **Step 1: Write the failing line editor state test**

Create `line-editor-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canPublishLine } from './line-editor-state';

describe('canPublishLine', () => {
  it('requires every point to be ready', () => {
    expect(canPublishLine([{ id: 'p1', state: 'READY_FOR_LINE' }, { id: 'p2', state: 'NEEDS_LOCATION' }])).toBe(false);
  });
});
```

- [ ] **Step 2: Run mobile tests and confirm the editor helper is still missing**

Run:

```powershell
npm --workspace apps/mobile exec vitest run
```

Expected:

- Failure for missing `canPublishLine`

- [ ] **Step 3: Implement the location confirmation page, line editor, and map-backed flows**

Create `line-editor-state.ts`:

```ts
export function canPublishLine(points: Array<{ state: string }>) {
  return points.length > 0 && points.every((point) => point.state === 'READY_FOR_LINE');
}
```

Extend `api.ts` with:

```ts
confirmPointLocation(pointId: string, dto: { placeId?: string; latitude?: number; longitude?: number; checkInAt?: string }) {
  return request(`/points/${pointId}/location`, { method: 'PATCH', body: JSON.stringify(dto) });
}

createLine(dto: { title: string; summary?: string; visibility?: Visibility }) {
  return request('/lines', { method: 'POST', body: JSON.stringify(dto) });
}

attachPoints(lineId: string, pointIds: string[]) {
  return request(`/lines/${lineId}/attach-points`, { method: 'POST', body: JSON.stringify({ pointIds }) });
}

refreshLineRoutes(lineId: string) {
  return request(`/routes/lines/${lineId}/refresh`, { method: 'POST', body: JSON.stringify({}) });
}
```

Create `LocationConfirmationScreen.tsx`:

```tsx
import { ScrollView, Text } from 'react-native';
import { Button, HeroCard, SectionCard, uiStyles } from '../../components/MobileUi';
import { TripinMapView } from '../../native/TripinMapView';

export function LocationConfirmationScreen({ onUseCurrentLocation, onConfirm }: { onUseCurrentLocation: () => void; onConfirm: () => void; }) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard title="确认位置" subtitle="地图只在这个任务页出现，不占据首页。" />
      <TripinMapView style={{ height: 320, borderRadius: 24 }} />
      <SectionCard title="位置建议" subtitle="优先 EXIF，其次当前定位，再给附近 POI。">
        <Text style={uiStyles.cardBodyText}>Show recommended place cards here.</Text>
        <Button label="Use current location" onPress={onUseCurrentLocation} />
        <Button label="Confirm place" variant="secondary" onPress={onConfirm} />
      </SectionCard>
    </ScrollView>
  );
}
```

Create `LineEditorScreen.tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native';
import { Button, HeroCard, SectionCard, uiStyles } from '../../components/MobileUi';
import { TripinMapView } from '../../native/TripinMapView';
import { canPublishLine } from '../line-editor-state';

export function LineEditorScreen({ line, onRefreshRoutes, onPublish }: { line: any; onRefreshRoutes: () => void; onPublish: () => void; }) {
  const ready = canPublishLine(line.points);
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard title={line.title} subtitle="Map-driven editing only appears once the user enters line editing." />
      <TripinMapView style={{ height: 360, borderRadius: 24 }} />
      <SectionCard title="Route controls" subtitle="Reorder points, inspect overlays, and refresh route segments.">
        <Button label="Refresh route" onPress={onRefreshRoutes} />
        <Button label="Publish line" onPress={onPublish} disabled={!ready} />
      </SectionCard>
      <View>
        {line.points.map((point: any) => (
          <Text key={point.id} style={uiStyles.cardBodyText}>{point.id} - {point.state}</Text>
        ))}
      </View>
    </ScrollView>
  );
}
```

In `AppRoot.tsx` wire these states:

- after creating a draft point, navigate into `LocationConfirmationScreen`
- on successful location confirmation, show the light choice: attach to active line or send to inbox
- when opening an active line, render `LineEditorScreen`
- keep `FeedScreen` as the first landing surface

- [ ] **Step 4: Run mobile verification including prebuild config**

Run:

```powershell
npm --workspace apps/mobile exec vitest run
npm --workspace apps/mobile exec tsc --noEmit
npm run mobile:config
```

Expected:

- Vitest passes
- TypeScript succeeds
- Expo config still resolves after adding the new map-heavy screens

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add apps/mobile/src/app apps/mobile/src/lib/api.ts apps/mobile/src/types.ts apps/mobile/src/app/mobile-screens/LocationConfirmationScreen.tsx apps/mobile/src/app/mobile-screens/LineEditorScreen.tsx
  git commit -m "feat: add map-driven mobile point confirmation and line editing"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 9 complete - mobile location confirmation and line editor"
}
```

### Task 10: Verify End-To-End Behavior And Update Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the full automated verification set**

Run:

```powershell
mvn -f services/api-java/pom.xml test
npm run build:api
npm run build:web
npm --workspace apps/mobile exec vitest run
npm --workspace apps/mobile exec tsc --noEmit
npm run mobile:config
```

Expected:

- Backend tests pass
- API compile succeeds
- Web build succeeds
- Mobile tests and typecheck succeed
- Expo config succeeds

- [ ] **Step 2: Seed demo data and verify the approved product flow manually**

Run:

```powershell
curl -X POST http://localhost:3000/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
curl http://localhost:3000/api/v1/feed
curl http://localhost:3000/api/v1/points/inbox -H "x-user-id: creator-li"
curl http://localhost:3000/api/v1/lines -H "x-user-id: creator-li"
```

Manual verification:

1. Open mobile and confirm the first screen is the mixed community feed.
2. Tap the center action button and verify the creation sheet shows the four approved actions.
3. Select a photo and confirm a draft point is created before location confirmation.
4. On the location confirmation screen, verify a map is shown with EXIF/current-location/nearby suggestions.
5. Choose whether the point joins the active line or inbox.
6. Open the line editor on mobile and verify route refresh works without returning to the home screen.
7. Open the same line on web and verify the editor reflects the persisted point order and route segments.
8. Publish the line and confirm it appears in the feed and route detail pages.

- [ ] **Step 3: Update README with the real-map setup and verification path**

Add these sections to `README.md`:

````markdown
## Real-map environment

1. Backend:

```bash
set AMAP_WEB_SERVICE_KEY=your_key
```

2. Mobile:

```bash
copy apps\mobile\.env.example apps\mobile\.env
```

3. Web:

```bash
copy apps\web\.env.local.example apps\web\.env.local
```

## Real-map verification

1. Build web:

```bash
npm run build:web
```

2. Validate Expo prebuild config:

```bash
npm run mobile:config
```
````

- [ ] **Step 4: Re-run the two commands you documented**

Run:

```powershell
npm run build:web
npm run mobile:config
```

Expected:

- Both commands succeed exactly as documented

- [ ] **Step 5: Commit or checkpoint**

Run:

```powershell
if (Test-Path .git) {
  git add README.md
  git commit -m "chore: document real-map setup and verification"
} else {
  Add-Content docs/superpowers/plans/real-map-checkpoints.log "Task 10 complete - verification and docs"
}
```

## Self-Review

### Spec coverage

- Community-first home feed: covered by Tasks 4, 5, and 8.
- Creation action sheet with four actions: covered by Task 8.
- Draft point creation before location confirmation: covered by Tasks 3 and 8.
- Map appears only for location confirmation and line editing: covered by Tasks 7 and 9.
- Web line editing: covered by Tasks 5 and 6.
- AMap on mobile, web, and backend: covered by Tasks 1, 4, 6, and 7.
- Real route segment persistence and fallback behavior: covered by Tasks 2, 3, and 4.
- Mixed recommendation/following feed: covered by Task 4.
- Lifestyle-oriented map product foundation: covered by Tasks 6, 7, and 9 through overlay-first map components.

### Placeholder scan

- No `TBD`, `TODO`, or "implement later" markers remain.
- Every code-changing task includes concrete file paths, commands, and at least one code snippet that defines the API or component boundary.
- Commit fallback is defined for the current non-git workspace.

### Type consistency

- Backend naming is consistent around `Point`, `Line`, and `RouteSegment`.
- Mobile and web clients both consume `/v1/points`, `/v1/lines`, and `/v1/routes`.
- `READY_FOR_LINE` and `NEEDS_LOCATION` are used consistently across backend helpers and client publish gating.
- The product flow consistently uses the same sequence: feed -> creation sheet -> draft point -> location confirmation -> inbox/active line -> line editor -> publish.
