export function canPublishLine(points: Array<{ id?: string; state?: string | null }>) {
  return points.length > 0 && points.every((point) => point.state === 'READY_FOR_LINE');
}
