export type ReorderDirection = 'up' | 'down';

export type RefreshPlanSegment = {
  key: string;
  fromPointId: string;
  toPointId: string;
  status: 'clean' | 'dirty';
};

function buildSegmentPairs(pointIds: string[]) {
  return pointIds.slice(0, -1).map((fromPointId, index) => {
    const toPointId = pointIds[index + 1];
    return {
      key: `${fromPointId}->${toPointId}`,
      fromPointId,
      toPointId,
    };
  });
}

export function reorderPointIds(
  pointIds: string[],
  pointId: string,
  direction: ReorderDirection,
) {
  const currentIndex = pointIds.indexOf(pointId);
  if (currentIndex === -1) {
    return pointIds;
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= pointIds.length) {
    return pointIds;
  }

  const nextPointIds = [...pointIds];
  [nextPointIds[currentIndex], nextPointIds[targetIndex]] = [
    nextPointIds[targetIndex],
    nextPointIds[currentIndex],
  ];
  return nextPointIds;
}

export function buildRefreshPlan(
  routedPointIds: string[],
  editedPointIds: string[],
): RefreshPlanSegment[] {
  const routedSegments = new Set(
    buildSegmentPairs(routedPointIds).map((segment) => segment.key),
  );

  return buildSegmentPairs(editedPointIds).map((segment) => ({
    ...segment,
    status: routedSegments.has(segment.key) ? 'clean' : 'dirty',
  }));
}
