import { describe, expect, it } from 'vitest';

import type { FeedItem } from '../types';
import { buildHomeFeedPosts } from './demo-posts';

const apiFeed: FeedItem[] = [
  {
    id: 'line-demo-published',
    title: '北京一日游',
    summary: '长城、故宫、景山',
    cityName: '北京',
    pointCount: 3,
    mediaCount: 4,
    publishedAt: '2026-04-05T10:00:00.000Z',
    author: {
      id: 'user-1',
      displayName: 'Li Wen',
    },
    trip: {
      id: 'trip-1',
      title: '北京一日游',
      routePreview: [
        { latitude: 40.3564, longitude: 116.0206 },
        { latitude: 39.9163, longitude: 116.3972 },
        { latitude: 39.9321, longitude: 116.3961 },
      ],
    },
    _count: {
      likes: 1,
      saves: 1,
      comments: 1,
    },
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
    expect(first.detailHref).toBe('/routes/line-demo-published');
  });

  it('在没有 API 数据时也能返回可展示的示例帖子', () => {
    const posts = buildHomeFeedPosts([]);

    expect(posts.length).toBeGreaterThanOrEqual(5);
    expect(posts[0].stops.length).toBeGreaterThan(0);
  });
});
