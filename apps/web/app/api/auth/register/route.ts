import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '../../../../src/lib/session';
import { API_BASE_URL } from '../../../../src/lib/config';

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    return new NextResponse(text || '注册失败', { status: response.status });
  }

  const payload = JSON.parse(text) as {
    sessionUserId: string;
    user: Record<string, unknown>;
  };

  const nextResponse = NextResponse.json(payload);
  nextResponse.cookies.set(SESSION_COOKIE_NAME, payload.sessionUserId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return nextResponse;
}
