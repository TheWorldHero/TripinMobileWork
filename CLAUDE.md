# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介 / Project Overview

**TripIn（旅途）** 是一款移动优先的旅行记录与分享应用。用户可以记录旅途路线、地点打卡、上传照片，在社交 Feed 中浏览他人分享的旅行帖子。

核心功能：
- **Record（记录）**：实时记录旅行轨迹，添加途经点（含图片、说明、地点绑定）
- **Home Feed（首页）**：Instagram 风格的旅行帖子流，支持点赞、收藏、评论
- **Studio（创作间）**：管理草稿和已发布的旅行，发布前可编辑路线和图文
- **Me（我）**：个人主页、关注列表、收藏帖子

技术栈：
- **移动端**：React Native 0.81 + Expo SDK 54，原生地图使用 AMap（高德地图）自定义 Expo 模块
- **后端**：Spring Boot 3.3.5 / JDK 21，plain JDBC（非 JPA），PostgreSQL + PostGIS
- **Web**：Next.js 15 + React 19，同时承载文件上传服务（`/api/uploads`）
- **认证**：Demo 级别（`x-user-id` 请求头），无 JWT

## Working principles

- Surface assumptions and tradeoffs before coding. If something is ambiguous, ask instead of guessing.
- Minimum code that solves the problem — no speculative abstractions, no error handling for impossible cases, no "improvements" to adjacent code.
- Touch only what the task requires. Match existing style. Only delete dead code that *your* change orphaned.
- For non-trivial tasks, state a short verifiable plan (what to do, how to check it) before executing.

## Repo layout (active vs legacy)

```
services/
  api-java/   ← ACTIVE backend (Spring Boot 3.3.5, JDK 21)
  api/        ← LEGACY NestJS service, reference only — do not change unless asked
apps/
  web/        ← Next.js 15 + React 19 (also hosts the /api/uploads file store)
  mobile/     ← Expo SDK 54 dev client. Most UI lives in src/app/AppRoot.tsx (single big file)
infra/
tools/        ← One-shot scripts (e.g. seed-feed.mjs)
docs/         ← Design specs and implementation plans
builds/       ← Local APK builds (gitignored)
```

The Node `services/api` directory is intentionally kept around but is not used at runtime. All API behavior comes from `services/api-java` (Spring Boot). Don't add features to the NestJS code.

## Common commands

All commands run from the workspace root unless stated.

```bash
# Infrastructure — bring up Postgres (:5433) + Redis
docker compose up -d
npm run db:init        # apply schema.sql to the running container

# Backend (Spring Boot, :3001)
npm run start:api      # mvn package then run the JAR (services/api-java/start-local.cmd)
npm run build:api      # mvn compile only
npm run package:api    # mvn package -DskipTests

# Java tests
mvn -f services/api-java/pom.xml -Dmaven.repo.local=.m2repo test
mvn -f services/api-java/pom.xml -Dmaven.repo.local=.m2repo test -Dtest=FeedBlendSupportTest

# Web (Next.js, :3000)
npm run dev:web
npm --workspace apps/web run build
npm --workspace apps/web run test

# Mobile (Expo, Metro :8081)
# 1. Start emulator: launch AVD "TripIn_Pixel_API_36" from Android Studio
# 2. Start Metro:
npm --workspace apps/mobile run start:dev-client   # do NOT use `start` (Expo Go lacks the native module)
# 3. Build debug APK (first time or after native changes):
cd apps/mobile/android && ./gradlew assembleDebug -x lint -x test
# 4. Install APK:
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Seed / reset demo data
curl -X POST http://localhost:3001/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
```

Postgres credentials: `tripin / tripin / tripin` on port 5433. Direct SQL:

```bash
docker exec -it tripin-postgres psql -U tripin -d tripin
```

## Backend architecture (api-java)

Layered Spring MVC under `com.tripin.api`:
- `controller/` — HTTP entry points, one controller per resource (Trips, Posts, Points, Lines, Routes, Feed, Interactions, Media, Places, Auth, Users, Health, DevSupport).
- `service/` — business logic, paired with each controller.
- `support/` — pure helper functions covered by unit tests in `src/test/java/.../support/` (no Spring context).
- `web/Requests.java` / `Responses.java` — request and response DTOs (records).
- `config/` — Jackson, JDBC, CORS.

Persistence is **plain JDBC + `JdbcTemplate`**, not JPA. Schema is in `src/main/resources/schema.sql`; the docker-compose mounts it as an init script and `npm run db:init` re-applies it. There is also some PostGIS usage (the `postgis/postgis:16-3.4` image is required, not vanilla Postgres).

**Auth is demo-grade**: every API request must carry `x-user-id: <userId>`. There is no JWT/session. `demo-user` and `creator-li` exist after seeding; `/auth/login` and `/auth/register` exist but are mostly used by the mobile login screen to switch the in-app user id. Don't add real auth without asking.

**AMap keys are optional everywhere.** When `AMAP_WEB_SERVICE_KEY` is empty, route refresh writes `provider=FALLBACK, strategy=straight_line` segments and `/places/status` returns `amapConfigured: false`. Web/mobile editor surfaces gracefully degrade — don't write code that hard-requires a key.

## Web app

Next.js App Router under `apps/web/app`. Two notable concerns beyond CRUD UI:

