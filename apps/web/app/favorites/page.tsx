import { FavoritesPage } from '../../src/components/FavoritesPage';
import { api } from '../../src/lib/api';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function FavoritesRoutePage() {
  await requireSessionUserId();
  const user = await api.getCurrentUser();
  const items = await api.getUserSavedPosts(user.id);

  return <FavoritesPage initialItems={items} />;
}
