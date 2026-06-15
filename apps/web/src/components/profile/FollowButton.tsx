'use client';

import { useState } from 'react';

import { api } from '../../lib/api';
import type { FollowStatus } from '../../types';

/** 关注/取关按钮：自带状态，点击即切换。粉丝数随之本地更新（页面其它处的计数刷新后一致）。 */
export function FollowButton({
  userId,
  initial,
  onChange,
}: {
  userId: string;
  initial: FollowStatus;
  onChange?: (status: FollowStatus) => void;
}) {
  const [status, setStatus] = useState<FollowStatus>(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = status.following
        ? await api.unfollowUser(userId)
        : await api.followUser(userId);
      setStatus(next);
      onChange?.(next);
    } catch {
      // 网络失败：保持原状态
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn follow-btn ${status.following ? 'btn-secondary' : 'btn-gradient'}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={status.following}
    >
      {status.following ? '已关注' : '+ 关注'}
    </button>
  );
}
