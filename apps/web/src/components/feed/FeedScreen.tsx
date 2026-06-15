'use client';

import Link from 'next/link';

import type { FeedItem } from '../../types';
import { NotificationBell } from '../notifications/NotificationBell';
import { FeedCard } from './FeedCard';

export function FeedScreen({
  items,
  error,
  loggedIn,
}: {
  items: FeedItem[];
  error?: string | null;
  loggedIn: boolean;
}) {
  return (
    <div>
      <header className="topbar">
        <span className="topbar-brand">
          Trip<em>In</em>
        </span>
        <span className="topbar-spacer" />
        <Link href="/search" className="icon-btn" aria-label="搜索">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </Link>
        {loggedIn ? (
          <NotificationBell />
        ) : (
          <Link href="/login" className="topbar-action">
            登录
          </Link>
        )}
      </header>

      {error ? <div className="notice error">{error}</div> : null}

      {!error && items.length === 0 ? (
        <div className="empty-state">
          <b>这里还很安静</b>
          <span>去工作台创建你的第一条路线吧</span>
          <Link href="/studio" className="btn btn-gradient">
            去工作台
          </Link>
        </div>
      ) : null}

      <div className="feed-list">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
