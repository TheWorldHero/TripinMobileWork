'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { api } from '../../lib/api';
import type { UserSummary } from '../../types';
import { Avatar } from '../Avatar';
import { TopBar } from '../shell/TopBar';

export function ProfileEditScreen({ user }: { user: UserSummary }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!response.ok) {
        throw new Error('头像上传失败');
      }
      const uploaded = (await response.json()) as { url: string };
      setAvatarUrl(uploaded.url);
    } catch (caught) {
      setFeedback({ kind: 'error', text: caught instanceof Error ? caught.message : '头像上传失败' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (saving) return;
    if (!displayName.trim()) {
      setFeedback({ kind: 'error', text: '昵称不能为空' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await api.updateCurrentUser({
        displayName: displayName.trim(),
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setFeedback({ kind: 'success', text: '资料已保存' });
      router.refresh();
    } catch (caught) {
      setFeedback({ kind: 'error', text: caught instanceof Error ? caught.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <TopBar title="编辑资料" back>
        <button type="button" className="topbar-action" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </TopBar>

      {feedback ? <div className={`notice ${feedback.kind}`}>{feedback.text}</div> : null}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0 6px' }}>
        <Avatar name={displayName || user.displayName} url={avatarUrl || null} size={84} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void uploadAvatar(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="topbar-action"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '上传中…' : '更换头像'}
        </button>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <div className="field">
          <label className="field-label">昵称</label>
          <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">用户名</label>
          <input
            className="input"
            value={username}
            placeholder="唯一用户名，用于 @ 你"
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">简介</label>
          <textarea
            className="textarea"
            value={bio}
            placeholder="介绍一下自己"
            onChange={(event) => setBio(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
