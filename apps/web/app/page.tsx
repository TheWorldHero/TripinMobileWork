import Link from 'next/link';

import { HomeFeed } from '../src/components/HomeFeed';
import { api } from '../src/lib/api';
import type { FeedItem } from '../src/types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let feedError: string | null = null;
  let items: FeedItem[] = [];

  try {
    const feed = await api.getFeed();
    items = feed.items;
  } catch (error) {
    feedError = error instanceof Error ? error.message : '首页内容流暂时不可用。';
  }

  return (
    <main className="site-shell home-page">
      <HomeFeed items={items} feedError={feedError} />

      <div className="home-entry-dock" aria-label="首页快捷入口">
        <Link className="home-side-entry" href="/record" aria-label="打开即时记录">
          <span className="home-side-entry-circle">记</span>
          <span className="home-side-entry-label">即时记录</span>
        </Link>

        <Link className="home-studio-fab" href="/studio" aria-label="打开工作台">
          <span className="home-studio-fab-circle">+</span>
          <span className="home-studio-fab-label">工作台</span>
        </Link>

        <Link className="home-side-entry" href="/me" aria-label="打开个人信息">
          <span className="home-side-entry-circle">我</span>
          <span className="home-side-entry-label">个人信息</span>
        </Link>
      </div>
    </main>
  );
}
