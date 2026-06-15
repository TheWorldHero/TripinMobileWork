import { describe, expect, it } from 'vitest';

import { initialsOf, mediaUrl } from './media';

// 测试环境无 NEXT_PUBLIC_API_BASE_URL，默认 http://localhost:3001/api/v1 → origin http://localhost:3001
const ORIGIN = 'http://localhost:3001';

describe('mediaUrl', () => {
  it('resolves upload keys against the backend uploads endpoint, passes through absolute urls', () => {
    expect(mediaUrl({ id: 'm1', storageKey: '/uploads/a.jpg' })).toBe(`${ORIGIN}/api/uploads/a.jpg`);
    expect(mediaUrl({ id: 'm2', storageKey: 'uploads/b.jpg' })).toBe(`${ORIGIN}/api/uploads/b.jpg`);
    expect(mediaUrl({ id: 'm3', storageKey: 'https://cdn.example.com/c.jpg' })).toBe(
      'https://cdn.example.com/c.jpg',
    );
  });

  it('returns null for unresolvable backend keys so the UI falls back to the route sketch', () => {
    expect(mediaUrl({ id: 'm4', storageKey: 'demo/media-demo.jpg' })).toBeNull();
    expect(mediaUrl({ id: 'm5', storageKey: null })).toBeNull();
    expect(mediaUrl(null)).toBeNull();
  });
});

describe('initialsOf', () => {
  it('builds avatar initials', () => {
    expect(initialsOf('Li Wen')).toBe('LW');
    expect(initialsOf('张三')).toBe('张三');
    expect(initialsOf('')).toBe('TR');
  });
});
