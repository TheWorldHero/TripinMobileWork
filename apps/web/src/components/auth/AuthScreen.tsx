'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const isLogin = mode === 'login';

  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);

    if (isLogin) {
      if (!identifier.trim() || !password) {
        setError('请输入账号和密码');
        return;
      }
    } else {
      if (!username.trim() || !displayName.trim() || !password) {
        setError('用户名、昵称和密码都是必填的');
        return;
      }
      if (password.length < 6) {
        setError('密码长度至少需要 6 位');
        return;
      }
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isLogin
            ? { identifier: identifier.trim(), password }
            : {
                username: username.trim(),
                displayName: displayName.trim(),
                email: email.trim() || undefined,
                password,
              },
        ),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
          const parsed = JSON.parse(text) as { message?: string };
          message = parsed.message ?? text;
        } catch {
          // keep raw text
        }
        throw new Error(message || (isLogin ? '登录失败' : '注册失败'));
      }

      router.push('/');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '操作失败，请重试');
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        Trip<em>In</em>
      </div>
      <p className="auth-tagline">记录路线，分享生活</p>

      <div className="auth-form">
        {error ? <div className="auth-error">{error}</div> : null}

        {isLogin ? (
          <input
            className="input"
            value={identifier}
            placeholder="用户名或邮箱"
            autoComplete="username"
            onChange={(event) => setIdentifier(event.target.value)}
          />
        ) : (
          <>
            <input
              className="input"
              value={username}
              placeholder="用户名（唯一）"
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
            />
            <input
              className="input"
              value={displayName}
              placeholder="昵称"
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <input
              className="input"
              value={email}
              type="email"
              placeholder="邮箱（可选）"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </>
        )}

        <input
          className="input"
          value={password}
          type="password"
          placeholder={isLogin ? '密码' : '密码（至少 6 位）'}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
        />

        <button type="button" className="btn btn-gradient btn-block" onClick={submit} disabled={busy}>
          {busy ? '请稍候…' : isLogin ? '登录' : '注册'}
        </button>
      </div>

      <div className="auth-switch">
        {isLogin ? (
          <>
            还没有账号？<Link href="/register">立即注册</Link>
          </>
        ) : (
          <>
            已有账号？<Link href="/login">直接登录</Link>
          </>
        )}
        <div style={{ marginTop: 10 }}>
          <Link href="/" className="muted">
            先逛逛社区 →
          </Link>
        </div>
      </div>
    </div>
  );
}
