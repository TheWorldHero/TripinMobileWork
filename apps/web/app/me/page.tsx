import Link from 'next/link';

import { LogoutButton } from '../../src/components/LogoutButton';
import { api } from '../../src/lib/api';
import { requireSessionUserId } from '../../src/lib/session';

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

export default async function MePage() {
  await requireSessionUserId();
  const user = await api.getCurrentUser();
  const savedPosts = await api.getUserSavedPosts(user.id);
  const publishedPosts = await api.getUserPosts(user.id);

  return (
    <main className="account-page">
      <section className="account-shell">
        <header className="account-topbar">
          <Link className="account-back" href="/">
            ←
          </Link>
          <h1 className="account-title">个人信息</h1>
          <div className="account-topbar-spacer" />
        </header>

        <section className="account-hero">
          <div className="account-avatar">
            {user.avatarUrl ? (
              <img className="account-avatar-image" src={user.avatarUrl} alt={user.displayName} />
            ) : (
              <span>{user.displayName.slice(0, 1) || '我'}</span>
            )}
          </div>
          <div className="account-hero-copy">
            <h2>{user.displayName}</h2>
            <p>{formatHandle(user.username, user.id)}</p>
            <small>{user.bio?.trim() || '把你的路线、即时记录和收藏都整理在这里。'}</small>
          </div>
        </section>

        <section className="account-card-list">
          <Link className="account-row" href="/me/profile">
            <span className="account-row-icon">人</span>
            <span className="account-row-text">个人信息</span>
            <span className="account-row-meta">编辑</span>
            <span className="account-row-arrow">›</span>
          </Link>
          <Link className="account-row" href={`/users/${user.id}`}>
            <span className="account-row-icon">路</span>
            <span className="account-row-text">我的发布</span>
            <span className="account-row-meta">{publishedPosts.length} 条</span>
            <span className="account-row-arrow">›</span>
          </Link>
          <Link className="account-row" href="/favorites">
            <span className="account-row-icon">藏</span>
            <span className="account-row-text">收藏</span>
            <span className="account-row-meta">{savedPosts.length} 条</span>
            <span className="account-row-arrow">›</span>
          </Link>
        </section>

        <section className="account-card-list">
          <Link className="account-row" href="/record">
            <span className="account-row-icon">记</span>
            <span className="account-row-text">即时记录</span>
            <span className="account-row-meta">当前位置</span>
            <span className="account-row-arrow">›</span>
          </Link>
          <Link className="account-row" href="/studio">
            <span className="account-row-icon">＋</span>
            <span className="account-row-text">工作台</span>
            <span className="account-row-meta">继续编辑</span>
            <span className="account-row-arrow">›</span>
          </Link>
          <div className="account-row">
            <span className="account-row-icon">退</span>
            <span className="account-row-text">退出登录</span>
            <span className="account-row-meta" />
            <LogoutButton />
          </div>
        </section>
      </section>
    </main>
  );
}
