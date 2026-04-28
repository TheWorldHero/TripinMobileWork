import { InstantRecordPage } from '../../src/components/InstantRecordPage';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function RecordPage() {
  await requireSessionUserId();
  return <InstantRecordPage />;
}
