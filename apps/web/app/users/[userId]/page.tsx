import Link from 'next/link';

import { Avatar } from '../../../src/components/Avatar';
import { PostGrid } from '../../../src/components/profile/PostGrid';
import { TopBar } from '../../../src/components/shell/TopBar';
import { api } from '../../../src/lib/api';

export const dynamic = 'force-dynamic';

export default async function UserSpacePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  try {
    const [user, posts] = await Promise.all([api.getUserProfile(userId), api.getUserPosts(userId)]);
    const totalLikes = posts.reduce((sum, post) => sum + (post._count?.likes ?? 0), 0);

    return (
      <div>
        <TopBar title={user.username ? `@${user.username}` : user.displayName} back />

        <div className="profile-head">
          <Avatar name={user.displayName} url={user.avatarUrl} size={72} />
          <div className="profile-stats">
            <div className="profile-stat">
              <b>{posts.length}</b>
              <span>作品</span>
            </div>
            <div className="profile-stat">
              <b>{totalLikes}</b>
              <span>获赞</span>
            </div>
            <div className="profile-stat">
              <b>{posts.reduce((sum, post) => sum + (post._count?.saves ?? 0), 0)}</b>
              <span>被收藏</span>
            </div>
          </div>
        </div>

        <div className="profile-bio">
          <b>{user.displayName}</b>
          {user.username ? <span className="username">@{user.username}</span> : null}
          {user.bio ? <p>{user.bio}</p> : null}
        </div>

        <div className="profile-tabs" style={{ marginTop: 14 }}>
          <span className="profile-tab active" style={{ gridColumn: '1 / -1' }}>
            作品
          </span>
        </div>

        <PostGrid items={posts} emptyText="ta 还没有发布作品。" />
      </div>
    );
  } catch (error) {
    return (
      <div>
        <TopBar title="用户空间" back />
        <div className="empty-state">
          <b>没有找到这个用户</b>
          <span>{error instanceof Error ? error.message : userId}</span>
          <Link href="/" className="btn btn-secondary">
            返回首页
          </Link>
        </div>
      </div>
    );
  }
}
