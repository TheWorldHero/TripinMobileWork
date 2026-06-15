'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import type { SearchResults } from '../../types';
import { Avatar } from '../Avatar';

type Tab = 'all' | 'posts' | 'users' | 'places';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'posts', label: '帖子' },
  { key: 'users', label: '用户' },
  { key: 'places', label: '地点' },
];

export function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .search(trimmed, tab)
        .then(setResults)
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, tab]);

  const showPosts = tab === 'all' || tab === 'posts';
  const showUsers = tab === 'all' || tab === 'users';
  const showPlaces = tab === 'all' || tab === 'places';

  const posts = results?.posts ?? [];
  const users = results?.users ?? [];
  const places = results?.places ?? [];
  const empty =
    !loading &&
    results !== null &&
    posts.length === 0 &&
    users.length === 0 &&
    places.length === 0;

  return (
    <div>
      <header className="topbar search-topbar">
        <button
          type="button"
          className="topbar-back"
          aria-label="返回"
          onClick={() => router.back()}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="search-field">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索帖子、用户、地点"
            inputMode="search"
          />
          {query ? (
            <button type="button" className="search-clear" aria-label="清空" onClick={() => setQuery('')}>
              ×
            </button>
          ) : null}
        </div>
      </header>

      <div className="search-tabs">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`search-tab ${tab === entry.key ? 'active' : ''}`}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {!query.trim() ? (
        <div className="empty-state">
          <b>搜点什么吧</b>
          <span>输入关键词搜索帖子、用户或地点</span>
        </div>
      ) : null}

      {loading ? (
        <div className="empty-state">
          <span>搜索中…</span>
        </div>
      ) : null}

      {empty ? (
        <div className="empty-state">
          <b>没有找到结果</b>
          <span>换个关键词试试</span>
        </div>
      ) : null}

      {showUsers && users.length > 0 ? (
        <section className="search-section">
          <div className="search-section-title">用户</div>
          {users.map((user) => (
            <Link key={user.id} href={`/users/${user.id}`} className="search-user-row">
              <Avatar name={user.displayName} url={user.avatarUrl} size={46} />
              <div className="search-user-body">
                <b>{user.displayName}</b>
                <span>
                  {user.username ? `@${user.username}` : ''}
                  {typeof user.followersCount === 'number' ? ` · ${user.followersCount} 粉丝` : ''}
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : null}

      {showPosts && posts.length > 0 ? (
        <section className="search-section">
          <div className="search-section-title">帖子</div>
          {posts.map((post) => {
            const cover = mediaUrl(post.coverMedia);
            return (
              <Link key={post.id} href={`/routes/${post.id}`} className="search-post-row">
                <span className="search-post-thumb">
                  {cover ? <img src={cover} alt={post.title} /> : <span className="search-post-thumb-fallback" />}
                </span>
                <div className="search-post-body">
                  <b>{post.title}</b>
                  <span>
                    {post.author?.displayName ?? '匿名'}
                    {post.cityName ? ` · ${post.cityName}` : ''}
                    {typeof post.pointCount === 'number' && post.pointCount > 0
                      ? ` · ${post.pointCount} 个点位`
                      : ''}
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      ) : null}

      {showPlaces && places.length > 0 ? (
        <section className="search-section">
          <div className="search-section-title">地点</div>
          {places.map((place, index) => (
            <div key={place.id ?? `${place.name}-${index}`} className="search-place-row">
              <span className="search-place-pin" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-5.1-7-10a7 7 0 0 1 14 0c0 4.9-7 10-7 10z" />
                  <circle cx="12" cy="11" r="2.5" />
                </svg>
              </span>
              <div className="search-place-body">
                <b>{place.name}</b>
                <span>{place.formattedAddress ?? [place.cityName, place.districtName].filter(Boolean).join(' · ')}</span>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
