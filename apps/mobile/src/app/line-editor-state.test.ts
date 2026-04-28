import { describe, expect, it } from 'vitest';
import { canPublishLine } from './line-editor-state';

describe('canPublishLine', () => {
  it('requires every point to be ready', () => {
    expect(
      canPublishLine([
        { id: 'p1', state: 'READY_FOR_LINE' },
        { id: 'p2', state: 'NEEDS_LOCATION' },
      ]),
    ).toBe(false);
  });
});
