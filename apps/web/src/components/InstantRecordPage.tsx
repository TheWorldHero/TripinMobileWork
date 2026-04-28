'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

import { api } from '../lib/api';
import type { TripDraft } from '../types';

type CurrentPositionResult = {
  latitude: number;
  longitude: number;
};

async function uploadFileToWorkspace(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/uploads', { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error((await response.text()) || '图片上传失败。');
  }
  return (await response.json()) as {
    storageKey: string;
    originalName: string;
    mimeType: string;
    bytes: number;
  };
}

function requestCurrentPosition(): Promise<CurrentPositionResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000,
      },
    );
  });
}

function isUsableDraft(trip: TripDraft) {
  return trip.status !== 'PUBLISHED';
}

async function loadWorkingDraft() {
  const trips = await api.listTrips();
  const draft = trips.find(isUsableDraft);
  if (draft) {
    return draft;
  }
  return api.createTrip({
    title: '即时记录草稿',
    visibility: 'PRIVATE',
  });
}

export function InstantRecordPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const [isRecording, startRecording] = useTransition();

  const selectedFileSummary = useMemo(() => {
    if (!files.length) {
      return '请选择要记录的图片';
    }
    if (files.length === 1) {
      return files[0].name;
    }
    return `已选择 ${files.length} 张图片`;
  }, [files]);

  const createRecord = () => {
    if (!files.length) {
      setFeedback('请先上传至少一张图片。');
      return;
    }

    setFeedback(null);
    startRecording(() => {
      void (async () => {
        try {
          const trip = await loadWorkingDraft();
          const position = await requestCurrentPosition();
          const medias = await Promise.all(
            files.map(async (file) => {
              const uploaded = await uploadFileToWorkspace(file);
              const created = await api.createMediaAsset({
                originalName: uploaded.originalName,
                mimeType: uploaded.mimeType,
                bytes: uploaded.bytes,
                tripId: trip.id,
              });
              return api.markMediaReady(created.id, uploaded.storageKey);
            }),
          );

          await api.createTripPoint(trip.id, {
            title: `临时点位 ${new Intl.DateTimeFormat('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date())}`,
            note: position ? '来自即时记录' : '来自即时记录，待补充位置',
            startedAt: new Date().toISOString(),
            latitude: position?.latitude,
            longitude: position?.longitude,
            mediaAssetIds: medias.map((media) => media.id),
          });

          setCreatedTripId(trip.id);
          setFiles([]);
          setFeedback(position ? '已生成临时点位，并加入点位管理。' : '已生成临时点位，位置可稍后在工作台补充。');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '即时记录失败。');
        }
      })();
    });
  };

  return (
    <main className="instant-record-page">
      <div className="instant-record-backdrop" />
      <section className="instant-record-modal" role="dialog" aria-modal="true" aria-labelledby="instant-record-title">
        <header className="instant-record-header">
          <div>
            <h1 id="instant-record-title">即时记录</h1>
            <p>上传图片后，会在工作台点位管理中生成一个临时点位。</p>
          </div>
          <Link className="instant-record-close" href="/" aria-label="关闭">
            ×
          </Link>
        </header>

        <label className="instant-upload-box">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <span>上传图片</span>
          <small>{selectedFileSummary}</small>
        </label>

        <div className="instant-record-actions">
          <button
            className="editor-button editor-button-primary"
            type="button"
            onClick={createRecord}
            disabled={isRecording}
          >
            {isRecording ? '生成中...' : '生成临时点位'}
          </button>
          <Link className="editor-button" href={createdTripId ? `/studio` : '/studio'}>
            去点位管理
          </Link>
        </div>

        {feedback ? <p className="editor-feedback">{feedback}</p> : null}
      </section>
    </main>
  );
}
