'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { api } from '../../lib/api';
import { uploadMediaFile } from '../../lib/upload';
import { TopBar } from '../shell/TopBar';

type PendingImage = {
  file: File;
  previewUrl: string;
};

export function RecordScreen() {
  const [images, setImages] = useState<PendingImage[]>([]);
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneTripId, setDoneTripId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickImages = (files: FileList | null) => {
    if (!files?.length) return;
    setImages((current) => [
      ...current,
      ...Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  };

  const getPosition = () =>
    new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });

  const record = async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    setDoneTripId(null);
    try {
      const position = await getPosition();
      if (position) {
        setLocationLabel(
          `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        );
      } else {
        setLocationLabel(null);
      }

      const trips = await api.listTrips();
      const draft =
        trips.find((candidate) => candidate.status === 'DRAFT') ??
        (await api.createTrip({
          title: `我的路线 ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date())}`,
        }));

      const updated = await api.createTripPoint(draft.id, {
        title: '即时记录',
        note: note.trim() || undefined,
        startedAt: new Date().toISOString(),
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
      });

      if (images.length) {
        const newPoint = updated.points.find(
          (candidate) => !draft.points.some((existing) => existing.id === candidate.id),
        );
        for (const image of images) {
          await uploadMediaFile(image.file, { tripId: draft.id, tripPointId: newPoint?.id });
          URL.revokeObjectURL(image.previewUrl);
        }
      }

      setImages([]);
      setNote('');
      setDoneTripId(draft.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '记录失败，请重试');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="screen-fill screen-tinted">
      <TopBar title="即时记录" />

      {error ? <div className="notice error">{error}</div> : null}
      {doneTripId ? (
        <div className="notice success">
          已记录{locationLabel ? `（${locationLabel}）` : '（未获取到定位，可稍后在工作台补全）'}。
          <Link href={`/studio/${doneTripId}`} style={{ fontWeight: 800, textDecoration: 'underline' }}>
            去工作台完善 →
          </Link>
        </div>
      ) : null}

      <div className="screen-pad flex-grow">
        <section className="card">
          <div className="card-head">
            <b>记录此刻</b>
            <span>走到哪记到哪：自动获取当前位置，生成一个点位放进路线草稿。</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              pickImages(event.target.files);
              event.target.value = '';
            }}
          />
          <div className="upload-box" onClick={() => fileInputRef.current?.click()}>
            <span>＋ 添加现场照片</span>
            <span style={{ fontWeight: 400, fontSize: 12 }}>可不选，之后也能补</span>
          </div>
          {images.length ? (
            <div className="image-strip">
              {images.map((image) => (
                <span key={image.previewUrl} className="image-strip-item">
                  <img src={image.previewUrl} alt="待上传图片" />
                  <button
                    type="button"
                    className="image-strip-remove"
                    aria-label="移除图片"
                    onClick={() =>
                      setImages((current) => {
                        URL.revokeObjectURL(image.previewUrl);
                        return current.filter((candidate) => candidate.previewUrl !== image.previewUrl);
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
            <label className="field-label">此刻想说</label>
            <textarea
              className="textarea"
              value={note}
              placeholder="一句话记下此刻（可不填）"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </section>
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn-gradient btn-block" onClick={record} disabled={working}>
          {working ? '正在记录…' : '获取定位并记录'}
        </button>
      </div>
    </div>
  );
}
