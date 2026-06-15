import Link from 'next/link';

import { Avatar } from '../../../src/components/Avatar';
import { FollowButton } from '../../../src/components/profile/FollowButton';
import { PostGrid } from '../../../src/components/profile/PostGrid';
import { TopBar } from '../../../src/components/shell/TopBar';
import { api } from '../../../src/lib/api';
import { getSessionUserId } from '../../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function UserSpacePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  try {
    const [sessionUserId, user, posts, follow] = await Promise.all([
      getSessionUserId(),
      api.getUserProfile(userId),
      api.getUserPosts(userId),
      api.getFollowStatus(userId),
    ]);
    const isSelf = sessionUserId === userId;

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
              <b>{follow.followersCount}</b>
              <span>粉丝</span>
            </div>
            <div className="profile-stat">
              <b>{follow.followingCount}</b>
              <span>关注</span>
            </div>
          </div>
        </div>

        <div className="profile-bio">
          <b>{user.displayName}</b>
          {user.username ? <span className="username">@{user.username}</span> : null}
          {user.bio ? <p>{user.bio}</p> : null}
        </div>

        {!isSelf && sessionUserId ? (
          <div className="profile-actions">
            <FollowButton userId={userId} initial={follow} />
          </div>
        ) : null}

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
