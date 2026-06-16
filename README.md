# TripIn · 基于 LBS 的城市路线分享社区

TripIn 是一款**社区优先**的出行/生活路线分享应用：用户用地图把"点位"串成一条路线，配上照片发布成帖子，并能在社区里**发现 — 收藏 — 编辑 — 发布 — 互动 — 被通知**。Web 端做成"仿手机壳"的沉浸式界面，移动端是原生 App。

> 一套后端同时服务 Web 与移动端；Web 端默认直连线上后端，**克隆下来 `npm install && npm run dev` 即可跑起来，无需任何本地配置**。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | **Java 21 · Spring Boot 3.3** · 纯 JDBC（自封装 `DbSupport`，非 JPA）· **PostgreSQL + PostGIS** · **Redis**（Streams 消息队列 + 缓存）· Actuator/Micrometer 指标 |
| Web | **Next.js 15（App Router）· React 19 · TypeScript** · 高德地图 JS API |
| 移动端 | **React Native + Expo**（自研高德地图原生模块） |
| 基础设施 | Docker Compose（PostgreSQL/Redis）· 阿里云 ECS 生产部署 |

鉴权采用 `x-user-id` 请求头（轻量，无 Spring Security/JWT）；注册/登录口令用 PBKDF2 哈希。后端上下文路径 `/api`，端口 `3001`，对外基址 `http://<host>:3001/api/v1`。

---

## 主要功能

- **社区 Feed**：帖子内嵌可滑动照片画廊，与路线小地图**双向联动**（滑照片高亮对应点位，点点位跳到对应照片）。
- **工作台 Studio**：接入真高德地图建路线——搜索即加点 / 点击地图加点 / 拖拽校正 / 排序 / 一键发布。
- **互动**：点赞、收藏、评论。
- **社交关注**：关注 / 取关、粉丝与关注数。
- **站内通知中心**：点赞 / 评论 / 关注事件经 **Redis Streams 消息队列**异步落库为通知（遵循用户偏好开关）；Redis 不可用时自动降级为同步处理，通知不丢。
- **用户偏好**：通知开关、首页范围等。
- **统一搜索**：帖子 / 用户 / 地点（地点复用高德）。
- **LBS 附近发现**：`GET /posts/nearby` 按坐标就近召回，默认 bbox+Haversine，可切换 **PostGIS `ST_DWithin` + GiST 索引**。
- **高并发缓存**：帖子详情 Redis 缓存（Cache-Aside + 空值/互斥/随机 TTL 三防 + 写失效），自带命中率与 DB 查询计数指标。

---

## 仓库结构

```text
services/
  api-java/        # ★ 当前后端（Spring Boot，Maven 工程）
  api/             # 旧 NestJS 实现，仅作参考保留
apps/
  web/             # Next.js Web 端（仿手机界面）
  mobile/          # Expo 移动端 + 高德原生模块
docker-compose.yml # 本地基础设施（postgres+postgis / redis）
deploy-backend.ps1 # 一键部署后端到服务器
```

---

## 本地运行

### 前置

- JDK 21、Maven 3.9+
- Node.js 18+（含 npm）
- Docker（或自备本机 PostgreSQL+PostGIS / Redis）

### 方式 A：只跑 Web，直连线上后端（最快，零配置）

```bash
npm install
npm --workspace apps/web run dev      # 或：cd apps/web && npm run dev
```

打开 `http://localhost:3000`。Web 默认 `NEXT_PUBLIC_API_BASE_URL` 指向线上后端，地图 Key 由后端 `/config/web` 下发——**不需要任何 `.env`**。

### 方式 B：完整本地全栈

1. 起基础设施（PostgreSQL 映射到 **5433**，避免和本机 5432 冲突；Redis 6379）：

   ```bash
   docker compose up -d
   ```

2. 初始化/更新表结构（幂等，把 `schema.sql` 灌进容器库）：

   ```bash
   npm run db:init
   ```

