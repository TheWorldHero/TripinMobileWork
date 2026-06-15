import { API_ORIGIN } from './config';
import type { MediaAsset } from '../types';

/**
 * 用户上传的图片由后端在 `/api/uploads/**` 静态托管（见后端 UploadConfig）。
 * 这里把存储里相对的 `/uploads/<name>` 解析成完整地址，使本地/线上/任意设备都能取到同一份图。
 */
function resolveUploadUrl(key: string): string {
  const path = key.startsWith('/') ? key : `/${key}`;
  return `${API_ORIGIN}/api${path}`;
}

/**
 * 解析媒体资源的可加载地址：
 * - 绝对 http(s) URL（如演示用 picsum）原样返回；
 * - `/uploads/...` / `uploads/...` 指向后端上传托管；
 * - 其他后端生成、无对外地址的 key（如 seed 的 `demo/...`）返回 null，UI 回退到路线小图。
 */
export function mediaUrl(media?: MediaAsset | null): string | null {
  const key = media?.storageKey;
  if (!key) {
    return null;
  }
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  if (key.startsWith('/uploads/') || key.startsWith('uploads/')) {
    return resolveUploadUrl(key);
  }
  if (key.startsWith('/')) {
    return key;
  }
  return null;
}

export function avatarUrlOf(url?: string | null): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return resolveUploadUrl(url);
  }
  if (url.startsWith('/')) {
    return url;
  }
  return null;
}

export function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'TR';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
