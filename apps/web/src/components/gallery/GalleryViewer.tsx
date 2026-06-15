'use client';

import { useRef } from 'react';

import type { GalleryPhoto } from './useGalleryMapSync';

const SWIPE_THRESHOLD = 40;
const TAP_THRESHOLD = 8;

/**
 * 可滑动的照片画廊：支持触摸/指针左右滑动、箭头、圆点指示、点位徽标，
 * 以及轻点跳转（onTap）。首页 feed 卡片与帖子详情页共用。
 */
export function GalleryViewer({
  gallery,
  activeImage,
  title,
  onShow,
  onFocusStop,
  onTap,
}: {
  gallery: GalleryPhoto[];
  activeImage: number;
  title: string;
  onShow: (index: number) => void;
  onFocusStop?: (pointId: string) => void;
  onTap?: () => void;
}) {
  const startX = useRef<number | null>(null);
  const photo = gallery[activeImage];
  if (!photo) {
    return null;
  }
  const many = gallery.length > 1;

  const isPrimaryLeft = (event: React.PointerEvent) =>
    event.isPrimary && !(event.pointerType === 'mouse' && event.button !== 0);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!isPrimaryLeft(event)) return;
    startX.current = event.clientX;
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // setPointerCapture 偶发不可用时忽略：箭头/圆点仍可正常翻页。
    }
  };

  const handlePointerEnd = (event: React.PointerEvent) => {
    if (!isPrimaryLeft(event)) return;
    if (startX.current === null) return;
    const dx = event.clientX - startX.current;
    startX.current = null;

    if (Math.abs(dx) <= TAP_THRESHOLD) {
      onTap?.();
      return;
    }
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0 && activeImage < gallery.length - 1) onShow(activeImage + 1);
    else if (dx > 0 && activeImage > 0) onShow(activeImage - 1);
  };

  return (
    <div
      className="gallery-hero"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={() => {
        startX.current = null;
      }}
    >
      <img
        key={photo.key}
        className="gallery-photo"
        src={photo.url}
        alt={photo.caption ?? title}
        draggable={false}
      />

      {photo.pointIndex != null && onFocusStop ? (
        <button
          type="button"
          className="gallery-stop-chip"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onFocusStop(photo.pointId as string)}
        >
          <span className="gallery-stop-chip-badge">{photo.pointIndex + 1}</span>
          {photo.pointTitle}
        </button>
      ) : null}

      {many ? (
        <>
          <span className="feed-media-counter" role="status" aria-live="polite">
            {activeImage + 1} / {gallery.length}
          </span>
          {activeImage > 0 ? (
            <button
              type="button"
              className="media-nav prev"
              aria-label="上一张"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onShow(activeImage - 1)}
            >
              ‹
            </button>
          ) : null}
          {activeImage < gallery.length - 1 ? (
            <button
              type="button"
              className="media-nav next"
              aria-label="下一张"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onShow(activeImage + 1)}
            >
              ›
            </button>
          ) : null}
          <div className="media-dots" aria-hidden="true">
            {gallery.map((item, index) => (
              <span key={item.key} className={`media-dot ${index === activeImage ? 'active' : ''}`} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
