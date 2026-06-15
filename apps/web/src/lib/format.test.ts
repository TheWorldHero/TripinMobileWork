import { describe, expect, it } from 'vitest';

import { datetimeLocalToIso, formatCoordinate, formatRelativeTime, toDatetimeLocalValue } from './format';

describe('formatRelativeTime', () => {
  it('handles empty and invalid input', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });

  it('formats recent times in Chinese', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('刚刚');
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5 分钟前');
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3 小时前');
  });
});

describe('formatCoordinate', () => {
  it('formats valid pairs and rejects missing values', () => {
    expect(formatCoordinate(39.9042, 116.4074)).toBe('39.9042, 116.4074');
    expect(formatCoordinate(null, 116.4)).toBe('');
  });
});

describe('datetime-local conversion', () => {
  it('round-trips a datetime-local value', () => {
    const value = toDatetimeLocalValue(new Date('2026-06-12T08:30:00'));
    expect(value).toMatch(/^2026-06-12T08:30$/);
    const iso = datetimeLocalToIso(value);
    expect(iso).not.toBeNull();
    expect(new Date(iso as string).getMinutes()).toBe(30);
  });

  it('returns null for empty input', () => {
    expect(datetimeLocalToIso('')).toBeNull();
  });
});
