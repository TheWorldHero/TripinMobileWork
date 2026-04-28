# TripIn Web 首页帖子流重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Web 首页重构成单列居中、可直接刷帖和操作的路线帖子流，并为后续移动端同构重构提供可复用的帖子结构与交互模型。

**Architecture:** 首页继续走 Next App Router 服务端取数，但首页帖子不再直接渲染原始 `FeedItem`。先增加一层 `home-feed` 视图模型与交互状态模块，把“当前点 / 当前图 / 点列表密度 / 箭头行为”做成纯函数；再用一组前端组件把帖子头部、路线图、点列表和图片区拼成完整帖子单元。视觉样式改为白色极简基底，并通过局部 CSS Module 替代继续把 `globals.css` 堆大。

**Tech Stack:** Next.js 15、React 19、TypeScript、Vitest、CSS Modules、现有 `/feed` API、现有路线/点位类型

---

**Workspace note:** 当前 `D:\tripin` 不是 Git 仓库。本计划里的“提交”步骤统一替换为写入本地检查点日志 `docs/superpowers/plans/web-home-feed-redesign-checkpoints.log`。

## File Structure

### 新增文件

- `apps/web/src/home-feed/types.ts`
  - 首页帖子视图模型定义，不污染现有 `src/types.ts`
- `apps/web/src/home-feed/post-interactions.ts`
  - 纯函数：当前点切换、图片切换、箭头状态、点列表密度、可见窗口计算
- `apps/web/src/home-feed/post-interactions.test.ts`
  - 首页帖子交互状态单元测试
- `apps/web/src/home-feed/demo-posts.ts`
  - 首页演示帖子数据和 `FeedItem -> HomeFeedPost` 适配逻辑
- `apps/web/src/home-feed/demo-posts.test.ts`
  - 演示数据覆盖和最少帖子数量测试
- `apps/web/src/components/home-feed/ThinSiteHeader.tsx`
  - 极薄顶部
- `apps/web/src/components/home-feed/RouteFeedPost.tsx`
  - 单条帖子主组件，维护当前点/当前图本地状态
- `apps/web/src/components/home-feed/RouteFeedPostMap.tsx`
  - 路线图区域
- `apps/web/src/components/home-feed/RouteFeedPostStopList.tsx`
  - 点列表区域
- `apps/web/src/components/home-feed/RouteFeedPostGallery.tsx`
  - 当前点图片区
- `apps/web/src/components/home-feed/HomeFeedRedesign.module.css`
  - 首页重构的局部样式
- `docs/superpowers/plans/web-home-feed-redesign-checkpoints.log`
  - 无 Git 情况下的实现检查点日志

### 修改文件

- `apps/web/app/page.tsx`
  - 移除 hero/说明卡，改成极薄顶部 + 帖子流
- `apps/web/src/components/HomeFeed.tsx`
  - 从旧摘要卡重写为完整帖子流装配器
- `apps/web/app/globals.css`
  - 只保留全局 tokens / 背景 / 基础排版，去掉纸张风主基调

---

### Task 1: 建立首页帖子交互状态层

**Files:**
- Create: `apps/web/src/home-feed/types.ts`
- Create: `apps/web/src/home-feed/post-interactions.ts`
- Test: `apps/web/src/home-feed/post-interactions.test.ts`
- Modify: `docs/superpowers/plans/web-home-feed-redesign-checkpoints.log`

- [ ] **Step 1: 写首页帖子交互的失败测试**

