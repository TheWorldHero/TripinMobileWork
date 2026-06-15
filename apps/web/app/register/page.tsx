import { AuthScreen } from '../../src/components/auth/AuthScreen';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