3. 打包并启动后端（PowerShell 设环境变量后运行）：

   ```powershell
   mvn -f services/api-java/pom.xml -DskipTests package

   $env:DATABASE_URL = "postgresql://tripin:tripin@localhost:5433/tripin"
   $env:REDIS_URL    = "redis://localhost:6379"      # 不设也能跑：消息队列/缓存自动降级
   java -jar services/api-java/target/tripin-api-java-0.1.0.jar
   ```

   后端起在 `http://localhost:3001/api/v1`。验证：`curl http://localhost:3001/api/v1/health` → `{"ok":true,...}`。

4. 灌示例数据：

   ```bash
   curl -X POST http://localhost:3001/api/v1/dev/seed -H "Content-Type: application/json" -d "{\"reset\":true}"
   ```

5. 让 Web 连本地后端：在 `apps/web/.env.local` 写入下面一行，再 `npm run dev`：

   ```dotenv
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
   ```

6. 移动端（可选）：

   ```bash
   npm --workspace apps/mobile run start     # Expo
   ```

   Android 模拟器默认后端 `http://10.0.2.2:3001/api/v1`；真机改成本机局域网 IP。

---

## 环境变量

### 后端（`services/api-java`，按需设置，均可经环境变量或 `services/api-java/.env` 提供）

| 变量 | 说明 | 默认 |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:port/db`（**必填**） | — |
| `REDIS_URL` | `redis://host:port`，消息队列+缓存用 | `redis://localhost:6379` |
| `TRIPIN_GEO_POSTGIS` | `true` 走 PostGIS `ST_DWithin`，否则 Haversine | `false` |
| `TRIPIN_CACHE_ENABLED` | 帖子详情缓存开关 | `true` |
| `TRIPIN_MQ_ENABLED` | Redis Streams 消息队列开关（关则同步处理） | `true` |
| `AMAP_JS_KEY` / `AMAP_JS_SECURITY_CODE` | 高德 JS Key，经 `/config/web` 下发给前端 | 空 |
| `AMAP_WEB_SERVICE_KEY` | 高德 Web 服务 Key（地点搜索/逆地理） | 空 |
| `DEMO_USER_ID` | 缺省当前用户 | `demo-user` |
| `PORT` | 端口 | `3001` |

> 高德 Key 留空也能跑：地图回退为路线示意图，地点搜索停用。`tripin.bench.enabled=true` 才暴露压测用的 `/_bench`（生产默认关）。

### Web（`apps/web/.env.local`，可选）

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1   # 不设默认连线上后端
NEXT_PUBLIC_AMAP_JS_KEY=                                 # 不设则用后端下发的 Key
NEXT_PUBLIC_AMAP_JS_SECURITY_CODE=
```

> `NEXT_PUBLIC_*` 是**构建时**注入，改完要重启 `next dev`。密钥**只存服务器环境变量 + 本地 gitignored 的 `.env.local`，不进仓库**。

---

## 部署到生产

后端跑在阿里云 ECS，用 Docker Compose 编排 `postgres`(postgis) / `redis` / `api` 三个容器。流程（约定：**合并到 `main` 的后端都要部署**，因为前端默认连服务器）：

```bash
# 1) 打包
mvn -f services/api-java/pom.xml -DskipTests package
# 2) 上传 jar、备份旧版、应用任何新增的幂等 schema 迁移
# 3) 改了 compose 环境变量时用 up -d 重建（不是 restart）
docker compose up -d api
# 4) 验证 /api/v1/health 与改动的接口
```

也可用一键脚本（先设 `SSH_PASS` 环境变量）：`./deploy-backend.ps1`。前端不部署到服务器——各使用者本地 `next dev`，默认直连服务器后端。

---

## 主要 API（`/api/v1`）

- 内容：`GET /feed`、`GET /posts/{id}`、`POST /trips`、`POST /trips/{id}/points`、`POST /trips/{id}/publish`
- LBS：`GET /posts/nearby?lat=&lng=&radiusKm=&limit=`
- 互动：`POST/DELETE /posts/{id}/like`、`/save`、`POST /posts/{id}/comments`
- 社交：`GET/POST/DELETE /users/{id}/follow`
- 通知/偏好：`GET /notifications`、`/notifications/unread-count`、`GET/PUT /users/me/preferences`
- 搜索：`GET /search?q=&type=all|posts|users|places`
- 地图/配置：`GET /places/search`、`GET /config/web`、`GET /health`、`GET /actuator/health`