```ts
import { describe, expect, it } from 'vitest';

import {
  createInitialPostState,
  getGalleryArrowState,
  getStopListDensity,
  getVisibleStopWindow,
  stepBackward,
  stepForward,
  type HomeFeedPostState,
} from './post-interactions';
import type { HomeFeedPost } from './types';

const post: HomeFeedPost = {
  id: 'post-demo',
  title: '北京一日漫游',
  authorName: 'Li Wen',
  cityName: '北京',
  authorBadge: 'TripIn · 北京',
  avatarLabel: 'LW',
  detailHref: '/routes/post-demo',
  publishedLabel: '2026/4/5',
  statsLabel: '1 个赞 · 1 次收藏 · 1 条评论',
  stops: [
    {
      id: 's1',
      title: '长城',
      placeLabel: '八达岭长城',
      timeLabel: '07:10',
      latitude: 40.3564,
      longitude: 116.0206,
      images: ['wall-1', 'wall-2'],
    },
    {
      id: 's2',
      title: '故宫',
      placeLabel: '故宫博物院',
      timeLabel: '11:40',
      latitude: 39.9163,
      longitude: 116.3972,
      images: ['palace-1'],
    },
    {
      id: 's3',
      title: '景山',
      placeLabel: '景山公园',
      timeLabel: '15:20',
      latitude: 39.9321,
      longitude: 116.3961,
      images: ['hill-1', 'hill-2', 'hill-3'],
    },
    {
      id: 's4',
      title: '什刹海',
      placeLabel: '后海',
      timeLabel: '18:40',
      latitude: 39.9409,
      longitude: 116.3876,
      images: ['lake-1'],
    },
    {
      id: 's5',
      title: '鼓楼夜色',
      placeLabel: '鼓楼东大街',
      timeLabel: '20:15',
      latitude: 39.9472,
      longitude: 116.3927,
      images: ['tower-1', 'tower-2'],
    },
  ],
};

describe('getStopListDensity', () => {
  it('根据点数返回不同填充模式', () => {
    expect(getStopListDensity(1)).toBe('single');
    expect(getStopListDensity(2)).toBe('pair');
    expect(getStopListDensity(3)).toBe('trio');
    expect(getStopListDensity(4)).toBe('scroll');
    expect(getStopListDensity(8)).toBe('scroll');
  });
});

describe('point/image stepping', () => {
  it('在当前点最后一张图继续前进时切到下一个点的首图', () => {
    const state: HomeFeedPostState = { activeStopIndex: 0, activeImageIndex: 1 };
    expect(stepForward(post, state)).toEqual({ activeStopIndex: 1, activeImageIndex: 0 });
  });

  it('在当前点第一张图继续后退时切到上一个点的最后一张图', () => {
    const state: HomeFeedPostState = { activeStopIndex: 1, activeImageIndex: 0 };
    expect(stepBackward(post, state)).toEqual({ activeStopIndex: 0, activeImageIndex: 1 });
  });
});

describe('getGalleryArrowState', () => {
  it('在中间点第一张图时左侧箭头是跨点，右侧箭头是同点切图', () => {
    const state: HomeFeedPostState = { activeStopIndex: 2, activeImageIndex: 0 };
    expect(getGalleryArrowState(post, state)).toEqual({
      showPrev: true,
      showNext: true,
      prevMode: 'stop',
      nextMode: 'image',
    });
  });
});

describe('getVisibleStopWindow', () => {
  it('在超过四个点时，返回包含当前点的四项窗口', () => {
    expect(getVisibleStopWindow(5, 0, 4)).toEqual([0, 4]);
    expect(getVisibleStopWindow(5, 2, 4)).toEqual([1, 5]);
    expect(getVisibleStopWindow(5, 4, 4)).toEqual([1, 5]);
  });

  it('默认状态落在第一个点第一张图', () => {
    expect(createInitialPostState()).toEqual({ activeStopIndex: 0, activeImageIndex: 0 });
  });
});
```

- [ ] **Step 2: 运行测试，确认交互状态还不存在**

Run: `npm --workspace apps/web exec vitest run src/home-feed/post-interactions.test.ts`

Expected: FAIL，报 `Cannot find module './post-interactions'` 或导出不存在。

- [ ] **Step 3: 写最小可用的首页帖子类型与交互实现**

`apps/web/src/home-feed/types.ts`

```ts
export type HomeFeedStop = {
  id: string;
  title: string;
  placeLabel: string;
  timeLabel: string;
  latitude: number;
  longitude: number;
  images: string[];
};

export type HomeFeedPost = {
  id: string;
  title: string;
  authorName: string;
  cityName: string;
  authorBadge: string;
  avatarLabel: string;
  detailHref: string;
  publishedLabel: string;
  statsLabel: string;
  stops: HomeFeedStop[];
};
```

`apps/web/src/home-feed/post-interactions.ts`

```ts
import type { HomeFeedPost } from './types';

export type HomeFeedPostState = {
  activeStopIndex: number;
  activeImageIndex: number;
};

export type StopListDensity = 'single' | 'pair' | 'trio' | 'scroll';

export function createInitialPostState(): HomeFeedPostState {
  return { activeStopIndex: 0, activeImageIndex: 0 };
}

export function getStopListDensity(stopCount: number): StopListDensity {
  if (stopCount <= 1) return 'single';
  if (stopCount === 2) return 'pair';
  if (stopCount === 3) return 'trio';
  return 'scroll';
}

export function stepForward(post: HomeFeedPost, state: HomeFeedPostState): HomeFeedPostState {
  const stop = post.stops[state.activeStopIndex];
  const lastImageIndex = Math.max(stop.images.length - 1, 0);

  if (state.activeImageIndex < lastImageIndex) {
    return { ...state, activeImageIndex: state.activeImageIndex + 1 };
  }

  if (state.activeStopIndex < post.stops.length - 1) {
    return { activeStopIndex: state.activeStopIndex + 1, activeImageIndex: 0 };
  }

  return state;
}

export function stepBackward(post: HomeFeedPost, state: HomeFeedPostState): HomeFeedPostState {
  if (state.activeImageIndex > 0) {
    return { ...state, activeImageIndex: state.activeImageIndex - 1 };
  }

  if (state.activeStopIndex > 0) {
    const previousStop = post.stops[state.activeStopIndex - 1];
    return {
      activeStopIndex: state.activeStopIndex - 1,
      activeImageIndex: Math.max(previousStop.images.length - 1, 0),
    };
  }

  return state;
}

export function getGalleryArrowState(post: HomeFeedPost, state: HomeFeedPostState) {
  const stop = post.stops[state.activeStopIndex];
  const lastImageIndex = Math.max(stop.images.length - 1, 0);
  const prevMode =
    state.activeImageIndex > 0 ? 'image' : state.activeStopIndex > 0 ? 'stop' : null;
  const nextMode =
    state.activeImageIndex < lastImageIndex
      ? 'image'
      : state.activeStopIndex < post.stops.length - 1
        ? 'stop'
        : null;

  return {
    showPrev: prevMode !== null,
    showNext: nextMode !== null,
    prevMode,
    nextMode,
  };
}

export function getVisibleStopWindow(stopCount: number, activeIndex: number, maxVisible = 4) {
  if (stopCount <= maxVisible) {
    return [0, stopCount] as const;
  }

  const half = Math.floor(maxVisible / 2);
  const start = Math.min(
    Math.max(activeIndex - half, 0),
    Math.max(stopCount - maxVisible, 0),
  );

  return [start, start + maxVisible] as const;
}
```