1. **`POST /api/uploads`** — the file store. Writes to `public/uploads/{timestamp}-{uuid}-{name}` and returns `{ storageKey: "/uploads/..." , url, mimeType, bytes }`. The mobile app uploads here, then calls the Java API's `/media/assets` + `/media/assets/{id}/mark-ready` to register the asset.
2. The web app and mobile app share no code — types are duplicated in `apps/web/src/types.ts` and `apps/mobile/src/types.ts`. If you change the API DTO shape, update both.

## Mobile app (the surface that gets the most edits)

- Entry: `apps/mobile/index.ts` → `src/app/AppRoot.tsx`. AppRoot is a deliberately monolithic single component holding all top-level state (feed, drafts, auth, UI mode). The `screens/` and `mobile-screens/` subfolders are partially-migrated remnants — prefer editing `AppRoot.tsx` unless the user asks otherwise.
- Native module: `apps/mobile/modules/tripin-amap` is a custom Expo native module for AMap, registered via `expo.autolinking.nativeModulesDir`. The wrapper that the JS uses is `src/native/TripinMapView.tsx`. **Because this native module isn't in Expo Go, the `start` script (`expo start --go`) will appear to work but won't load the map.** Use `start:dev-client` or run on an installed debug APK.
- API base URL is platform-conditional in `AppRoot.tsx`: `http://10.0.2.2:3001/api/v1` on Android (emulator host loopback), `http://localhost:3001/api/v1` elsewhere. Same pattern for the web upload host (`WEB_BASE_URL`). For a physical device or LDPlayer, edit this manually.
- `mediaUri()` in `AppRoot.tsx` is the storageKey resolution contract: storageKeys starting with `http`/`file:` are returned as-is; storageKeys starting with `/` are prefixed with `WEB_BASE_URL`. Anything else returns null. This is why seeded posts can use Unsplash CDN URLs directly as storageKeys without uploading.
- API client: `src/lib/api.ts` always sends `x-user-id` from the active session.

### Android-specific gotchas baked into the code

These are non-obvious and will bite if you forget:

- **`SafeAreaView` from `react-native` does not inset for the Android status bar** (it's effectively iOS-only). Absolutely-positioned overlays like `backButtonFloating` use `top: Platform.OS === 'android' ? 44 : 14` so they clear the status bar.
- **Touch hit-testing on Android does not respect `zIndex`/`elevation` for siblings** — only paint order does. Absolute-positioned overlays must be the *last* JSX sibling of their content (e.g. `BackButton` is rendered *after* the `ScrollView`, not before) or the underlying view captures the tap.
- **`BackHandler`**: AppRoot uses a single ref-based listener (`backNavRef`) registered once in a `useEffect` with empty deps. Adding the listener with state in deps re-creates it on every state change and can race; keep the ref pattern.
- The home feed and detail post layouts both go through `RouteMediaViewer` (image first, `RoutePreview` below). Image+point selection are bidirectionally bound: tapping a route point jumps to that point's first image; advancing into the next point's first image updates `selectedPointId`. Don't break that invariant.

## Mobile dev loop pitfalls (learned the hard way)

- **Start Metro from `apps/mobile`, not the workspace root.** If Metro's `projectRoot` ends up at the workspace root, the bundle 404s with `Unable to resolve module ./index from D:\…\TripinMobileWork/.`. Use the npm workspace scripts.
- **The bundle URL is `/.expo/.virtual-metro-entry.bundle?platform=android&dev=true`**, not `/index.bundle`. Use that path when curl-checking what Metro is actually serving.
- If hot reload looks stale: `adb shell am force-stop com.tripin.mobile` and re-launch. Don't `pm clear` (it wipes data and asks for permission re-grants).
- The dev client connects to Metro via WebSocket at `ws://10.0.2.2:8081/message`. "Couldn't connect to ws://…" warnings before bundle load are expected and self-heal.
- Android SDK and emulator paths: `D:\DevTools\Android\Sdk`, AVD home: `D:\DevTools\Android\Avd`, AVD name: `TripIn_Pixel_API_36`.

## Tests

- **Java**: `mvn -f services/api-java/pom.xml -Dmaven.repo.local=.m2repo test`. Pure-logic tests live in `support/` and don't need a DB; controller tests use MockMvc.
- **Web**: `vitest` (`apps/web/package.json` → `test`). Tests are colocated under `apps/web/src/**/*.test.ts`.
- **Mobile**: `vitest` is in `devDependencies` but there's no `test` script wired up; the two existing tests (`draft-point-state.test.ts`, `line-editor-state.test.ts`) are run with `npx vitest run <path>` from `apps/mobile`. There is no React Native UI test runner in this repo.

## When changing data

- The Java API is the source of truth for the feed; the mobile app does not persist anything client-side beyond React state.
- Clearing demo data without re-seeding requires SQL (delete order matters — see existing `tools/seed-feed.mjs` for the full Trip → Post → Point → Media → Place teardown sequence). The `/dev/seed` endpoint with `reset:true` resets *and* re-inserts the Beijing demo, which may not be what you want.
- To create fresh published posts programmatically: upload images → `POST /media/assets` → `POST /media/assets/{id}/mark-ready` → `POST /trips` → `POST /trips/{id}/points` → `POST /trips/{id}/publish`. `tools/seed-feed.mjs` is a working reference.
