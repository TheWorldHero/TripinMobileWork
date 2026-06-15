import { StudioScreen } from '../../src/components/studio/StudioScreen';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  await requireSessionUserId();
  return <StudioScreen />;
}
