export const SESSION_COOKIE_NAME = 'tripin_session_user';

function parseCookieValue(cookieString: string, key: string) {
  const parts = cookieString.split(';').map((part) => part.trim());
  const pair = parts.find((part) => part.startsWith(`${key}=`));
  if (!pair) {
    return null;
  }
  return decodeURIComponent(pair.slice(key.length + 1));
}

export async function getSessionUserId() {
  if (typeof window !== 'undefined') {
    return parseCookieValue(document.cookie, SESSION_COOKIE_NAME);
  }

  const { cookies } = await import('next/headers');
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function requireSessionUserId() {
  const userId = await getSessionUserId();
  if (!userId) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  return userId;
}
