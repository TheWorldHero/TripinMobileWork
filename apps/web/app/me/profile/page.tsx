import { ProfileEditScreen } from '../../../src/components/profile/ProfileEditScreen';
import { api } from '../../../src/lib/api';
import { requireSessionUserId } from '../../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function MeProfilePage() {
  await requireSessionUserId();
  const user = await api.getCurrentUser();
  return <ProfileEditScreen user={user} />;
}
