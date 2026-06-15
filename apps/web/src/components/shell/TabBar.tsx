'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HIDDEN_PREFIXES = ['/login', '/register'];

function HomeIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function RecordIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="11" r="3" fill={filled ? '#fff' : 'none'} />
      <path d="M12 21s-7-5.1-7-10a7 7 0 0 1 14 0c0 4.9-7 10-7 10z" />
    </svg>
  );
}

function StudioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FavoriteIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  );
}

function MeIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

export function TabBar() {
  const pathname = usePathname() ?? '/';

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const isHome = pathname === '/';
  const isRecord = pathname.startsWith('/record');
  const isStudio = pathname.startsWith('/studio');
  const isFavorites = pathname.startsWith('/favorites');
  const isMe = pathname.startsWith('/me');

  return (
    <nav className="tabbar">
      <Link className={`tab-item ${isHome ? 'active' : ''}`} href="/">
        <HomeIcon filled={isHome} />
        首页
      </Link>
      <Link className={`tab-item ${isRecord ? 'active' : ''}`} href="/record">
        <RecordIcon filled={isRecord} />
        记录
      </Link>

      <Link className={`tab-center ${isStudio ? 'active' : ''}`} href="/studio" aria-label="工作台">
        <span className="tab-center-btn">
          <StudioIcon />
        </span>
        <span className="tab-center-label">工作台</span>
      </Link>

      <Link className={`tab-item ${isFavorites ? 'active' : ''}`} href="/favorites">
        <FavoriteIcon filled={isFavorites} />
        收藏
      </Link>
      <Link className={`tab-item ${isMe ? 'active' : ''}`} href="/me">
        <MeIcon filled={isMe} />
        我的
      </Link>
    </nav>
  );
}
