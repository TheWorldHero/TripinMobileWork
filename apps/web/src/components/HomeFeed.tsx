import { buildHomeFeedPosts } from '../home-feed/demo-posts';
import type { FeedItem } from '../types';
import { RouteFeedPost } from './home-feed/RouteFeedPost';
import styles from './home-feed/HomeFeedRedesign.module.css';
import { ThinSiteHeader } from './home-feed/ThinSiteHeader';

export function HomeFeed({
  items,
}: {
  items: FeedItem[];
  feedError?: string | null;
}) {
  const posts = buildHomeFeedPosts(items);

  return (
    <section className={styles.feedScene} aria-label="TripIn 社区首页">
      <ThinSiteHeader />

      <div className={styles.feedColumn}>
        {posts.length ? (
          <div className={styles.feedRail}>
            {posts.map((post) => (
              <RouteFeedPost key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>暂无内容发布</p>
          </div>
        )}
      </div>
    </section>
  );
}
