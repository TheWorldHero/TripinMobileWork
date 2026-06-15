import { RecordScreen } from '../../src/components/record/RecordScreen';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function RecordPage() {
  await requireSessionUserId();
  return <RecordScreen />;
}
