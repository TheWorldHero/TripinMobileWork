import { describe, expect, it } from 'vitest';

import { buildRefreshPlan, reorderPointIds } from './line-editor-state';

describe('buildRefreshPlan', () => {
  it('marks only the segments touched by a reordered middle point as dirty', () => {
    const originalPointIds = ['point-1', 'point-2', 'point-3', 'point-4'];
    const reorderedPointIds = reorderPointIds(originalPointIds, 'point-3', 'up');

    expect(reorderedPointIds).toEqual(['point-1', 'point-3', 'point-2', 'point-4']);
    expect(buildRefreshPlan(originalPointIds, reorderedPointIds)).toEqual([
      {
        key: 'point-1->point-3',
        fromPointId: 'point-1',
        toPointId: 'point-3',
        status: 'dirty',
      },
      {
        key: 'point-3->point-2',
        fromPointId: 'point-3',
        toPointId: 'point-2',
        status: 'dirty',
      },
      {
        key: 'point-2->point-4',
        fromPointId: 'point-2',
        toPointId: 'point-4',
        status: 'dirty',
      },
    ]);
  });

  it('returns a clean plan when the order does not change', () => {
    const pointIds = ['point-1', 'point-2', 'point-3'];

    expect(buildRefreshPlan(pointIds, pointIds)).toEqual([
      {
        key: 'point-1->point-2',
        fromPointId: 'point-1',
        toPointId: 'point-2',
        status: 'clean',
      },
      {
        key: 'point-2->point-3',
        fromPointId: 'point-2',
        toPointId: 'point-3',
        status: 'clean',
      },
    ]);
  });
});
