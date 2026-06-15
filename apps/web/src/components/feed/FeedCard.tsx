'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../../lib/api';
import { formatRelativeTime } from '../../lib/format';
import type { FeedItem } from '../../types';
import { Avatar } from '../Avatar';
import { RouteSketch } from '../RouteSketch';
import { GalleryViewer } from '../gallery/GalleryViewer';
import { useGalleryMapSync } from '../gallery/useGalleryMapSync';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7.5-4.8-9.7-9.2C.8 8.7 2.6 5 6.1 5c2 0 3.5 1 4.4 2.5l1.5 2 1.5-2C14.4 6 15.9 5 17.9 5c3.5 0 5.3 3.7 3.8 6.8C19.5 16.2 12 21 12 21z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3-.4-4.3-1L3 20l1-5.2a8.5 8.5 0 1 1 17-3.3z" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  );
}

export function FeedCard({ item }: { item: FeedItem }) {
  const router = useRouter();
  const [liked, setLiked] = useState(item.viewerState?.liked ?? false);
  const [saved, setSaved] = useState(item.viewerState?.saved ?? false);
  const [likeCount, setLikeCount] = useState(item._count.likes);
  const commentCount = item._count.comments;

  const fallbackPreview = (item.trip.routePreview ?? []).map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
  const sync = useGalleryMapSync(item.points ?? [], item.coverMedia, fallbackPreview);
  const detailHref = `/routes/${item.id}`;
  const hasGallery = sync.gallery.length > 0;
  const hasMap = sync.sketchPoints.length > 0;

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    try {
      const result = next ? await api.likePost(item.id) : await api.unlikePost(item.id);
      setLiked(result.viewerState.liked);
      setLikeCount(result.counts.likes);
    } catch {
      setLiked(!next);
      setLikeCount((count) => count + (next ? -1 : 1));
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      const result = next ? await api.savePost(item.id) : await api.unsavePost(item.id);
      setSaved(result.viewerState.saved);
    } catch {
      setSaved(!next);
    }
  };

  return (
    <article className="feed-card">
      <div className="feed-head">
        <Link href={`/users/${item.author.id}`}>
          <Avatar name={item.author.displayName} url={item.author.avatarUrl} size={40} />
        </Link>
        <div className="feed-head-meta">
          <Link href={`/users/${item.author.id}`}>
            <div className="feed-head-name">{item.author.displayName}</div>
          </Link>
          <div className="feed-head-sub">
            {[item.cityName, formatRelativeTime(item.publishedAt)].filter(Boolean).join(' · ')}
          </div>
        </div>
        <Link href={detailHref} className="feed-head-open" aria-label="查看详情">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </Link>
      </div>

      {hasGallery ? (
        <GalleryViewer
          gallery={sync.gallery}
          activeImage={sync.activeImage}
          title={item.title}
          onShow={sync.showPhoto}
          onFocusStop={sync.focusStop}
          onTap={() => router.push(detailHref)}
        />
      ) : (
        <Link href={detailHref} className="feed-media">
          <RouteSketch points={sync.sketchPoints} aspect={1.6} />
        </Link>
      )}

      <div className="feed-actions">
        <button
          type="button"
          className={`icon-btn heart ${liked ? 'liked' : ''}`}
          aria-label={liked ? '取消点赞' : '点赞'}
          aria-pressed={liked}
          onClick={toggleLike}
        >
          <HeartIcon filled={liked} />
        </button>
        <button type="button" className="icon-btn" aria-label="评论" onClick={() => router.push(detailHref)}>
          <CommentIcon />
        </button>
        <span className="icon-btn-spacer" />
        <button
          type="button"
          className={`icon-btn ${saved ? 'saved' : ''}`}
          aria-label={saved ? '取消收藏' : '收藏'}
          aria-pressed={saved}
          onClick={toggleSave}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      {likeCount > 0 ? <div className="feed-like-row">{likeCount} 次赞</div> : null}

      <div className="feed-caption">
        <b>{item.author.displayName}</b>
        {item.title}
        {item.summary ? ` — ${item.summary}` : ''}
      </div>

      {hasMap ? (
        <div className="feed-map-sync">
          <RouteSketch
            points={sync.sketchPoints}
            aspect={2.7}
            activeId={sync.activeStopId}
            onPointClick={sync.focusStop}
          />
          <div className="feed-map-meta">
            <span>
              {item.pointCount} 个点位 · {item.mediaCount} 张照片
            </span>
            {hasGallery ? <span className="feed-map-hint">滑动照片，地图同步</span> : null}
          </div>
        </div>
      ) : (
        <div className="post-stats-line">
          {item.pointCount} 个点位 · {item.mediaCount} 张照片
        </div>
      )}

      {commentCount > 0 ? (
        <Link href={detailHref} className="feed-comments-link">
          查看全部 {commentCount} 条评论
        </Link>
      ) : null}
    </article>
  );
}
