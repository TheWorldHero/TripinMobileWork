import type { FeedItem } from '../types';
import type { HomeFeedPost, HomeFeedStop } from './types';

function formatPublishedLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '刚刚发布';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function buildAvatarLabel(displayName: string) {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return 'TR';
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

function splitStopTitles(summary: string | null | undefined, fallbackTitle: string, count: number) {
  const raw = (summary ?? '')
    .split(/[、，,\/]| and /i)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!raw.length) {
    raw.push(fallbackTitle);
  }

  return Array.from({ length: count }, (_, index) => raw[index] ?? `路线点 ${index + 1}`);
}

function buildStop(
  id: string,
  title: string,
  placeLabel: string,
  latitude: number,
  longitude: number,
  timeLabel: string,
  images: string[] = [],
): HomeFeedStop {
  return {
    id,
    title,
    placeLabel,
    timeLabel,
    latitude,
    longitude,
    images,
  };
}

function buildSummary(cityName: string, stopCount: number, title: string, summary?: string | null) {
  if (summary?.trim()) {
    return summary.trim();
  }

  return `${cityName} · ${stopCount} 个停留点 · ${title}`;
}

function adaptFeedItemToPost(item: FeedItem): HomeFeedPost {
  const previewPoints = item.trip.routePreview ?? [];
  const cityName = item.cityName ?? '未填写城市';
  const stopTitles = splitStopTitles(item.summary, item.title, Math.max(previewPoints.length, 1));
  const coverImage = item.coverMedia?.storageKey ?? null;

  const stops =
    previewPoints.length > 0
      ? previewPoints.map((point, pointIndex) =>
          buildStop(
            `${item.id}-stop-${pointIndex + 1}`,
            stopTitles[pointIndex] ?? `路线点 ${pointIndex + 1}`,
            cityName,
            point.latitude,
            point.longitude,
            `第 ${pointIndex + 1} 站`,
            pointIndex === 0 && coverImage ? [coverImage] : [],
          ),
        )
      : [buildStop(`${item.id}-stop-1`, item.title, cityName, 39.9042, 116.4074, '第 1 站', coverImage ? [coverImage] : [])];

  return {
    id: item.id,
    title: item.title,
    summary: buildSummary(cityName, stops.length, item.title, item.summary),
    authorId: item.author.id,
    authorName: item.author.displayName,
    authorAvatarUrl: item.author.avatarUrl ?? null,
    authorBio: item.author.bio ?? null,
    cityName,
    authorBadge: `${cityName} · 路线`,
    avatarLabel: buildAvatarLabel(item.author.displayName),
    detailHref: `/routes/${item.id}`,
    publishedLabel: formatPublishedLabel(item.publishedAt),
    likeCount: item._count.likes,
    saveCount: item._count.saves,
    commentCount: item._count.comments,
    liked: item.viewerState?.liked ?? false,
    saved: item.viewerState?.saved ?? false,
    stops,
  };
}

export function buildHomeFeedPosts(feedItems: FeedItem[]): HomeFeedPost[] {
  return feedItems.map(adaptFeedItemToPost);
}