- [ ] **Step 4: 再次运行测试，确认交互逻辑通过**

Run: `npm --workspace apps/web exec vitest run src/home-feed/post-interactions.test.ts`

Expected: PASS，5 个断言全部通过。

- [ ] **Step 5: 写入本地检查点**

Run:

```powershell
Add-Content docs/superpowers/plans/web-home-feed-redesign-checkpoints.log "Task 1 complete: built home-feed interaction state helpers and passing tests."
```

---

### Task 2: 建立首页演示帖子视图模型与示例覆盖

**Files:**
- Create: `apps/web/src/home-feed/demo-posts.ts`
- Test: `apps/web/src/home-feed/demo-posts.test.ts`
- Modify: `docs/superpowers/plans/web-home-feed-redesign-checkpoints.log`

- [ ] **Step 1: 先写失败测试，锁定最少帖子数量和点数覆盖**

```ts
import { describe, expect, it } from 'vitest';

import { buildHomeFeedPosts } from './demo-posts';
import type { FeedItem } from '../types';

const apiFeed: FeedItem[] = [
  {
    id: 'line-demo-published',
    title: '北京一日游',
    summary: '长城、故宫、景山',
    cityName: '北京',
    pointCount: 3,
    mediaCount: 4,
    publishedAt: '2026-04-05T10:00:00.000Z',
    author: { id: 'user-1', displayName: 'Li Wen' },
    trip: {
      id: 'trip-1',
      title: '北京一日游',
      routePreview: [
        { latitude: 40.3564, longitude: 116.0206 },
        { latitude: 39.9163, longitude: 116.3972 },
        { latitude: 39.9321, longitude: 116.3961 },
      ],
    },
    _count: { likes: 1, saves: 1, comments: 1 },
  },
];

describe('buildHomeFeedPosts', () => {
  it('至少产出五条帖子，并覆盖 1/2/3/4/6+ 点', () => {
    const posts = buildHomeFeedPosts(apiFeed);
    const stopCounts = posts.map((post) => post.stops.length);

    expect(posts.length).toBeGreaterThanOrEqual(5);
    expect(stopCounts).toContain(1);
    expect(stopCounts).toContain(2);
    expect(stopCounts).toContain(3);
    expect(stopCounts).toContain(4);
    expect(stopCounts.some((count) => count >= 6)).toBe(true);
  });

  it('沿用 API 作者和城市信息作为帖子头部来源', () => {
    const [first] = buildHomeFeedPosts(apiFeed);
    expect(first.authorName).toBe('Li Wen');
    expect(first.authorBadge).toContain('TripIn');
    expect(first.authorBadge).toContain('北京');
  });
});
```

- [ ] **Step 2: 运行测试，确认演示数据层还不存在**

Run: `npm --workspace apps/web exec vitest run src/home-feed/demo-posts.test.ts`

Expected: FAIL，报 `Cannot find module './demo-posts'`。

- [ ] **Step 3: 写首页演示帖子适配层**

`apps/web/src/home-feed/demo-posts.ts`

