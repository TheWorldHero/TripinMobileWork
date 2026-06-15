'use client';

import Link from 'next/link';
import { useState } from 'react';

import { api } from '../../lib/api';
import { mediaUrl } from '../../lib/media';
import type { FeedItem } from '../../types';
import { RouteSketch } from '../RouteSketch';
import { TopBar } from '../shell/TopBar';

export function FavoritesScreen({ initialItems }: { initialItems: FeedItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);

  const unsave = async (item: FeedItem) => {
    try {
      await api.unsavePost(item.id);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '取消收藏失败');
    }
  };

  return (
    <div>
      <TopBar title="我的收藏" back />
      {error ? <div className="notice error">{error}</div> : null}

      {items.length === 0 ? (
        <div className="empty-state">
          <b>还没有收藏</b>
          <span>在社区看到喜欢的路线，点书签收藏到这里。</span>
          <Link href="/" className="btn btn-secondary">
            去逛逛
          </Link>
        </div>
      ) : (
        items.map((item) => {
          const cover = mediaUrl(item.coverMedia);
          const sketchPoints = (item.trip.routePreview ?? []).map((point, index) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            id: `${item.id}-${index}`,
          }));
          return (
            <div key={item.id} className="draft-row">
              <Link href={`/routes/${item.id}`} style={{ width: 64, flex: 'none' }}>
                {cover ? (
                  <img src={cover} alt={item.title} style={{ width: 64, height: 64, objectFit: 'cover' }} />
                ) : (
                  <RouteSketch points={sketchPoints} aspect={1} markers={false} emptyLabel="" />
                )}
              </Link>
              <div className="draft-row-body">
                <Link href={`/routes/${item.id}`}>
                  <div className="draft-row-title">{item.title}</div>
                </Link>
                <div className="draft-row-meta">
                  {[item.author.displayName, item.cityName, `${item.pointCount} 个点位`]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <button type="button" className="mini-btn danger" onClick={() => unsave(item)}>
                移除
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
