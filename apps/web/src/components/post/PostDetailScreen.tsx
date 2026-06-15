'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { api } from '../../lib/api';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import { mediaUrl } from '../../lib/media';
import type { CommentItem, RouteDetail } from '../../types';
import { Avatar } from '../Avatar';
import { RouteSketch } from '../RouteSketch';
import { GalleryViewer } from '../gallery/GalleryViewer';
import { stopTitleOf, useGalleryMapSync } from '../gallery/useGalleryMapSync';
import { TopBar } from '../shell/TopBar';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7.5-4.8-9.7-9.2C.8 8.7 2.6 5 6.1 5c2 0 3.5 1 4.4 2.5l1.5 2 1.5-2C14.4 6 15.9 5 17.9 5c3.5 0 5.3 3.7 3.8 6.8C19.5 16.2 12 21 12 21z" />
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

export function PostDetailScreen({
  detail,
  sessionUserId,
}: {
  detail: RouteDetail;
  sessionUserId: string | null;
}) {
  const router = useRouter();
  const isPost = detail.source === 'post';
  const isAuthor = Boolean(sessionUserId && detail.author?.id === sessionUserId);

  const [liked, setLiked] = useState(detail.viewerState?.liked ?? false);
  const [saved, setSaved] = useState(detail.viewerState?.saved ?? false);
  const [likeCount, setLikeCount] = useState(detail.counts?.likes ?? 0);
  const [comments, setComments] = useState<CommentItem[]>(detail.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sync = useGalleryMapSync(detail.points, detail.coverMedia, detail.routePreview);
  const { gallery, activeImage, activePhoto, activeStopId, manualStopId } = sync;

  const stopRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (activeStopId && stopRefs.current[activeStopId]) {
      stopRefs.current[activeStopId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeStopId]);

  const toggleLike = async () => {
    if (!isPost) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    try {
      const result = next ? await api.likePost(detail.id) : await api.unlikePost(detail.id);
      setLiked(result.viewerState.liked);
      setLikeCount(result.counts.likes);
    } catch {
      setLiked(!next);
      setLikeCount((count) => count + (next ? -1 : 1));
    }
  };

  const toggleSave = async () => {
    if (!isPost) return;
    const next = !saved;
    setSaved(next);
    try {
      const result = next ? await api.savePost(detail.id) : await api.unsavePost(detail.id);
      setSaved(result.viewerState.saved);
    } catch {
      setSaved(!next);
    }
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.createComment(detail.id, content);
      setComments((current) => [...current, created]);
      setCommentText('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '评论发布失败');
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (commentId: string) => {
    try {
      await api.deleteComment(detail.id, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除评论失败');
    }
  };

  const removePost = async () => {
    if (deleting) return;
    if (!window.confirm('确定删除这篇作品吗？删除后无法恢复。')) return;
    setDeleting(true);
    try {
      await api.deletePost(detail.id);
      router.push('/me');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除失败');
      setDeleting(false);
    }
  };

  return (
    <div className="screen-enter">
      <TopBar title={detail.title} back>
        {isPost && isAuthor ? (
          <button type="button" className="topbar-action danger" onClick={removePost} disabled={deleting}>
            {deleting ? '删除中…' : '删除'}
          </button>
        ) : null}
      </TopBar>

      {error ? <div className="notice error">{error}</div> : null}

      {detail.author ? (
        <div className="feed-head" style={{ paddingTop: 12 }}>
          <Link href={`/users/${detail.author.id}`}>
            <Avatar name={detail.author.displayName} url={detail.author.avatarUrl} size={40} />
          </Link>
          <div className="feed-head-meta">
            <Link href={`/users/${detail.author.id}`}>
              <div className="feed-head-name">{detail.author.displayName}</div>
            </Link>
            <div className="feed-head-sub">
              {[detail.cityName, formatRelativeTime(detail.publishedAt)].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
      ) : null}

      {gallery.length > 0 ? (
        <GalleryViewer
          gallery={gallery}
          activeImage={activeImage}
          title={detail.title}
          onShow={sync.showPhoto}
          onFocusStop={sync.focusStop}
        />
      ) : null}

      {activePhoto?.caption ? <div className="gallery-caption">{activePhoto.caption}</div> : null}

      {isPost ? (
        <div className="feed-actions">
          <button type="button" className={`icon-btn heart ${liked ? 'liked' : ''}`} aria-label={liked ? '取消点赞' : '点赞'} aria-pressed={liked} onClick={toggleLike}>
            <HeartIcon filled={liked} />
          </button>
          <span className="icon-btn-spacer" />
          <button type="button" className={`icon-btn ${saved ? 'saved' : ''}`} aria-label={saved ? '取消收藏' : '收藏'} aria-pressed={saved} onClick={toggleSave}>
            <BookmarkIcon filled={saved} />
          </button>
        </div>
      ) : null}

      {isPost && likeCount > 0 ? <div className="feed-like-row">{likeCount} 次赞</div> : null}

      <div className="post-title-block">
        <h1 className="post-title">{detail.title}</h1>
        {detail.summary ? <p className="post-summary">{detail.summary}</p> : null}
      </div>
      <div className="post-stats-line">
        {[
          detail.cityName,
          `${detail.pointCount} 个点位`,
          `${detail.mediaCount} 张照片`,
          detail.startedAt ? formatDateTime(detail.startedAt) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>

      {sync.sketchPoints.length > 0 ? (
        <div style={{ paddingTop: 12 }}>
          <div className="feed-map-sync">
            <RouteSketch points={sync.sketchPoints} aspect={1.7} activeId={activeStopId} onPointClick={sync.focusStop} />
          </div>
          {gallery.some((photo) => photo.pointId) ? (
            <div className="sync-hint">点地图上的点位，照片会跳到那里拍的第一张</div>
          ) : null}
        </div>
      ) : null}

      {detail.points.length > 0 ? (
        <div className="stop-list post-section">
          {detail.points.map((point, index) => {
            const isStart = index === 0 && detail.points.length > 1;
            const isEnd = index === detail.points.length - 1 && detail.points.length > 1;
            const isActive = activeStopId === point.id;
            const photos = (point.mediaAssets ?? []).filter((media) => mediaUrl(media));
            return (
              <div
                key={point.id}
                ref={(node) => {
                  stopRefs.current[point.id] = node;
                }}
                className={`stop-row ${isActive ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => sync.focusStop(point.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    sync.focusStop(point.id);
                  }
                }}
              >
                <span className={`stop-badge ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''}`}>
                  {isStart ? '起' : isEnd ? '终' : index + 1}
                </span>
                <div className="stop-body">
                  <div className="stop-title">{stopTitleOf(point, index)}</div>
                  <div className="stop-meta">
                    {[
                      point.placeName,
                      formatDateTime(point.startedAt ?? point.checkInAt ?? point.capturedAt),
                      photos.length ? `${photos.length} 张照片` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {point.note ? <div className="stop-note">{point.note}</div> : null}
                  {photos.length > 0 ? (
                    <div className="stop-photos">
                      {photos.map((media, photoIndex) => {
                        const galleryIndex = gallery.findIndex((photo) => photo.key === media.id);
                        const isCurrent = galleryIndex === activeImage && !manualStopId;
                        const jump = () => {
                          if (galleryIndex >= 0) sync.showPhoto(galleryIndex);
                        };
                        return (
                          <img
                            key={media.id}
                            src={mediaUrl(media) ?? ''}
                            alt={`${stopTitleOf(point, index)} 第 ${photoIndex + 1} 张照片`}
                            className={isCurrent ? 'current' : ''}
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              jump();
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                jump();
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {isPost ? (
        <>
          <div className="comment-list">
            {comments.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                还没有评论，来抢沙发。
              </div>
            ) : null}
            {comments.map((comment) => {
              const canDelete = Boolean(
                sessionUserId && (comment.user.id === sessionUserId || isAuthor),
              );
              return (
                <div key={comment.id} className="comment-row">
                  <Avatar name={comment.user.displayName} url={comment.user.avatarUrl} size={30} ring={false} />
                  <div className="comment-body">
                    <div>
                      <b>{comment.user.displayName}</b>
                      {comment.content}
                    </div>
                    <div className="comment-meta">
                      <span>{formatRelativeTime(comment.createdAt)}</span>
                      {canDelete ? (
                        <button type="button" className="comment-delete" onClick={() => removeComment(comment.id)}>
                          删除
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="comment-composer">
            <input
              value={commentText}
              placeholder={sessionUserId ? '添加评论…' : '登录后即可评论'}
              disabled={!sessionUserId || busy}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submitComment();
                }
              }}
            />
            <button type="button" onClick={submitComment} disabled={!sessionUserId || busy || !commentText.trim()}>
              发布
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
