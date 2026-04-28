import { TripDraftStudio } from '../../src/components/TripDraftStudio';
import { api } from '../../src/lib/api';
import { requireSessionUserId } from '../../src/lib/session';
import type { TripDraft } from '../../src/types';

export const dynamic = 'force-dynamic';

async function loadWorkingTrip(): Promise<TripDraft> {
  const trips = await api.listTrips();
  if (trips.length > 0) {
    return trips[0];
  }

  return api.createTrip({
    title: '未命名路线',
    visibility: 'PRIVATE',
  });
}

export default async function StudioPage() {
  await requireSessionUserId();
  const trip = await loadWorkingTrip();
  return <TripDraftStudio initialTrip={trip} />;
}
