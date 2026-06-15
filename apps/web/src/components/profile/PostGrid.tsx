'use client';

import Link from 'next/link';

import { mediaUrl } from '../../lib/media';
import type { FeedItem } from '../../types';
import { RouteSketch } from '../RouteSketch';

export function PostGrid({ items, emptyText }: { items: FeedItem[]; emptyText: string }) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="post-grid">
      {items.map((item) => {
        const cover = mediaUrl(item.coverMedia);
        const sketchPoints = (item.trip.routePreview ?? []).map((point, index) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          id: `${item.id}-${index}`,
        }));
        return (
          <Link key={item.id} href={`/routes/${item.id}`} className="post-grid-tile">
            {cover ? (
              <img src={cover} alt={item.title} />
            ) : (
              <span className="tile-fallback">
                <RouteSketch points={sketchPoints} aspect={1} markers={false} emptyLabel="" />
                <span className="tile-label">{item.title}</span>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