```ts
import type { FeedItem } from '../types';
import type { HomeFeedPost } from './types';

const FIXTURE_POSTS: HomeFeedPost[] = [
  {
    id: 'fixture-single',
    title: '清晨在鼓楼停了一会儿',
    authorName: 'Li Wen',
    cityName: '北京',
    authorBadge: 'TripIn · 北京',
    avatarLabel: 'LW',
    detailHref: '/routes/fixture-single',
    publishedLabel: '2026/4/5',
    statsLabel: '1 个赞 · 1 次收藏 · 1 条评论',
    stops: [
      {
        id: 'single-1',
        title: '鼓楼',
        placeLabel: '鼓楼东大街',
        timeLabel: '07:20',
        latitude: 39.9472,
        longitude: 116.3927,
        images: [
          'https://images.unsplash.com/photo-1549897164-7b0f8b71f5da?auto=format&fit=crop&w=1200&q=80',
        ],
      },
    ],
  },
  {
    id: 'fixture-pair',
    title: '午后两站：北海到景山',
    authorName: 'Zhao Yue',
    cityName: '北京',
    authorBadge: 'TripIn · 北京',
    avatarLabel: 'ZY',
    detailHref: '/routes/fixture-pair',
    publishedLabel: '2026/4/6',
    statsLabel: '8 个赞 · 3 次收藏 · 2 条评论',
    stops: [
      {
        id: 'pair-1',
        title: '北海',
        placeLabel: '北海公园',
        timeLabel: '13:10',
        latitude: 39.9257,
        longitude: 116.3896,
        images: [
          'https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?auto=format&fit=crop&w=1200&q=80',
        ],
      },
      {
        id: 'pair-2',
        title: '景山',
        placeLabel: '景山公园',
        timeLabel: '15:05',
        latitude: 39.9321,
        longitude: 116.3961,
        images: [
          'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80',
        ],
      },
    ],
  },
  {
    id: 'fixture-trio',
    title: '三站慢慢走：长城、故宫、景山',
    authorName: 'Li Wen',
    cityName: '北京',
    authorBadge: 'TripIn · 北京',
    avatarLabel: 'LW',
    detailHref: '/routes/line-demo-published',
    publishedLabel: '2026/4/5',
    statsLabel: '12 个赞 · 7 次收藏 · 5 条评论',
    stops: [
      {
        id: 'trio-1',
        title: '长城',
        placeLabel: '八达岭长城',
        timeLabel: '07:20',
        latitude: 40.3564,
        longitude: 116.0206,
        images: [
          'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
        ],
      },
      {
        id: 'trio-2',
        title: '故宫',
        placeLabel: '故宫博物院',
        timeLabel: '11:40',
        latitude: 39.9163,
        longitude: 116.3972,
        images: [
          'https://images.unsplash.com/photo-1510337550647-e84f83e341ca?auto=format&fit=crop&w=1200&q=80',
        ],
      },
      {
        id: 'trio-3',
        title: '景山',
        placeLabel: '景山公园',
        timeLabel: '15:20',
        latitude: 39.9321,
        longitude: 116.3961,
        images: [
          'https://images.unsplash.com/photo-1531177071271-2ecfd7ecddb7?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=1200&q=80',
        ],
      },
    ],
  },
  {
    id: 'fixture-four',
    title: '北京春天周末路线',
    authorName: 'Li Wen',
    cityName: '北京',
    authorBadge: 'TripIn · 北京',
    avatarLabel: 'LW',
    detailHref: '/routes/fixture-four',
    publishedLabel: '2026/4/6',
    statsLabel: '23 个赞 · 11 次收藏 · 8 条评论',
    stops: [
      { id: 'four-1', title: '天坛', placeLabel: '天坛公园', timeLabel: '08:30', latitude: 39.8822, longitude: 116.4065, images: ['https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'four-2', title: '前门', placeLabel: '前门大街', timeLabel: '10:15', latitude: 39.8991, longitude: 116.3975, images: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'four-3', title: '什刹海', placeLabel: '后海', timeLabel: '14:40', latitude: 39.9409, longitude: 116.3876, images: ['https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'four-4', title: '798', placeLabel: '798 艺术区', timeLabel: '18:10', latitude: 39.9841, longitude: 116.4977, images: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80'] },
    ],
  },
  {
    id: 'fixture-six',
    title: '从清晨到夜里，城市在一条线上慢慢展开',
    authorName: 'Chen Mo',
    cityName: '上海',
    authorBadge: 'TripIn · 上海',
    avatarLabel: 'CM',
    detailHref: '/routes/fixture-six',
    publishedLabel: '2026/4/8',
    statsLabel: '46 个赞 · 18 次收藏 · 12 条评论',
    stops: [
      { id: 'six-1', title: '武康路', placeLabel: '武康大楼', timeLabel: '08:10', latitude: 31.2052, longitude: 121.4376, images: ['https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'six-2', title: '安福路', placeLabel: '安福路', timeLabel: '09:00', latitude: 31.2143, longitude: 121.4414, images: ['https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'six-3', title: '思南公馆', placeLabel: '思南路', timeLabel: '11:20', latitude: 31.2177, longitude: 121.4682, images: ['https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'six-4', title: '外滩', placeLabel: '中山东一路', timeLabel: '14:10', latitude: 31.2400, longitude: 121.4900, images: ['https://images.unsplash.com/photo-1549692520-acc6669e2f0c?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'six-5', title: '陆家嘴', placeLabel: '滨江大道', timeLabel: '17:40', latitude: 31.2354, longitude: 121.4997, images: ['https://images.unsplash.com/photo-1470004914212-05527e49370b?auto=format&fit=crop&w=1200&q=80'] },
      { id: 'six-6', title: '北外滩', placeLabel: '北苏州路', timeLabel: '20:30', latitude: 31.2522, longitude: 121.5043, images: ['https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'] },
    ],
  },
];

export function buildHomeFeedPosts(feedItems: FeedItem[]): HomeFeedPost[] {
  const merged = FIXTURE_POSTS.map((fixture, index) => {
    const feed = feedItems[index];
    if (!feed) {
      return fixture;
    }

    return {
      ...fixture,
      id: feed.id,
      title: fixture.title || feed.title,
      authorName: feed.author.displayName,
      cityName: feed.cityName ?? fixture.cityName,
      authorBadge: `TripIn · ${feed.cityName ?? fixture.cityName}`,
      detailHref: `/routes/${feed.id}`,
      publishedLabel: new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).format(new Date(feed.publishedAt)),
      statsLabel: `${feed._count.likes} 个赞 · ${feed._count.saves} 次收藏 · ${feed._count.comments} 条评论`,
    };
  });

  return merged;
}
```

