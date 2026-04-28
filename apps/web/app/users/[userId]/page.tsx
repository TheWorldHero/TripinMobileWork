import Link from 'next/link';

import { HomeFeed } from '../../../src/components/HomeFeed';
import { api } from '../../../src/lib/api';

export const dynamic = 'force-dynamic';

function formatHandle(username?: string | null, fallbackId?: string) {
  if (username && username.trim()) {
    return `@${username.trim()}`;
  }
  if (!fallbackId) {
    return '@tripin-user';
  }
  return `ID ${fallbackId.slice(0, 8)}`;
}

export default async function UserSpacePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await api.getUserProfile(userId);
  const posts = await api.getUserPosts(userId);
  const totalLikes = posts.reduce((sum, post) => sum + (post._count?.likes ?? 0), 0);

  return (
    <main className="user-space-page">
      <section className="user-space-shell">
        <header className="user-space-topbar">
          <Link className="account-back" href="/">
            ←
          </Link>
          <h1 className="user-space-topbar-title">用户空间</h1>
          <div className="account-topbar-spacer" />
        </header>

        <section className="user-space-hero">
          <div className="user-space-avatar">
            {user.avatarUrl ? (
              <img className="account-avatar-image" src={user.avatarUrl} alt={user.displayName} />
            ) : (
              <span>{user.displayName.slice(0, 1) || '用'}</span>
            )}
          </div>

          <div className="user-space-hero-copy">
            <p className="eyebrow">TripIn 用户空间</p>
            <h2>{user.displayName}</h2>
            <p className="user-space-handle">{formatHandle(user.username, user.id)}</p>
            <p className="user-space-bio">{user.bio?.trim() || '这个用户还没有填写简介。'}</p>

            <div className="user-space-stats">
              <div className="user-space-stat">
                <strong>{posts.length}</strong>
                <span>发布</span>
              </div>
              <div className="user-space-stat">
                <strong>{totalLikes}</strong>
                <span>获赞</span>
              </div>
            </div>

            <div className="user-space-actions">
              <Link className="editor-button editor-button-primary" href="/">
                返回首页
              </Link>
              <Link className="editor-button" href="/studio">
                去工作台
              </Link>
            </div>
          </div>
        </section>

        <section className="user-space-section-head">
          <div>
            <p className="eyebrow">作品列表</p>
            <h3>ta 发布的内容</h3>
          </div>
          <span>{posts.length} 条作品</span>
        </section>
      </section>

      <HomeFeed items={posts} />
    </main>
  );
}
