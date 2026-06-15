'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '../../lib/api';
import { formatRelativeTime } from '../../lib/format';
import type { NotificationItem } from '../../types';
import { Avatar } from '../Avatar';
import { TopBar } from '../shell/TopBar';

function actionText(type: string): string {
  switch (type) {
    case 'like':
      return '赞了你的帖子';
    case 'comment':
      return '评论了你的帖子';
    case 'follow':
      return '关注了你';
    default:
      return '与你互动';
  }
}

function targetHref(item: NotificationItem): string {
  if (item.type === 'follow') {
    return `/users/${item.actor.id}`;
  }
  if (item.post?.id) {
    return `/routes/${item.post.id}`;
  }
  return '/notifications';
}

export function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getNotifications()
      .then((response) => {
        if (active) setItems(response.items);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : '加载通知失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unread = items.some((item) => !item.isRead);

  const markAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      // 失败时下次进入会重新拉取真实状态
    }
  };

  const open = (item: NotificationItem) => {
    if (item.isRead) return;
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, isRead: true } : candidate,
      ),
    );
    api.markNotificationRead(item.id).catch(() => {});
  };

  return (
    <div>
      <TopBar title="通知" back>
        {unread ? (
          <button type="button" className="topbar-action" onClick={markAll}>
            全部已读
          </button>
        ) : null}
      </TopBar>

      {error ? <div className="notice error">{error}</div> : null}

      {loading ? (
        <div className="empty-state">
          <span>加载中…</span>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="empty-state">
          <b>还没有通知</b>
          <span>有人点赞、评论或关注你时会出现在这里</span>
        </div>
      ) : null}

      <div className="notif-list">
        {items.map((item) => (
          <Link
            key={item.id}
            href={targetHref(item)}
            className={`notif-row ${item.isRead ? '' : 'unread'}`}
            onClick={() => open(item)}
          >
            <Avatar name={item.actor.displayName} url={item.actor.avatarUrl} size={44} />
            <div className="notif-body">
              <div className="notif-text">
                <b>{item.actor.displayName}</b> {actionText(item.type)}
                {item.post?.title ? <span className="notif-post">《{item.post.title}》</span> : null}
              </div>
              <div className="notif-time">{formatRelativeTime(item.createdAt)}</div>
            </div>
            {!item.isRead ? <span className="notif-dot" aria-hidden /> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
