import { FavoritesScreen } from '../../src/components/profile/FavoritesScreen';
import { api } from '../../src/lib/api';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function FavoritesRoutePage() {
  await requireSessionUserId();
  const user = await api.getCurrentUser();
  const items = await api.getUserSavedPosts(user.id);

  return <FavoritesScreen initialItems={items} />;
}
