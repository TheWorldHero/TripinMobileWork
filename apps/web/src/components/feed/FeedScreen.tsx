'use client';

import Link from 'next/link';

import type { FeedItem } from '../../types';
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
        {!loggedIn ? (
          <Link href="/login" className="topbar-action">
            登录
          </Link>
        ) : null}
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
