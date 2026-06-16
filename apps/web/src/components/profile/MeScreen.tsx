'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { FeedItem, TripDraft, UserSummary } from '../../types';
import { Avatar } from '../Avatar';
import { PostGrid } from './PostGrid';

type TabKey = 'posts' | 'drafts' | 'saves';

function tripStatusBadge(status?: string | null) {
  if (status === 'PUBLISHED') {
    return <span className="badge published">已发布</span>;
  }
  if (status === 'ARCHIVED') {
    return <span className="badge archived">已归档</span>;
  }
  return <span className="badge draft">草稿</span>;
}

export function MeScreen({
  user,
  posts,
  saves,
  trips: initialTrips,
  followersCount,
  followingCount,
}: {
  user: UserSummary;
  posts: FeedItem[];
  saves: FeedItem[];
  trips: TripDraft[];
  followersCount: number;
  followingCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('posts');
  const [trips, setTrips] = useState(initialTrips);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const drafts = trips.filter((trip) => trip.status !== 'PUBLISHED');

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const deleteTrip = async (trip: TripDraft) => {
    if (!window.confirm(`删除「${trip.title}」？该路线的点位会一起删除。`)) return;
    try {
      await api.deleteTrip(trip.id);
      setTrips((current) => current.filter((candidate) => candidate.id !== trip.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除失败');
    }
  };

  return (
    <div className="screen-fill">
      <header className="topbar">
        <div className="topbar-title">{user.username ? `@${user.username}` : user.displayName}</div>
        <button type="button" className="topbar-action" onClick={logout} disabled={loggingOut}>
          {loggingOut ? '退出中…' : '退出登录'}
        </button>
      </header>

      {error ? <div className="notice error">{error}</div> : null}

      <div className="profile-head">
        <Avatar name={user.displayName} url={user.avatarUrl} size={72} />
        <div className="profile-stats">
          <div className="profile-stat">
            <b>{posts.length}</b>
            <span>作品</span>
          </div>
          <div className="profile-stat">
            <b>{followersCount}</b>
            <span>粉丝</span>
          </div>
          <div className="profile-stat">
            <b>{followingCount}</b>
            <span>关注</span>
          </div>
        </div>
      </div>

      <div className="profile-bio">
        <b>{user.displayName}</b>
        {user.username ? <span className="username">@{user.username}</span> : null}
        {user.bio ? <p>{user.bio}</p> : null}
      </div>

      <div className="profile-actions">
        <Link href="/me/profile" className="btn btn-secondary">
          编辑资料
        </Link>
        <Link href="/me/preferences" className="btn btn-secondary">
          设置
        </Link>
      </div>

      <div className="profile-tabs">
        <button type="button" className={`profile-tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
          作品
        </button>
        <button type="button" className={`profile-tab ${tab === 'drafts' ? 'active' : ''}`} onClick={() => setTab('drafts')}>
          草稿
        </button>
        <button type="button" className={`profile-tab ${tab === 'saves' ? 'active' : ''}`} onClick={() => setTab('saves')}>
          收藏
        </button>
      </div>

      <div className="flex-grow">
        {tab === 'posts' ? (
          <PostGrid items={posts} emptyText="还没有发布过作品，去工作台发布第一条路线吧。" />
        ) : null}

        {tab === 'saves' ? <PostGrid items={saves} emptyText="还没有收藏内容。" /> : null}

        {tab === 'drafts' ? (
          drafts.length === 0 ? (
            <div className="empty-state">
              <b>还没有草稿</b>
              <span>去工作台开始搭建你的第一条路线。</span>
              <Link href="/studio" className="btn btn-gradient">
                创建新路线
              </Link>
            </div>
          ) : (
            <div className="screen-pad">
              <div className="card-list">
                {drafts.map((trip) => (
                  <div key={trip.id} className="draft-row">
                    <div className="draft-row-body">
                      <div className="draft-row-title">
                        {trip.title}
                        {tripStatusBadge(trip.status)}
                      </div>
                      <div className="draft-row-meta">
                        {trip.pointCount === 0 && trip.mediaCount === 0
                          ? '空草稿 · 点「继续编辑」开始'
                          : `${trip.pointCount} 个点位 · ${trip.mediaCount} 张图片${
                              trip.startedAt ? ` · ${formatDateTime(trip.startedAt)}` : ''
                            }`}
                      </div>
                    </div>
                    <Link href={`/studio/${trip.id}`} className="mini-btn">
                      继续编辑
                    </Link>
                    <button type="button" className="mini-btn danger" onClick={() => deleteTrip(trip)}>
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <Link href="/studio" className="btn btn-secondary btn-block" style={{ marginTop: 12 }}>
                ＋ 创建新路线
              </Link>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
