import Link from 'next/link';

import { PostDetailScreen } from '../../../src/components/post/PostDetailScreen';
import { api } from '../../../src/lib/api';
import { getSessionUserId } from '../../../src/lib/session';
import type { RouteDetail } from '../../../src/types';

export const dynamic = 'force-dynamic';

export default async function RoutePage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
  const sessionUserId = await getSessionUserId();

  let route: RouteDetail;
  try {
    route = await api.getRoute(routeId);
  } catch (error) {
    return (
      <div>
        <div className="empty-state">
          <b>这篇内容暂时打不开</b>
          <span>{error instanceof Error ? error.message : `没有找到对应的记录：${routeId}`}</span>
          <Link className="btn btn-secondary" href="/">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return <PostDetailScreen detail={route} sessionUserId={sessionUserId} />;
}
