# TripIn 项目介绍文档

## 一、项目简介

**TripIn** 是一款以社区为先（community-first）的生活与旅行时间线产品，核心特色是将真实地图（real-map）能力作为内容创作与浏览的支撑层，而非主舞台。

用户先把它当作一个"社区动态流"来打开（feed-first），看到感兴趣的帖子后再下钻到路线详情或编辑器进行深度操作。整体设计基调是 **轻量、克制、生活化**，视觉上更接近 Instagram 而不是传统旅行仪表盘。

当前仓库是一个 **可本地完整运行的 MVP（最小可行产品）**。

---

## 二、技术栈总览

| 层 | 技术 |
| --- | --- |
| 后端（活跃） | **Java 21 + Spring Boot 3.3.5**（JDBC + PostgreSQL） |
| 后端（遗留参考） | NestJS 11 + Prisma 6（保留作参考，不再使用） |
| Web 前端 | **Next.js 15.3** + React 19 + TypeScript（App Router + Turbopack） |
| 移动端 | **Expo SDK 54** + React Native 0.81 + React 19，含原生 AMap 模块 |
| 数据库 | PostgreSQL 16 + PostGIS 3.4 |
| 缓存 | Redis 7.4 |
| 地图能力 | 高德 AMap（Web JS、Web Service、Android、iOS 四端 Key 分离） |
| 容器化 | Docker Compose（仅基础设施 Postgres + Redis） |
| 构建 | npm workspaces（monorepo）、Maven |

---

## 三、目录结构

```text
TripinMobileWork/
├── apps/
│   ├── web/                  # Next.js 社区动态 + 编辑器 Web 端
│   │   ├── app/              # App Router 路由（editor / studio / routes / favorites / me / login ...）
│   │   └── src/
│   │       ├── components/   # HomeFeed / RouteMap / LineEditorMap / TripDraftStudio 等
│   │       ├── editor/       # 路线编辑器逻辑
│   │       └── home-feed/    # 社区动态流逻辑
│   │
│   └── mobile/               # Expo 移动端（含原生 AMap 壳）
│       ├── modules/
│       │   └── tripin-amap/  # 自研 Expo Native Module（android / ios / src）
│       ├── plugins/          # withTripinAmap config plugin
│       └── src/
│           ├── app/          # AppRoot、状态机（draft-point-state / line-editor-state / studio-state）
│           ├── screens/      # FeedScreen / PostDetailScreen / StudioScreen / MyScreen
│           ├── components/   # MobileUi / RoutePreview / Ui
│           ├── native/       # TripinMapView 原生地图视图桥接
│           └── lib/          # api.ts / display.ts / format.ts
│
├── services/
│   ├── api-java/             # ✅ 当前活跃后端：Spring Boot
│   │   └── src/main/
│   │       ├── java/com/tripin/api/
│   │       │   ├── controller/  # 13 个控制器（Auth / Feed / Trips / Routes / Lines / Points / Posts / Places / Media / Interactions / Users / DevSupport / Health）
│   │       │   ├── service/     # 对应业务服务层
│   │       │   ├── config/      # Spring 配置
│   │       │   ├── support/     # 通用支持类
│   │       │   └── web/         # Web 层支持
│   │       └── resources/
│   │           ├── application.properties  # 端口 3001，context-path=/api
│   │           └── schema.sql              # PostGIS 表结构
│   │
│   └── api/                  # ⚠️ 旧版 NestJS，仅作参考保留
│
├── infra/
│   └── docker/postgres/      # 本地 Postgres 配置
│
├── docs/
│   └── superpowers/          # 设计 plans 与 specs
│
├── docker-compose.yml        # postgres（5433）+ redis（6379）
├── package.json              # npm workspaces 根配置（services/api、apps/web、apps/mobile）
├── README.md
├── .impeccable.md            # 设计语言与品牌原则
└── start-*.cmd / .ps1        # Windows 一键启动脚本
```

---

## 四、核心功能领域

从控制器/服务层与 README 可以归纳出当前 MVP 已实现的能力：

1. **社区动态流（Feed）** — 混合发布内容流，前后端皆已就绪。
2. **路线（Routes / Lines）** — 路线发布、详情、刷新；支持 AMap 真实地理几何，亦能在无 Key 的本地环境下回退到 `FALLBACK / straight_line` 直线段。
3. **行程草稿（Trips / Studio）** — 行程创建、自动组装（auto-assemble）、发布。
4. **打点收件箱（Points Inbox）** — 收集需要补全位置的草稿点（`NEEDS_LOCATION`）。
5. **互动（Interactions）** — 帖子点赞、收藏、评论。
6. **地点（Places）** — 高德 Web Service 地点搜索；`/api/v1/places/status` 暴露 `amapConfigured` 状态。
7. **账号体系（Auth / Users）** — 登录、注册、个人主页设置。
8. **媒体（Media）** — 图片等素材上传/管理。
9. **开发支持（DevSupport）** — `/dev/seed` 一键灌入北京演示路线等本地数据。

API 基础前缀：`http://localhost:3001/api/v1`

---

## 五、AMap（高德地图）集成

四端 Key 互相独立，本地开发可全部留空：

| 配置项 | 用途 |
| --- | --- |
| `AMAP_WEB_SERVICE_KEY` | 后端 Web Service（地点搜索、路径规划等） |
| `NEXT_PUBLIC_AMAP_JS_KEY` + `NEXT_PUBLIC_AMAP_JS_SECURITY_CODE` | Web 编辑器中的 AMap JS 运行时 |
| `AMAP_ANDROID_KEY` | 移动端 Android 原生地图壳 |
| `AMAP_IOS_KEY` | 移动端 iOS 原生地图壳 |

