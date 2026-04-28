'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setFeedback(null);
    startTransition(() => {
      void fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { identifier, password }
            : { email, username, displayName, password },
        ),
      })
        .then(async (response) => {
          const text = await response.text();
          if (!response.ok) {
            throw new Error(text || (mode === 'login' ? '登录失败' : '注册失败'));
          }
          return text ? JSON.parse(text) : {};
        })
        .then(() => {
          router.push('/');
          router.refresh();
        })
        .catch((error) =>
          setFeedback(error instanceof Error ? error.message : '提交失败'),
        );
    });
  };

  return (
    <main className="account-page">
      <section className="account-shell account-shell-narrow">
        <header className="account-topbar">
          <Link className="account-back" href="/">
            ←
          </Link>
          <h1 className="account-title">{mode === 'login' ? '登录' : '注册'}</h1>
          <div className="account-topbar-spacer" />
        </header>

        <section className="account-card-list account-form-card">
          {mode === 'register' ? (
            <>
              <label className="studio-field">
                <span>邮箱</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="studio-field">
                <span>用户名</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} />
              </label>
              <label className="studio-field">
                <span>昵称</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            </>
          ) : (
            <label className="studio-field">
              <span>用户名或邮箱</span>
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
            </label>
          )}

          <label className="studio-field">
            <span>密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          <div className="studio-inline-actions">
            <button className="editor-button editor-button-primary" type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? '提交中…' : mode === 'login' ? '登录' : '注册'}
            </button>
            <Link className="editor-button" href={mode === 'login' ? '/register' : '/login'}>
              {mode === 'login' ? '去注册' : '去登录'}
            </Link>
          </div>

          {feedback ? <p className="editor-feedback">{feedback}</p> : null}
        </section>
      </section>
    </main>
  );
}
