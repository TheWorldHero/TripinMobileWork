import { AuthForm } from '../../src/components/AuthForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
