import { MeScreen } from '../../src/components/profile/MeScreen';
import { api } from '../../src/lib/api';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function MePage() {
  await requireSessionUserId();
  const user = await api.getCurrentUser();
  const [posts, saves, trips, follow] = await Promise.all([
    api.getUserPosts(user.id),
    api.getUserSavedPosts(user.id),
    api.listTrips(),
    api.getFollowStatus(user.id),
  ]);

  return (
    <MeScreen
      user={user}
      posts={posts}
      saves={saves}
      trips={trips}
      followersCount={follow.followersCount}
      followingCount={follow.followingCount}
    />
  );
}
