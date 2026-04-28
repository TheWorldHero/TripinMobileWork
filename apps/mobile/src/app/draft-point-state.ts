import type { DraftPoint, PointRecord } from '../types';

function createDraftPointId() {
  return `draft-point-${Date.now()}`;
}

export function createDraftPointAfterMedia(mediaAssetId: string): DraftPoint {
  const createdAt = new Date().toISOString();

  return {
    id: createDraftPointId(),
    mediaAssetId,
    mediaAssetIds: [mediaAssetId],
    sourceType: 'MEDIA',
    state: 'NEEDS_LOCATION',
    status: 'NEEDS_LOCATION',
    title: '',
    note: '',
    createdAt,
    capturedAt: createdAt,
    checkInAt: null,
    placeId: null,
    latitude: null,
    longitude: null,
    mediaCount: 1,
  };
}

export function createDraftPointFromPoint(
  point: PointRecord,
  sourceType: DraftPoint['sourceType'] = 'MEDIA',
): DraftPoint {
  const firstMediaAssetId = point.mediaAssetIds[0] ?? 'draft-media';

  return {
    id: point.id,
    mediaAssetId: firstMediaAssetId,
    mediaAssetIds: point.mediaAssetIds,
    sourceType,
    state: point.state,
    status: point.state,
    title: point.title ?? '',
    note: point.note ?? '',
    createdAt: point.capturedAt ?? new Date().toISOString(),
    capturedAt: point.capturedAt ?? null,
    checkInAt: point.checkInAt ?? null,
    placeId: point.placeId ?? null,
    latitude: point.latitude ?? null,
    longitude: point.longitude ?? null,
    mediaCount: point.mediaCount,
  };
}