**无 Key 时的回退策略：**
- `places/status` 返回 `amapConfigured: false`
- 地点搜索与实时地图画布禁用
- 路线刷新仍可工作，写入 `provider: FALLBACK`、`strategy: straight_line` 段

移动端通过自研 Expo Native Module `apps/mobile/modules/tripin-amap`（含 android/ios 原生代码 + `withTripinAmap` config plugin）注入原生地图能力。

---

## 六、本地启动流程

```bash
# 1. 启动基础设施（Postgres 5433 + Redis 6379）
docker compose up -d

# 2. 安装依赖
npm install

# 3. 设置后端环境变量（PowerShell）
$env:DATABASE_URL="postgresql://tripin:tripin@localhost:5433/tripin?schema=public"
$env:AMAP_WEB_SERVICE_KEY=""

# 4. 构建并启动 Java 后端
npm run build:api
npm run start:api          # → http://localhost:3001/api/v1

# 5. 灌入演示数据
curl -X POST http://localhost:3001/api/v1/dev/seed \
  -H "Content-Type: application/json" -d "{\"reset\":true}"

# 6. 启动 Web 与移动端
npm run dev:web            # Next.js
npm run dev:mobile         # Expo
```

Windows 用户也可直接使用根目录的 `start-tripin.cmd` / `start-tripin.ps1` / `start-tripin-mobile.cmd` 等一键脚本。

Postgres 故意暴露在 **5433** 端口，避免与本机已有的 5432 冲突。

**无 Docker 备选方案（本机已装 PostgreSQL 时）**：代码实际不依赖 PostGIS（坐标均为 DECIMAL 列），可用本机 Postgres 跑一个独立实例：

```powershell
$pg = "C:\Program Files\PostgreSQL\18\bin"
& "$pg\initdb.exe" -D "$env:LOCALAPPDATA\tripin-pgdata" -U tripin -E UTF8 -A trust --no-locale
& "$pg\pg_ctl.exe" -D "$env:LOCALAPPDATA\tripin-pgdata" -o "-p 5433" -l "$env:LOCALAPPDATA\tripin-pgdata\server.log" -w start
& "$pg\createdb.exe" -p 5433 -U tripin tripin
& "$pg\psql.exe" -p 5433 -U tripin -d tripin -f services\api-java\src\main\resources\schema.sql
# schema 第一行 CREATE EXTENSION postgis 会报错，可忽略（未被使用）
```

---

## 七、设计原则（来自 `.impeccable.md`）

- **品牌人格**：轻量、克制、生活化；不要做成编辑部排版或仪表盘。
- **视觉系统**：白底为主，近黑正文 + 浅灰元数据；默认假设手机竖拍照片。
- **5 条核心设计准则：**
  1. 社区 Feed 第一，地图工具第二。
  2. 用空白、字号、节奏分隔帖子，**不**用边框/卡片壳。
  3. 每条 Feed 项要紧凑到桌面视口能完整容纳。
  4. 路线身份在 Feed 内保留——每条帖子都有可见的路线小图。
  5. 头像保持圆形，其余一律保持 **直角、安静**。
- **避免**：黄棕做旧色调、装饰性圆角模块、过细分隔线、无意义功能型 chrome。

---

## 八、关键 API 速查

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/v1/health` | 健康检查 |
| POST | `/api/v1/dev/seed` | 灌入演示数据（仅本地） |
| GET | `/api/v1/feed` | 社区混合动态流 |
| POST | `/api/v1/trips` | 创建行程 |
| POST | `/api/v1/trips/:tripId/points` | 追加打点 |
| POST | `/api/v1/trips/:tripId/auto-assemble` | 自动组装路线 |
| POST | `/api/v1/trips/:tripId/publish` | 发布行程 |
| POST | `/api/v1/routes/lines/:lineId/refresh` | 刷新路线几何（命中 AMap 或回退直线） |
| GET | `/api/v1/lines/:lineId` | 路线详情 |
| GET | `/api/v1/points/inbox` | 打点收件箱 |
| POST | `/api/v1/posts/:postId/like` | 点赞 |
| POST | `/api/v1/posts/:postId/save` | 收藏 |
| DELETE | `/api/v1/posts/:postId` | 删除帖子（作者；关联行程归档保留） |
| DELETE | `/api/v1/trips/:tripId` | 删除行程（点位/帖子级联删除，媒体保留） |
| PATCH | `/api/v1/posts/:postId/comments/:commentId` | 编辑自己的评论 |
| DELETE | `/api/v1/posts/:postId/comments/:commentId` | 删除评论（评论作者或帖子作者） |
| GET | `/api/v1/places/status` | AMap 配置状态 |

---

## 九、当前仓库状态备注

- Git 主分支为 `main`，初始提交 `611f0c6 Initial TripIn project`。
- 工作区当前有未提交修改：`apps/mobile/package.json`、`apps/mobile/src/app/AppRoot.tsx`、`apps/mobile/src/components/RoutePreview.tsx`、`package-lock.json`。
- 后端有两个并存版本：`services/api-java`（活跃）与 `services/api`（NestJS 遗留参考，文档明确指出仅用于参考）。
- 仓库使用 npm workspaces 管理 `services/api`、`apps/web`、`apps/mobile` 三个工作区；Java 后端通过 npm script 桥接到 Maven 命令。

---

文档生成日期：2026-04-29
