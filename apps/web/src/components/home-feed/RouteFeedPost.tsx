'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  canStepImageBackward,
  canStepImageForward,
  createInitialPostState,
  selectStop,
  stepImageBackward,
  stepImageForward,
} from '../../home-feed/post-interactions';
import type { HomeFeedPost } from '../../home-feed/types';
import { api } from '../../lib/api';
import type { CommentItem } from '../../types';
import { RouteFeedPostGallery } from './RouteFeedPostGallery';
import { RouteFeedPostMap } from './RouteFeedPostMap';
import styles from './HomeFeedRedesign.module.css';

const DEFAULT_VISIBLE_COMMENT_COUNT = 2;

function ActionIcon({ kind }: { kind: 'like' | 'comment' | 'bookmark' }) {
  if (kind === 'like') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" data-icon-kind={kind}>
        <path d="M20.8 8.6a5.2 5.2 0 0 0-8.8-2.8 5.2 5.2 0 0 0-8.8 2.8c0 5.2 8.8 10.4 8.8 10.4s8.8-5.2 8.8-10.4Z" />
      </svg>
    );
  }
  if (kind === 'comment') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" data-icon-kind={kind}>
        <path d="M21 11.6a7.6 7.6 0 0 1-11.4 6.6L4 20l1.8-5.4A7.6 7.6 0 1 1 21 11.6Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-icon-kind={kind}>
      <path d="M6 4.2h12v16l-6-4-6 4z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 4.7-6.5 12-6.5 12S5.5 13.7 5.5 9A6.5 6.5 0 0 1 12 2.5Zm0 4.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z" />
    </svg>
  );
}

