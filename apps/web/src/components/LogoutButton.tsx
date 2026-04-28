'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(() => {
      void fetch('/api/auth/logout', { method: 'POST' }).then(() => {
        router.push('/login');
        router.refresh();
      });
    });
  };

  return (
    <button className="editor-button" type="button" onClick={handleLogout} disabled={isPending}>
      {isPending ? '退出中…' : '退出登录'}
    </button>
  );
}
