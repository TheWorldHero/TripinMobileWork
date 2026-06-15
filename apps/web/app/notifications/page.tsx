import { NotificationsScreen } from '../../src/components/notifications/NotificationsScreen';
import { requireSessionUserId } from '../../src/lib/session';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireSessionUserId();
  return <NotificationsScreen />;
}
