import { api } from './api';
import type { MediaAsset } from '../types';

type UploadTarget = {
  tripId?: string;
  tripPointId?: string;
  caption?: string;
};

/**
 * Uploads a browser File to the local uploads endpoint, registers it as a
 * media asset in the backend and marks it ready. Returns the READY asset.
 */
export async function uploadMediaFile(file: File, target?: UploadTarget): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/uploads', { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error('图片上传失败，请重试。');
  }

  const uploaded = (await response.json()) as {
    storageKey: string;
    originalName: string;
    mimeType: string;
    bytes: number;
  };

  const created = await api.createMediaAsset({
    originalName: uploaded.originalName,
    mimeType: uploaded.mimeType || 'application/octet-stream',
    bytes: Math.max(1, uploaded.bytes),
    caption: target?.caption,
    tripId: target?.tripId,
    tripPointId: target?.tripPointId,
  });

  return api.markMediaReady(created.id, uploaded.storageKey);
}
