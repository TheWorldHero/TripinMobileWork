'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

/** 首页顶栏的通知铃铛：挂载时拉未读数，>0 时显示红点角标。 */
export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .getUnreadNotificationCount()
      .then((value) => {
        if (active) setCount(value);
      })
      .catch(() => {
        // 未登录 / 后端不可达：不显示角标即可
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link href="/notifications" className="icon-btn" aria-label="通知">
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 ? <span className="icon-badge">{count > 99 ? '99+' : count}</span> : null}
    </Link>
  );
}
