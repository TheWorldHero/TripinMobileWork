import { describe, expect, it } from 'vitest';
import { createDraftPointAfterMedia } from './draft-point-state';

describe('createDraftPointAfterMedia', () => {
  it('creates a local draft point that still needs location confirmation', () => {
    const draftPoint = createDraftPointAfterMedia('media-asset-42');

    expect(draftPoint).toMatchObject({
      mediaAssetId: 'media-asset-42',
      mediaAssetIds: ['media-asset-42'],
      sourceType: 'MEDIA',
      state: 'NEEDS_LOCATION',
      status: 'NEEDS_LOCATION',
      title: '',
      note: '',
      checkInAt: null,
      placeId: null,
      latitude: null,
      longitude: null,
      mediaCount: 1,
    });
    expect(draftPoint.id).toEqual(expect.any(String));
    expect(draftPoint.id).toContain('draft-point-');
    expect(draftPoint.createdAt).toEqual(expect.any(String));
    expect(draftPoint.capturedAt).toBe(draftPoint.createdAt);
  });
});
