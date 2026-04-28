import Link from 'next/link';

import { TripDraftStudio } from '../../../src/components/TripDraftStudio';
import { api } from '../../../src/lib/api';
import type { TripDraft } from '../../../src/types';

export const dynamic = 'force-dynamic';

function StudioFailure({ tripId, message }: { tripId: string; message: string }) {
  return (
    <main className="site-shell studio-page">
      <section className="studio-card">
        <p className="eyebrow">工作台暂时不可用</p>
        <h1 className="page-title">这条草稿暂时打不开。</h1>
        <p className="hero-copy">{message || `没有找到这条草稿：${tripId}`}</p>
        <Link className="text-link" href="/studio">
          返回工作台
        </Link>
      </section>
    </main>
  );
}

export default async function TripStudioPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  let trip: TripDraft;
  try {
    trip = await api.getTrip(tripId);
  } catch (error) {
    return (
      <StudioFailure
        tripId={tripId}
        message={error instanceof Error ? error.message : '读取草稿时发生了未知错误。'}
      />
    );
  }

  return <TripDraftStudio initialTrip={trip} />;
}