- [ ] **Step 4: 再跑测试，确认首页演示数据覆盖成立**

Run: `npm --workspace apps/web exec vitest run src/home-feed/demo-posts.test.ts`

Expected: PASS，至少五条帖子且点数覆盖满足设计约束。

- [ ] **Step 5: 写入本地检查点**

Run:

```powershell
Add-Content docs/superpowers/plans/web-home-feed-redesign-checkpoints.log "Task 2 complete: added demo home-feed posts covering 1/2/3/4/6+ stop scenarios."
```

---

### Task 3: 组装新的首页帖子组件

**Files:**
- Create: `apps/web/src/components/home-feed/ThinSiteHeader.tsx`
- Create: `apps/web/src/components/home-feed/RouteFeedPost.tsx`
- Create: `apps/web/src/components/home-feed/RouteFeedPostMap.tsx`
- Create: `apps/web/src/components/home-feed/RouteFeedPostStopList.tsx`
- Create: `apps/web/src/components/home-feed/RouteFeedPostGallery.tsx`
- Create: `apps/web/src/components/home-feed/HomeFeedRedesign.module.css`
- Modify: `docs/superpowers/plans/web-home-feed-redesign-checkpoints.log`

- [ ] **Step 1: 写组件骨架，先把结构拆清楚**

`apps/web/src/components/home-feed/ThinSiteHeader.tsx`

```tsx
import styles from './HomeFeedRedesign.module.css';

export function ThinSiteHeader() {
  return (
    <header className={styles.shellHeader}>
      <div className={styles.shellHeaderInner}>
        <span className={styles.shellBrand}>TripIn</span>
        <span className={styles.shellContext}>首页</span>
      </div>
    </header>
  );
}
```

`apps/web/src/components/home-feed/RouteFeedPost.tsx`

```tsx
'use client';

import { useMemo, useState } from 'react';

import {
  createInitialPostState,
  getGalleryArrowState,
  getStopListDensity,
  getVisibleStopWindow,
  stepBackward,
  stepForward,
} from '../../home-feed/post-interactions';
import type { HomeFeedPost } from '../../home-feed/types';
import { RouteFeedPostGallery } from './RouteFeedPostGallery';
import { RouteFeedPostMap } from './RouteFeedPostMap';
import { RouteFeedPostStopList } from './RouteFeedPostStopList';
import styles from './HomeFeedRedesign.module.css';

export function RouteFeedPost({ post, featured = false }: { post: HomeFeedPost; featured?: boolean }) {
  const [state, setState] = useState(createInitialPostState);
  const activeStop = post.stops[state.activeStopIndex];
  const arrowState = useMemo(() => getGalleryArrowState(post, state), [post, state]);
  const [windowStart, windowEnd] = getVisibleStopWindow(post.stops.length, state.activeStopIndex, 4);

  return (
    <article className={`${styles.postCard} ${featured ? styles.postCardFeatured : ''}`}>
      <header className={styles.postHeader}>
        <div className={styles.avatar}>{post.avatarLabel}</div>
        <div className={styles.postHeaderCopy}>
          <strong>{post.authorName}</strong>
          <span>{post.authorBadge}</span>
        </div>
      </header>

      <section className={styles.postNavigator}>
        <RouteFeedPostMap
          post={post}
          activeStopIndex={state.activeStopIndex}
          onPrev={() => setState((current) => stepBackward(post, current))}
          onNext={() => setState((current) => stepForward(post, current))}
          onSelectStop={(index) => setState({ activeStopIndex: index, activeImageIndex: 0 })}
        />
        <RouteFeedPostStopList
          stops={post.stops}
          activeStopIndex={state.activeStopIndex}
          density={getStopListDensity(post.stops.length)}
          windowStart={windowStart}
          windowEnd={windowEnd}
          onSelectStop={(index) => setState({ activeStopIndex: index, activeImageIndex: 0 })}
        />
      </section>

      <RouteFeedPostGallery
        postTitle={post.title}
        stop={activeStop}
        activeImageIndex={state.activeImageIndex}
        arrowState={arrowState}
        onPrev={() => setState((current) => stepBackward(post, current))}
        onNext={() => setState((current) => stepForward(post, current))}
      />
    </article>
  );
}
```

