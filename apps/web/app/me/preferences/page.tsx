import { PreferencesScreen } from '../../../src/components/profile/PreferencesScreen';
import { requireSessionUserId } from '../../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function PreferencesPage() {
  await requireSessionUserId();
  return <PreferencesScreen />;
}
