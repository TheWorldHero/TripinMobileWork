import { FeedScreen } from '../src/components/feed/FeedScreen';
import { api } from '../src/lib/api';
import { getSessionUserId } from '../src/lib/session';
import type { FeedItem } from '../src/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const sessionUserId = await getSessionUserId();

  let items: FeedItem[] = [];
  let error: string | null = null;
  try {
    const feed = await api.getFeed();
    items = feed.items;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : '加载动态失败，请稍后重试。';
  }

  return <FeedScreen items={items} error={error} loggedIn={Boolean(sessionUserId)} />;
}
