'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { api } from '../lib/api';
import type { FeedItem } from '../types';

type Props = {
  initialItems: FeedItem[];
};

export function FavoritesPage({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingId, startTransition] = useTransition();

  const handleRemove = (postId: string) => {
    startTransition(() => {
      void api
        .unsavePost(postId)
        .then(() => {
          setItems((current) => current.filter((item) => item.id !== postId));
          setFeedback('已从收藏中移除。');
        })
        .catch((error) =>
          setFeedback(error instanceof Error ? error.message : '移除收藏失败。'),
        );
    });
  };

  return (
    <main className="account-page">
      <section className="account-shell account-shell-narrow">
        <header className="account-topbar">
          <Link className="account-back" href="/me">
            ←
          </Link>
          <h1 className="account-title">收藏</h1>
          <div className="account-topbar-spacer" />
        </header>

        {feedback ? <p className="editor-feedback">{feedback}</p> : null}

        {items.length === 0 ? (
          <section className="account-card-list account-empty-card">
            <p className="hero-copy">你还没有收藏任何作品。</p>
          </section>
        ) : (
          <section className="favorites-list">
            {items.map((item) => (
              <article className="favorite-card" key={item.id}>
                <Link className="favorite-card-main" href={`/routes/${item.id}`}>
                  {item.coverMedia?.storageKey ? (
                    <img
                      className="favorite-card-image"
                      src={`/uploads/${item.coverMedia.storageKey}`}
                      alt={item.title}
                    />
                  ) : (
                    <div className="favorite-card-image favorite-card-image-empty">作品</div>
                  )}
                  <div className="favorite-card-copy">
                    <strong>{item.title}</strong>
                    <span>{item.summary || item.cityName || '已收藏的路线作品'}</span>
                    <small>
                      {item.author.displayName} · {item._count.likes} 赞 · {item._count.comments} 评论
                    </small>
                  </div>
                </Link>
                <button
                  className="editor-button"
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={pendingId}
                >
                  删除
                </button>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
