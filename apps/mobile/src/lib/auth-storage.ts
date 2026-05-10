import { File, Paths } from 'expo-file-system';

const FILE_NAME = 'tripin-auth.json';

export interface StoredAuth {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt?: string | null;
  refreshExpiresAt?: string | null;
}

function authFile(): File {
  return new File(Paths.document, FILE_NAME);
}

export async function loadAuth(): Promise<StoredAuth | null> {
  try {
    const file = authFile();
    if (!file.exists) return null;
    const text = await file.text();
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (
      !parsed ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string'
    ) {
      return null;
    }
    return parsed as StoredAuth;
  } catch {
    return null;
  }
}

export function saveAuth(value: StoredAuth): void {
  try {
    const file = authFile();
    if (!file.exists) {
      file.create();
    }
    file.write(JSON.stringify(value));
  } catch {
    // Persistence is best-effort; tokens still live in memory for the session.
  }
}

export function clearAuth(): void {
  try {
    const file = authFile();
    if (file.exists) {
      file.delete();
    }
  } catch {
    // ignore
  }
}
