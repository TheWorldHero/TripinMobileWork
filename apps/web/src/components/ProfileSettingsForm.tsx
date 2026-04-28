'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { api } from '../lib/api';
import type { UserSummary } from '../types';

type Props = {
  initialUser: UserSummary;
};

export function ProfileSettingsForm({ initialUser }: Props) {
  const [displayName, setDisplayName] = useState(initialUser.displayName ?? '');
  const [username, setUsername] = useState(initialUser.username ?? '');
  const [bio, setBio] = useState(initialUser.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl ?? '');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const handleSave = () => {
    startSaving(() => {
      void api
        .updateCurrentUser({
          displayName: displayName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl.trim(),
        })
        .then(() => setFeedback('个人信息已保存。'))
        .catch((error) =>
          setFeedback(error instanceof Error ? error.message : '保存个人信息失败。'),
        );
    });
  };

  return (
    <main className="account-page">
      <section className="account-shell account-shell-narrow">
        <header className="account-topbar">
          <Link className="account-back" href="/me">
            ←
          </Link>
          <h1 className="account-title">编辑个人信息</h1>
          <div className="account-topbar-spacer" />
        </header>

        <section className="account-card-list account-form-card">
          <label className="studio-field">
            <span>昵称</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label className="studio-field">
            <span>用户名</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="studio-field">
            <span>头像链接</span>
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
          </label>
          <label className="studio-field">
            <span>简介</span>
            <textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
          </label>

          <div className="studio-inline-actions">
            <button
              className="editor-button editor-button-primary"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '保存中…' : '保存'}
            </button>
            <Link className="editor-button" href="/me">
              返回
            </Link>
          </div>

          {feedback ? <p className="editor-feedback">{feedback}</p> : null}
        </section>
      </section>
    </main>
  );
}