export function RouteFeedPost({ post }: { post: HomeFeedPost }) {
  const [state, setState] = useState(createInitialPostState);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saveCount, setSaveCount] = useState(post.saveCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved);
  const [showProfile, setShowProfile] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [expandComments, setExpandComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const activeStop = post.stops[state.activeStopIndex] ?? post.stops[0];

  const visibleComments = useMemo(() => {
    if (!showComments) {
      return [];
    }
    return expandComments ? comments : comments.slice(0, DEFAULT_VISIBLE_COMMENT_COUNT);
  }, [comments, expandComments, showComments]);

  useEffect(() => {
    if (!showComments) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setCommentsLoading(true);
        setCommentsError('');
        const nextComments = await api.listComments(post.id);
        if (cancelled) {
          return;
        }
        setComments(nextComments);
        setCommentCount(nextComments.length);
      } catch {
        if (!cancelled) {
          setCommentsError('评论加载失败，请稍后再试。');
        }
      } finally {
        if (!cancelled) {
          setCommentsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post.id, showComments]);

  if (!activeStop) {
    return null;
  }

  const stopCount = post.stops.length;
  const hasMoreComments = comments.length > DEFAULT_VISIBLE_COMMENT_COUNT;

  const handleLike = async () => {
    const next = liked ? await api.unlikePost(post.id) : await api.likePost(post.id);
    setLiked(next.viewerState.liked);
    setLikeCount(next.counts.likes);
  };

  const handleSave = async () => {
    const next = saved ? await api.unsavePost(post.id) : await api.savePost(post.id);
    setSaved(next.viewerState.saved);
    setSaveCount(next.counts.saves);
  };

  const handleComment = async () => {
    const content = commentDraft.trim();
    if (!content || commentSubmitting) {
      return;
    }

    try {
      setCommentSubmitting(true);
      const created = await api.createComment(post.id, content);
      const nextComments = [...comments, created];
      setComments(nextComments);
      setCommentCount(nextComments.length);
      setExpandComments(nextComments.length > DEFAULT_VISIBLE_COMMENT_COUNT);
      setCommentDraft('');
      setCommentsError('');
    } catch {
      setCommentsError('评论发布失败，请稍后再试。');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <article className={styles.postArticle}>
      <header className={styles.postHeader}>
        <button className={styles.postAuthorButton} type="button" onClick={() => setShowProfile(true)}>
          <div className={styles.avatar} aria-hidden="true">
            {post.avatarLabel}
          </div>
          <div className={styles.postHeaderCopy}>
            <strong className={styles.postName}>{post.authorName}</strong>
            <span className={styles.postBadge}>{post.authorBadge}</span>
          </div>
        </button>
        <span className={styles.postTimestamp}>{post.publishedLabel}</span>
      </header>

      <div className={styles.postCopy}>
        <Link className={styles.postTitleLink} href={post.detailHref}>
          {post.title}
        </Link>
        <p className={styles.postSummary}>{post.summary}</p>
      </div>

      <div className={styles.routeMetaRow}>
        <span className={styles.routePin}>
          <PinIcon />
          {activeStop.placeLabel}
        </span>
        <span className={styles.metaSeparator} aria-hidden="true" />
        <span>{activeStop.timeLabel}</span>
        <span className={styles.metaSeparator} aria-hidden="true" />
        <span>{stopCount} 个停留点</span>
      </div>

      <RouteFeedPostMap
        post={post}
        activeStopIndex={state.activeStopIndex}
        onSelectStop={(stopIndex) => setState((current) => selectStop(post, current, stopIndex))}
      />

      <RouteFeedPostGallery
        detailHref={post.detailHref}
        postTitle={post.title}
        stop={activeStop}
        activeImageIndex={state.activeImageIndex}
        hasPrevImage={canStepImageBackward(post, state)}
        hasNextImage={canStepImageForward(post, state)}
        onPrevImage={() => setState((current) => stepImageBackward(post, current))}
        onNextImage={() => setState((current) => stepImageForward(post, current))}
      />

      <footer className={styles.postActions}>
        <div className={styles.actionsLeft}>
          <button className={styles.actionButton} type="button" aria-label="点赞" onClick={handleLike}>
            <span className={styles.actionIcon} aria-hidden="true">
              <ActionIcon kind="like" />
            </span>
            <span className={styles.actionCount}>{likeCount}</span>
          </button>
          <button
            className={styles.actionButton}
            type="button"
            aria-label="评论"
            onClick={() => setShowComments((current) => !current)}
          >
            <span className={styles.actionIcon} aria-hidden="true">
              <ActionIcon kind="comment" />
            </span>
            <span className={styles.actionCount}>{commentCount}</span>
          </button>
        </div>
        <button className={styles.actionButton} type="button" aria-label="收藏" onClick={handleSave}>
          <span className={styles.actionIcon} aria-hidden="true">
            <ActionIcon kind="bookmark" />
          </span>
          <span className={styles.actionCount}>{saveCount}</span>
        </button>
      </footer>

      {showComments ? (
        <section className={styles.commentPanel}>
          <div className={styles.commentComposer}>
            <textarea
              className={styles.commentInput}
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="写下你的评论"
              rows={2}
            />
            <button
              className={styles.commentSubmit}
              type="button"
              onClick={handleComment}
              disabled={!commentDraft.trim() || commentSubmitting}
            >
              {commentSubmitting ? '发布中' : '发布'}
            </button>
          </div>

          <div className={styles.commentList}>
            {commentsLoading ? <p className={styles.commentMore}>评论加载中…</p> : null}
            {!commentsLoading && commentsError ? <p className={styles.commentMore}>{commentsError}</p> : null}
            {!commentsLoading && !commentsError && comments.length === 0 ? (
              <p className={styles.commentMore}>还没有评论，来写下第一条吧。</p>
            ) : null}

            {visibleComments.map((comment) => (
              <article key={comment.id} className={styles.commentItem}>
                <Link className={styles.commentUser} href={`/users/${comment.user.id}`}>
                  <span className={styles.commentAvatar}>{comment.user.displayName.slice(0, 2).toUpperCase()}</span>
                  <strong>{comment.user.displayName}</strong>
                </Link>
                <p>{comment.content}</p>
              </article>
            ))}

            {!commentsLoading && !commentsError && hasMoreComments ? (
              <button
                className={styles.commentExpandButton}
                type="button"
                onClick={() => setExpandComments((current) => !current)}
              >
                {expandComments ? '收起评论' : `展开全部评论（${comments.length}）`}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {showProfile ? (
        <div className={styles.profileOverlay} onClick={() => setShowProfile(false)}>
          <section className={styles.profileSheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.profileAvatar}>{post.avatarLabel}</div>
            <h3>{post.authorName}</h3>
            <p>{post.authorBio || '这个作者还没有填写简介。'}</p>
            <Link className={styles.profileLink} href={`/users/${post.authorId}`}>
              看看 ta 的空间
            </Link>
          </section>
        </div>
      ) : null}
    </article>
  );
}
