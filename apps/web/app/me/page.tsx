import { MeScreen } from '../../src/components/profile/MeScreen';
import { api } from '../../src/lib/api';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function MePage() {
  await requireSessionUserId();
  const user = await api.getCurrentUser();
  const [posts, saves, trips] = await Promise.all([
    api.getUserPosts(user.id),
    api.getUserSavedPosts(user.id),
    api.listTrips(),
  ]);

  return <MeScreen user={user} posts={posts} saves={saves} trips={trips} />;
}
