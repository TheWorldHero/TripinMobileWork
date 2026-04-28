# TripIn Local MVP

TripIn is a community-first life and travel timeline product with real-map editing surfaces. This workspace now contains a locally runnable MVP with:

- mixed feed and route detail surfaces
- point inbox and line editing flows
- real-map route refresh with AMap-backed or fallback geometry
- Web route studio with optional AMap JS integration
- Expo mobile app with native AMap module scaffolding
- publishing, likes, saves, comments, and place persistence

## Workspace layout

```text
services/
  api/      # legacy NestJS service kept as reference
  api-java/ # active Spring Boot API service
apps/
  web/      # Next.js community and editor surfaces
  mobile/   # Expo mobile app / native map shell
infra/
  docker/   # local infrastructure bootstrap
```

## Local setup

1. Start infrastructure:

```bash
docker compose up -d
```

Postgres is mapped to `localhost:5433` on purpose so it does not collide with any local PostgreSQL service already using `5432`.

If you already created the database with an older container or partial schema, run this once after Docker is up:

```bash
npm run db:init
```

2. Install dependencies:

```bash
npm install
```

3. Set backend environment variables.

The active Spring Boot service reads `DATABASE_URL` directly. In PowerShell:

```powershell
$env:DATABASE_URL="postgresql://tripin:tripin@localhost:5433/tripin?schema=public"
$env:AMAP_WEB_SERVICE_KEY=""
```

`AMAP_WEB_SERVICE_KEY` can stay empty for local development. The API will still run, place status will report `amapConfigured: false`, and route refresh falls back to deterministic straight-line geometry.

4. Create the optional frontend env files so the placeholders are explicit:

```powershell
Copy-Item apps\web\.env.local.example apps\web\.env.local -Force
Copy-Item apps\mobile\.env.example apps\mobile\.env -Force
```

Keep these values empty until you have real AMap keys:

```dotenv
# apps/web/.env.local
NEXT_PUBLIC_AMAP_JS_KEY=
NEXT_PUBLIC_AMAP_JS_SECURITY_CODE=

# apps/mobile/.env
AMAP_ANDROID_KEY=
AMAP_IOS_KEY=
```

5. Optional: generate the legacy Prisma client if you still need the old NestJS reference service:

```bash
npm run prisma:generate
```

6. Build the active Java backend:

```bash
npm run build:api
```

7. Start the API:

```bash
npm run start:api
```

`npm run start:api` now packages the Spring Boot service and starts the generated jar directly. This avoids the `spring-boot:run` classpath issue that can happen on some local Windows setups.

The API is available at `http://localhost:3001/api/v1`.

8. Seed demo content:

```bash
curl -X POST http://localhost:3001/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
```

9. Start the web frontend:

```bash
npm --workspace apps/web run dev
```

10. Start the mobile frontend:

```bash
npm --workspace apps/mobile run start
```

For Android Studio emulator, the default backend URL in the app is already `http://10.0.2.2:3001/api/v1`. For a physical device or LDPlayer, change the API base URL inside the app to your host machine LAN IP, for example `http://192.168.1.23:3001/api/v1`.

11. Optional mobile web export:

```bash
npm run build:mobile
python -m http.server 8081 --directory apps/mobile/dist
```

Then open `http://127.0.0.1:8081`.

## Real-map environment

TripIn now has three separate AMap integration points:

- Backend Web Service: `AMAP_WEB_SERVICE_KEY`
- Web editor runtime: `NEXT_PUBLIC_AMAP_JS_KEY`, `NEXT_PUBLIC_AMAP_JS_SECURITY_CODE`
- Mobile native shells: `AMAP_ANDROID_KEY`, `AMAP_IOS_KEY`

You can leave all of them empty during local development. Current fallback behavior:

- `GET /api/v1/places/status` returns `{"amapConfigured": false}`
- place search and live AMap canvases stay disabled
- route refresh still works by writing `FALLBACK / straight_line` segments

Once you have real keys, keep the same variable names and fill them in without changing code.

## Real-map verification

This is the shortest verification path for the real-map MVP:

1. Health check:

```bash
curl http://localhost:3001/api/v1/health
```

Expected: `{"ok":true,...}`

2. Seed demo data:

```bash
curl -X POST http://localhost:3001/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
```

3. Verify the mixed community feed:

```bash
curl http://localhost:3001/api/v1/feed -H "x-user-id: demo-user"
```

Expected: at least one published Beijing route in `items`.

4. Verify the inbox:

```bash
curl http://localhost:3001/api/v1/points/inbox -H "x-user-id: demo-user"
```

Expected: `point-inbox-demo` with state `NEEDS_LOCATION`.

5. Verify draft line refresh with no AMap key:

```bash
curl -X POST http://localhost:3001/api/v1/routes/lines/line-demo-editing/refresh -H "x-user-id: demo-user"
curl http://localhost:3001/api/v1/lines/line-demo-editing -H "x-user-id: demo-user"
```

Expected:

- refresh reports `segmentsUpdated: 1`
- the line detail contains one `routeSegments` item
- that segment has `provider: "FALLBACK"` and `strategy: "straight_line"`

6. Verify the web and mobile config surfaces still build without keys:

```bash
npm run build:web
npm run mobile:config
```

## API highlights

- `POST /api/v1/trips`
- `POST /api/v1/trips/:tripId/points`
- `POST /api/v1/trips/:tripId/auto-assemble`
- `POST /api/v1/trips/:tripId/publish`
- `GET /api/v1/feed`
- `POST /api/v1/posts/:postId/like`
- `POST /api/v1/posts/:postId/save`