- [ ] **Step 2: 补齐路线图 / 点列表 / 图片区的最小实现**

`apps/web/src/components/home-feed/RouteFeedPostMap.tsx`

```tsx
import type { HomeFeedPost } from '../../home-feed/types';
import styles from './HomeFeedRedesign.module.css';

export function RouteFeedPostMap({
  post,
  activeStopIndex,
  onPrev,
  onNext,
  onSelectStop,
}: {
  post: HomeFeedPost;
  activeStopIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectStop: (index: number) => void;
}) {
  return (
    <div className={styles.mapPanel}>
      <button className={styles.mapArrow} type="button" onClick={onPrev} aria-label="上一个点" />
      <div className={styles.mapCanvas}>
        <svg viewBox="0 0 560 280" className={styles.mapSvg}>
          <path
            className={styles.mapPath}
            d={post.stops.map((_, index) => `${index === 0 ? 'M' : 'L'} ${56 + index * 84} ${180 - (index % 3) * 38}`).join(' ')}
          />
          {post.stops.map((stop, index) => (
            <button
              key={stop.id}
              type="button"
              className={`${styles.mapPoint} ${index === activeStopIndex ? styles.mapPointActive : ''}`}
              style={{ left: `${10 + index * 14}%`, top: `${54 - (index % 3) * 8}%` }}
              onClick={() => onSelectStop(index)}
            />
          ))}
        </svg>
      </div>
      <button className={styles.mapArrow} type="button" onClick={onNext} aria-label="下一个点" />
    </div>
  );
}
```

`apps/web/src/components/home-feed/RouteFeedPostStopList.tsx`

```tsx
import type { HomeFeedStop } from '../../home-feed/types';
import styles from './HomeFeedRedesign.module.css';

export function RouteFeedPostStopList({
  stops,
  activeStopIndex,
  density,
  windowStart,
  windowEnd,
  onSelectStop,
}: {
  stops: HomeFeedStop[];
  activeStopIndex: number;
  density: 'single' | 'pair' | 'trio' | 'scroll';
  windowStart: number;
  windowEnd: number;
  onSelectStop: (index: number) => void;
}) {
  const visibleStops = density === 'scroll' ? stops.slice(windowStart, windowEnd) : stops;

  return (
    <div className={`${styles.stopPanel} ${styles[`stopPanel${density[0].toUpperCase()}${density.slice(1)}`]}`}>
      {visibleStops.map((stop) => {
        const index = stops.findIndex((item) => item.id === stop.id);
        return (
          <button
            key={stop.id}
            type="button"
            className={`${styles.stopCard} ${index === activeStopIndex ? styles.stopCardActive : ''}`}
            onClick={() => onSelectStop(index)}
          >
            <strong>{stop.title}</strong>
            <span>{stop.placeLabel}</span>
            <em>{stop.timeLabel}</em>
          </button>
        );
      })}
    </div>
  );
}
```

`apps/web/src/components/home-feed/RouteFeedPostGallery.tsx`

```tsx
import type { HomeFeedStop } from '../../home-feed/types';
import styles from './HomeFeedRedesign.module.css';

export function RouteFeedPostGallery({
  postTitle,
  stop,
  activeImageIndex,
  arrowState,
  onPrev,
  onNext,
}: {
  postTitle: string;
  stop: HomeFeedStop;
  activeImageIndex: number;
  arrowState: {
    showPrev: boolean;
    showNext: boolean;
    prevMode: 'image' | 'stop' | null;
    nextMode: 'image' | 'stop' | null;
  };
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <section className={styles.galleryPanel}>
      {arrowState.showPrev ? (
        <button type="button" className={`${styles.galleryArrow} ${arrowState.prevMode === 'stop' ? styles.galleryArrowAccent : ''}`} onClick={onPrev} aria-label="上一张或上一个点" />
      ) : null}
      <img
        className={styles.galleryImage}
        src={stop.images[activeImageIndex]}
        alt={`${postTitle} · ${stop.title}`}
      />
      {arrowState.showNext ? (
        <button type="button" className={`${styles.galleryArrow} ${arrowState.nextMode === 'stop' ? styles.galleryArrowAccent : ''}`} onClick={onNext} aria-label="下一张或下一个点" />
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: 给组件填入核心视觉样式**

`apps/web/src/components/home-feed/HomeFeedRedesign.module.css`

```css
.shellHeader {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(18px);
  background: rgba(255, 255, 255, 0.82);
}

