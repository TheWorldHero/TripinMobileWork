'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export function TopBar({
  title,
  back = false,
  children,
}: {
  title?: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="topbar">
      {back ? (
        <button
          type="button"
          className="topbar-back"
          aria-label="返回"
          onClick={() => router.back()}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      ) : null}
      {title ? <div className="topbar-title">{title}</div> : <div className="topbar-spacer" />}
      {children}
    </header>
  );
}
