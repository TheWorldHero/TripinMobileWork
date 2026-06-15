'use client';

import { useMemo, useState } from 'react';

import { mediaUrl } from '../../lib/media';
import type { MediaAsset, RouteCoordinate, RoutePoint } from '../../types';

/** 一张画廊照片，并标注它是在哪个点位拍的（用于与地图联动）。 */
export type GalleryPhoto = {
  key: string;
  url: string;
  caption?: string | null;
  pointId: string | null;
  pointIndex: number | null;
  pointTitle: string | null;
};

export function stopTitleOf(point: RoutePoint, index: number): string {
  return point.title || point.placeName || `路线点 ${index + 1}`;
}

/** 把「点位 + 其照片」摊平成一个画廊；没有任何点位照片时回退到封面图。 */
export function buildGallery(points: RoutePoint[], cover?: MediaAsset | null): GalleryPhoto[] {
  const photos: GalleryPhoto[] = [];
  const seen = new Set<string>();

  points.forEach((point, pointIndex) => {
    for (const media of point.mediaAssets ?? []) {
      const url = mediaUrl(media);
      if (!url || seen.has(media.id)) continue;
      seen.add(media.id);
      photos.push({
        key: media.id,
        url,
        caption: media.caption,
        pointId: point.id,
        pointIndex,
        pointTitle: stopTitleOf(point, pointIndex),
      });
    }
  });

  if (!photos.length) {
    const coverUrl = mediaUrl(cover);
    if (coverUrl) {
      photos.push({
        key: cover?.id ?? 'cover',
        url: coverUrl,
        caption: cover?.caption,
        pointId: null,
        pointIndex: null,
        pointTitle: null,
      });
    }
  }

  return photos;
}

export type SketchPoint = RouteCoordinate & { id: string };

export type GalleryMapSync = {
  gallery: GalleryPhoto[];
  activeImage: number;
  activePhoto: GalleryPhoto | null;
  /** 当前应高亮的点位（手动点地图优先，否则跟随当前照片所属点位）。 */
  activeStopId: string | null;
  manualStopId: string | null;
  sketchPoints: SketchPoint[];
  showPhoto: (index: number) => void;
  focusStop: (pointId: string) => void;
};

/**
 * 照片画廊 ↔ 路线地图点位 的双向同步状态机，供首页 feed 卡片与帖子详情页复用。
 * - 滑动/翻到某张照片 → 高亮该照片所属点位；
 * - 点地图上的点位 → 画廊跳到该点拍的第一张照片（该点没照片则只高亮）。
 */
export function useGalleryMapSync(
  points: RoutePoint[],
  cover?: MediaAsset | null,
  fallbackPreview?: RouteCoordinate[],
): GalleryMapSync {
  const gallery = useMemo(() => buildGallery(points, cover), [points, cover]);
  const [activeImage, setActiveImage] = useState(0);
  const [manualStopId, setManualStopId] = useState<string | null>(null);

  const activePhoto = gallery[activeImage] ?? null;
  const activeStopId = manualStopId ?? activePhoto?.pointId ?? null;

  const showPhoto = (index: number) => {
    setManualStopId(null);
    setActiveImage(Math.max(0, Math.min(gallery.length - 1, index)));
  };

  const focusStop = (pointId: string) => {
    const firstPhotoIndex = gallery.findIndex((photo) => photo.pointId === pointId);
    if (firstPhotoIndex >= 0) {
      showPhoto(firstPhotoIndex);
    } else {
      setManualStopId(pointId);
    }
  };

  const sketchPoints: SketchPoint[] = points.length
    ? points
        .filter((point) => point.latitude != null && point.longitude != null)
        .map((point) => ({
          latitude: point.latitude as number,
          longitude: point.longitude as number,
          id: point.id,
        }))
    : (fallbackPreview ?? []).map((point, index) => ({ ...point, id: `preview-${index}` }));

  return {
    gallery,
    activeImage,
    activePhoto,
    activeStopId,
    manualStopId,
    sketchPoints,
    showPhoto,
    focusStop,
  };
}