.shellHeaderInner {
  width: min(760px, calc(100vw - 32px));
  margin: 0 auto;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shellBrand {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.postCard {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 28px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
}

.postCardFeatured {
  padding-top: 20px;
}

.postHeader {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #edf6ff, #e7fff5);
  color: #2354d1;
  font-weight: 700;
}

.postHeaderCopy {
  display: grid;
  gap: 2px;
}

.postHeaderCopy span {
  font-size: 12px;
  color: #6b7280;
}

.postNavigator {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(168px, 1fr);
  gap: 12px;
  min-height: 320px;
}

.mapPanel,
.stopPanel,
.galleryPanel {
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.mapPanel {
  position: relative;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 52px;
  align-items: stretch;
  overflow: hidden;
}

.mapCanvas {
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(53, 137, 255, 0.08), transparent 32%),
    radial-gradient(circle at bottom right, rgba(17, 184, 129, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff, #f8fbff);
}

.mapSvg {
  width: 100%;
  height: 100%;
}

.mapPath {
  fill: none;
  stroke: #4fb6a1;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mapPoint {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 999px;
  background: #dbeafe;
  box-shadow: 0 0 0 6px rgba(79, 182, 161, 0.08);
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.mapPointActive {
  background: linear-gradient(135deg, #3b82f6, #10b981);
  transform: scale(1.28);
  box-shadow: 0 0 0 10px rgba(59, 130, 246, 0.14);
}

.stopPanel {
  overflow: auto;
  padding: 10px;
  display: grid;
  gap: 10px;
}

.stopPanelSingle,
.stopPanelPair,
.stopPanelTrio {
  overflow: hidden;
}

.stopPanelSingle .stopCard {
  min-height: 100%;
}

.stopPanelPair .stopCard,
.stopPanelTrio .stopCard {
  min-height: 0;
  flex: 1;
}

.stopCard {
  text-align: left;
  border: 0;
  border-radius: 20px;
  padding: 14px;
  background: #ffffff;
  display: grid;
  gap: 6px;
  cursor: pointer;
}

.stopCardActive {
  background: linear-gradient(180deg, #f5fbff, #effaf6);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12);
}

.stopCard span,
.stopCard em {
  color: #6b7280;
  font-size: 13px;
  font-style: normal;
}

.galleryPanel {
  position: relative;
  min-height: 420px;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.galleryImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.galleryArrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
}

.galleryArrowAccent {
  background: linear-gradient(135deg, #3b82f6, #10b981);
}
```

- [ ] **Step 4: 运行构建，确认新组件全部可编译**

Run: `npm run build:web`

Expected: PASS，首页和已有路由都能完成 Next 构建。

- [ ] **Step 5: 写入本地检查点**

Run:

```powershell
Add-Content docs/superpowers/plans/web-home-feed-redesign-checkpoints.log "Task 3 complete: built the new home-feed component set and compiled the web app."
```

---

### Task 4: 用新帖子流替换旧首页装配

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/src/components/HomeFeed.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `docs/superpowers/plans/web-home-feed-redesign-checkpoints.log`

- [ ] **Step 1: 先让首页走新的数据与组件装配**

`apps/web/src/components/HomeFeed.tsx`

```tsx
import { buildHomeFeedPosts } from '../home-feed/demo-posts';
import type { FeedItem } from '../types';
import { RouteFeedPost } from './home-feed/RouteFeedPost';
import styles from './home-feed/HomeFeedRedesign.module.css';

export function HomeFeed({ items }: { items: FeedItem[] }) {
  const posts = buildHomeFeedPosts(items);

  return (
    <section className={styles.feedColumn} aria-label="TripIn 首页帖子流">
      {posts.map((post, index) => (
        <RouteFeedPost key={post.id} post={post} featured={index === 0} />
      ))}
    </section>
  );
}
```

`apps/web/app/page.tsx`

```tsx
import { HomeFeed } from '../src/components/HomeFeed';
import { ThinSiteHeader } from '../src/components/home-feed/ThinSiteHeader';
import { api } from '../src/lib/api';
import type { FeedItem } from '../src/types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let feedError: string | null = null;
  let items: FeedItem[] = [];

  try {
    const feed = await api.getFeed();
    items = feed.items;
  } catch (error) {
    feedError = error instanceof Error ? error.message : '首页内容流读取失败。';
  }

  return (
    <>
      <ThinSiteHeader />
      <main className="site-shell home-page-redesign">
        {feedError ? <p className="feed-inline-status">{feedError}</p> : null}
        <HomeFeed items={items} />
      </main>
    </>
  );
}
```

- [ ] **Step 2: 重置全局背景和基础层次，去掉纸张风主基调**

在 `apps/web/app/globals.css` 中，把全局 token 和 `body` 背景替换成下面这一段，保留 route/editor 仍然可用的基础变量：

```css
:root {
  color-scheme: light;
  --page-bg: #f6f8fb;
  --page-surface: rgba(255, 255, 255, 0.92);
  --page-surface-strong: #ffffff;
  --ink: #111827;
  --ink-soft: #6b7280;
  --line: rgba(15, 23, 42, 0.08);
  --blue: #3b82f6;
  --green: #10b981;
  --shadow-soft: 0 18px 48px rgba(15, 23, 42, 0.06);
  --radius-xl: 28px;
  --radius-lg: 22px;
  --radius-md: 18px;
  --font-body: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

body {
  min-height: 100vh;
  margin: 0;
  color: var(--ink);
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
    radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.07), transparent 24%),
    linear-gradient(180deg, #fbfcfe 0%, var(--page-bg) 100%);
  font-family: var(--font-body);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(120deg, rgba(59, 130, 246, 0.03), transparent 24%),
    linear-gradient(300deg, rgba(16, 185, 129, 0.03), transparent 18%);
}

.site-shell.home-page-redesign {
  width: min(760px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 18px 0 64px;
}

.feed-inline-status {
  margin: 0 0 16px;
  color: var(--ink-soft);
  font-size: 14px;
}
```

- [ ] **Step 3: 清掉旧首页 hero 依赖，确认首页首屏直接进入帖子流**

Run: `npm run build:web`

Expected: PASS，构建输出中 `/` 正常生成；运行开发服务器后，打开首页不再看到 hero 和右侧说明卡。

- [ ] **Step 4: 写入本地检查点**

Run:

```powershell
Add-Content docs/superpowers/plans/web-home-feed-redesign-checkpoints.log "Task 4 complete: replaced the old hero homepage with the new single-column route feed."
```

---

### Task 5: 做首页交互抛光与人工验收

**Files:**
- Modify: `apps/web/src/components/home-feed/RouteFeedPost.tsx`
- Modify: `apps/web/src/components/home-feed/HomeFeedRedesign.module.css`
- Modify: `docs/superpowers/plans/web-home-feed-redesign-checkpoints.log`

- [ ] **Step 1: 给当前点切换和图片切换补抛光状态**

在 `RouteFeedPost.tsx` 中补充以下细节：

```tsx
// 1. 给当前点变化绑定 data-active-stop
<article
  className={`${styles.postCard} ${featured ? styles.postCardFeatured : ''}`}
  data-active-stop={state.activeStopIndex}
>

// 2. 图片元素上挂 active key，确保点切换时有过渡
<RouteFeedPostGallery
  key={`${activeStop.id}:${state.activeImageIndex}`}
  postTitle={post.title}
  stop={activeStop}
  activeImageIndex={state.activeImageIndex}
  arrowState={arrowState}
  onPrev={() => setState((current) => stepBackward(post, current))}
  onNext={() => setState((current) => stepForward(post, current))}
/>
```

在 `HomeFeedRedesign.module.css` 中补充：

```css
.mapPoint,
.stopCard,
.galleryImage {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease,
    background 180ms ease;
}

.galleryImage {
  animation: galleryFade 220ms ease;
}

@keyframes galleryFade {
  from {
    opacity: 0.72;
    transform: scale(1.018);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 900px) {
  .postNavigator {
    grid-template-columns: 1fr;
  }

  .stopPanel {
    min-height: 220px;
  }

  .galleryPanel {
    min-height: 360px;
  }
}
```

- [ ] **Step 2: 跑单元测试，确认交互逻辑没有被 UI 改坏**

Run: `npm --workspace apps/web exec vitest run src/home-feed/post-interactions.test.ts src/home-feed/demo-posts.test.ts`

Expected: PASS，两个测试文件全部通过。

- [ ] **Step 3: 跑最终构建**

Run: `npm run build:web`

Expected: PASS，Next.js 完整构建成功。

- [ ] **Step 4: 手工验收首页**

在开发服务器里打开首页，逐条检查：

- 第一屏直接进入帖子流
- 不再出现 hero、大标题和双栏错位留白
- 第一条帖子比后续更强，但后续仍是完整帖子
- `1 / 2 / 3 / 4 / 6+` 点的帖子都能显示出不同填充效果
- 点击路线图点位，右侧点列表和下方图片同步切换
- 点击点列表，路线图高亮和图片同步切换
- 图片到边界时，箭头按“切图 / 跨点 / 消失”规则变化
- 首页整体视觉基底已经是白色极简，不再是纸张风 landing page

- [ ] **Step 5: 写入本地检查点**

Run:

```powershell
Add-Content docs/superpowers/plans/web-home-feed-redesign-checkpoints.log "Task 5 complete: polished home-feed interactions and passed manual QA + build verification."
```

---

## Self-Review

### Spec coverage

- 首页从 hero 改为单列居中刷帖：Task 4
- 顶部作者区改成 Instagram 式：Task 3
- 路线图 + 右侧点列表 + 下方图片：Task 3
- 当前点驱动路线图/点列表/图片区：Task 1 + Task 3
- 1/2/3/4+ 点布局适配：Task 1 + Task 2 + Task 5
- 多个演示帖子验证效果：Task 2
- 视觉切换为白色极简而非纸张风：Task 4 + Task 5
- 为移动端保留可复用结构：Task 1 + Task 2 + Task 3

### Placeholder scan

- 无 `TBD / TODO / 之后再做`
- 所有命令、文件路径、测试文件、检查点文件均已明确

### Type consistency

- 首页帖子视图模型统一使用 `HomeFeedPost` / `HomeFeedStop`
- 当前点状态统一使用 `HomeFeedPostState`
- 点列表密度统一使用 `'single' | 'pair' | 'trio' | 'scroll'`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-tripin-web-home-feed-redesign-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
