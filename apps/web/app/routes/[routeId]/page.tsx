import Link from 'next/link';

import { RouteStoryPreview } from '../../../src/components/RouteStoryPreview';
import { api } from '../../../src/lib/api';
import type { RouteDetail } from '../../../src/types';

export const dynamic = 'force-dynamic';

function RouteFailure({ routeId, message }: { routeId: string; message: string }) {
  return (
    <main className="site-shell route-page">
      <section className="route-header route-header-empty">
        <p className="eyebrow">路线暂时不可用</p>
        <h1 className="page-title">这篇路线内容暂时打不开。</h1>
        <p className="hero-copy">{message || `没有找到对应的路线记录：${routeId}`}</p>
        <Link className="text-link" href="/">
          返回首页
        </Link>
      </section>
    </main>
  );
}

export default async function RoutePage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;

  let route: RouteDetail;
  try {
    route = await api.getRoute(routeId);
  } catch (error) {
    return (
      <RouteFailure
        routeId={routeId}
        message={error instanceof Error ? error.message : '读取路线时发生了未知错误。'}
      />
    );
  }

  return (
    <main className="site-shell route-page">
      <RouteStoryPreview route={route} backHref="/" backLabel="首页" />
    </main>
  );
}
