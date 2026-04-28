import { ProfileSettingsForm } from '../../../src/components/ProfileSettingsForm';
import { api } from '../../../src/lib/api';

export const dynamic = 'force-dynamic';

export default async function MeProfilePage() {
  const user = await api.getCurrentUser();
  return <ProfileSettingsForm initialUser={user} />;
}
