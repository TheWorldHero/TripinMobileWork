'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { api } from '../lib/api';
import type { MediaAsset, PlaceCandidate, TripDraft, TripDraftPoint } from '../types';

type DraftPointForm = {
  title: string;
  note: string;
  startedAt: string;
  endedAt: string;
  latitude: string;
  longitude: string;
  selectedPlace: PlaceCandidate | null;
};

type AMapNamespace = {
  Map: new (container: HTMLDivElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapOverlay;
  Polyline: new (options: Record<string, unknown>) => AMapOverlay;
};

type AMapMap = {
  add: (overlay: AMapOverlay | AMapOverlay[]) => void;
  remove: (overlay: AMapOverlay | AMapOverlay[]) => void;
  destroy: () => void;
  on?: (eventName: string, handler: (event: any) => void) => void;
  setFitView: (overlay?: AMapOverlay[] | undefined, immediately?: boolean, avoid?: number[] | undefined) => void;
};

type AMapOverlay = {
  on?: (eventName: string, handler: () => void) => void;
};

declare global {
  interface Window {
    AMap?: AMapNamespace;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

const AMAP_SCRIPT_ID = 'tripin-workbench-amap';
const FALLBACK_CENTER: [number, number] = [116.397428, 39.90923];
let amapPromise: Promise<AMapNamespace> | null = null;

function loadAmap(key: string, securityJsCode?: string) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('地图只能在浏览器中加载。'));
  }
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (!amapPromise) {
    amapPromise = new Promise<AMapNamespace>((resolve, reject) => {
      if (securityJsCode) {
        window._AMapSecurityConfig = {
          ...(window._AMapSecurityConfig ?? {}),
          securityJsCode,
        };
      }

      const existing = document.getElementById(AMAP_SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => {
          if (window.AMap) {
            resolve(window.AMap);
            return;
          }
          reject(new Error('高德地图加载失败。'));
        });
        existing.addEventListener('error', () => reject(new Error('高德地图加载失败。')));
        return;
      }

      const script = document.createElement('script');
      script.id = AMAP_SCRIPT_ID;
      script.async = true;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`;
      script.onload = () => {
        if (window.AMap) {
          resolve(window.AMap);
          return;
        }
        reject(new Error('高德地图加载失败。'));
      };
      script.onerror = () => reject(new Error('高德地图加载失败。'));
      document.head.appendChild(script);
    });
  }
  return amapPromise;
}

function toLocalDatetimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromLocalDatetimeInput(value?: string | null) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function sortPoints(points: TripDraftPoint[]) {
  return [...points].sort((left, right) => {
    const leftTime = left.startedAt ?? left.endedAt ?? '';
    const rightTime = right.startedAt ?? right.endedAt ?? '';
    return leftTime.localeCompare(rightTime);
  });
}

function filterPointsByRange(points: TripDraftPoint[], start?: string | null, end?: string | null) {
  const startTs = start ? new Date(start).getTime() : Number.NEGATIVE_INFINITY;
  const endTs = end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;

  return sortPoints(points).filter((point) => {
    const raw = point.startedAt ?? point.endedAt;
    if (!raw) return false;
    const time = new Date(raw).getTime();
    return time >= startTs && time <= endTs;
  });
}

function canUsePointInRoute(point: TripDraftPoint) {
  return Boolean(
    (point.title ?? '').trim() &&
      point.startedAt &&
      typeof point.latitude === 'number' &&
      typeof point.longitude === 'number',
  );
}

function nextPointTime(trip: TripDraft) {
  const last = sortPoints(trip.points).at(-1);
  const base = new Date(last?.endedAt ?? last?.startedAt ?? Date.now());
  base.setHours(base.getHours() + 2);
  return toLocalDatetimeInput(base.toISOString());
}

function defaultPointForm(trip: TripDraft): DraftPointForm {
  return {
    title: '',
    note: '',
    startedAt: nextPointTime(trip),
    endedAt: '',
    latitude: '',
    longitude: '',
    selectedPlace: null,
  };
}

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

async function registerUploadedFiles(files: File[], tripId: string, tripPointId?: string): Promise<MediaAsset[]> {
  return Promise.all(
    files.map(async (file) => {
      const local = await uploadFileToWorkspace(file);
      const created = await api.createMediaAsset({
        originalName: local.originalName,
        mimeType: local.mimeType,
        bytes: local.bytes,
        tripId,
        tripPointId,
      });
      return api.markMediaReady(created.id, local.storageKey);
    }),
  );
}

function formatTime(value?: string | null) {
  if (!value) return '未设置时间';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function toPreviewDraft(trip: TripDraft, title: string, summary: string, cityName: string, rangeStart: string, rangeEnd: string): TripDraft {
  const selectedPoints = filterPointsByRange(
    trip.points,
    fromLocalDatetimeInput(rangeStart),
    fromLocalDatetimeInput(rangeEnd),
  ).filter(canUsePointInRoute);

  return {
    ...trip,
    title: title.trim() || '未命名路线',
    summary: summary.trim() || null,
    cityName: cityName.trim() || null,
    startedAt: fromLocalDatetimeInput(rangeStart) ?? trip.startedAt,
    endedAt: fromLocalDatetimeInput(rangeEnd) ?? trip.endedAt,
    points: selectedPoints,
    pointCount: selectedPoints.length,
    routePreview: selectedPoints.map((point) => ({
      latitude: point.latitude as number,
      longitude: point.longitude as number,
    })),
  };
}

function LivePublishPreview({ trip }: { trip: TripDraft }) {
  const points = sortPoints(trip.points);

  return (
    <div className="studio-live-preview">
      <div className="studio-live-preview-head">
        <div>
          <h3>{trip.title || '未命名路线'}</h3>
          <p className="section-copy">
            {trip.cityName || '未设置城市'} · {points.length} 个可发布点位
          </p>
        </div>
      </div>
      {trip.summary ? <p className="section-copy">{trip.summary}</p> : null}
      {points.length ? (
        <div className="studio-live-preview-list">
          {points.map((point, index) => (
            <article key={point.id} className="studio-live-preview-item">
              <strong>
                {index + 1}. {point.title ?? '未命名点位'}
              </strong>
              <span>{point.customPlaceName ?? point.place?.name ?? '未命名地点'}</span>
              <span>{formatTime(point.startedAt)}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="section-copy">当前时间段内没有信息完整、可形成路线的点位。</p>
      )}
    </div>
  );
}

function WorkbenchMap({
  points,
  draftPoint,
  onPick,
  amapKey,
  amapSecurityCode,
}: {
  points: TripDraftPoint[];
  draftPoint: DraftPointForm;
  onPick: (latitude: string, longitude: string) => void;
  amapKey: string;
  amapSecurityCode?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const overlaysRef = useRef<AMapOverlay[]>([]);
  const mapClickBoundRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !amapKey) return;
    let cancelled = false;

    loadAmap(amapKey, amapSecurityCode)
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;

        const positionedPoints = points.filter(
          (point): point is TripDraftPoint & { latitude: number; longitude: number } =>
            typeof point.latitude === 'number' && typeof point.longitude === 'number',
        );
        const center = positionedPoints[0]
          ? [positionedPoints[0].longitude, positionedPoints[0].latitude]
          : FALLBACK_CENTER;

        if (!mapRef.current) {
          mapRef.current = new AMap.Map(containerRef.current, {
            zoom: positionedPoints.length > 1 ? 11 : 13,
            center,
            resizeEnable: true,
          });
        }

        if (!mapClickBoundRef.current && mapRef.current.on) {
          mapRef.current.on('click', (event: any) => {
            const lnglat = event?.lnglat;
            const longitude = typeof lnglat?.getLng === 'function' ? lnglat.getLng() : lnglat?.lng;
            const latitude = typeof lnglat?.getLat === 'function' ? lnglat.getLat() : lnglat?.lat;
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              onPick(latitude.toFixed(6), longitude.toFixed(6));
            }
          });
          mapClickBoundRef.current = true;
        }

        if (overlaysRef.current.length) {
          mapRef.current.remove(overlaysRef.current);
          overlaysRef.current = [];
        }

        const overlays: AMapOverlay[] = [];
        for (const point of positionedPoints) {
          overlays.push(
            new AMap.Marker({
              position: [point.longitude, point.latitude],
              content: `<div class="tripin-editor-marker"><span>${String(point.sequence ?? 0).padStart(2, '0')}</span></div>`,
            }),
          );
        }

        const draftLatitude = Number(draftPoint.latitude);
        const draftLongitude = Number(draftPoint.longitude);
        if (Number.isFinite(draftLatitude) && Number.isFinite(draftLongitude)) {
          overlays.push(
            new AMap.Marker({
              position: [draftLongitude, draftLatitude],
              content: '<div class="tripin-editor-marker tripin-editor-marker-selected"><span>新</span></div>',
            }),
          );
        }

        if (positionedPoints.length > 1) {
          overlays.push(
            new AMap.Polyline({
              path: positionedPoints.map((point) => [point.longitude, point.latitude]),
              strokeWeight: 6,
              strokeColor: '#204842',
              strokeOpacity: 0.75,
              lineJoin: 'round',
              lineCap: 'round',
            }),
          );
        }

        if (overlays.length) {
          mapRef.current.add(overlays);
          mapRef.current.setFitView(overlays, false, [56, 56, 56, 56]);
        }
        overlaysRef.current = overlays;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [amapKey, amapSecurityCode, draftPoint.latitude, draftPoint.longitude, onPick, points]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="studio-map-live" />;
}

export function TripDraftStudio({ initialTrip }: { initialTrip: TripDraft }) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [title, setTitle] = useState(initialTrip.title && initialTrip.title !== '未命名路线' ? initialTrip.title : '');
  const [summary, setSummary] = useState(initialTrip.summary ?? '');
  const [cityName, setCityName] = useState(initialTrip.cityName ?? '');
  const [draftPoint, setDraftPoint] = useState<DraftPointForm>(defaultPointForm(initialTrip));
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceCandidate[]>([]);
  const [newPointFiles, setNewPointFiles] = useState<File[]>([]);
  const [rangeStart, setRangeStart] = useState(toLocalDatetimeInput(initialTrip.startedAt));
  const [rangeEnd, setRangeEnd] = useState(toLocalDatetimeInput(initialTrip.endedAt));
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSearching, startSearching] = useTransition();
  const [isGeneratingPoint, startGeneratingPoint] = useTransition();
  const [isDeletingPoint, startDeletingPoint] = useTransition();
  const [isPublishing, startPublishing] = useTransition();

  const orderedPoints = useMemo(() => sortPoints(trip.points), [trip.points]);
  const previewDraft = useMemo(
    () => toPreviewDraft(trip, title, summary, cityName, rangeStart, rangeEnd),
    [cityName, rangeEnd, rangeStart, summary, title, trip],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const latestTrip = await api.getTrip(trip.id);
        if (!cancelled) {
          setTrip(latestTrip);
        }
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Trip not found')) {
          return;
        }

        try {
          const recreatedTrip = await api.createTrip({
            title: title.trim() || '未命名路线',
            summary: summary.trim() || undefined,
            cityName: cityName.trim() || undefined,
            visibility: 'PRIVATE',
          });

          if (!cancelled) {
            setTrip(recreatedTrip);
            setDraftPoint(defaultPointForm(recreatedTrip));
            setRangeStart(toLocalDatetimeInput(recreatedTrip.startedAt));
            setRangeEnd(toLocalDatetimeInput(recreatedTrip.endedAt));
            setFeedback('原来的草稿已经失效，已自动创建一份新的草稿。');
          }
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const syncTrip = (nextTrip: TripDraft) => {
    setTrip(nextTrip);
  };

  const resetDraftPoint = (nextTrip: TripDraft) => {
    setDraftPoint(defaultPointForm(nextTrip));
    setEditingPointId(null);
    setSearchKeyword('');
    setSearchResults([]);
    setNewPointFiles([]);
  };

  const searchPlaces = () => {
    if (!searchKeyword.trim()) return;
    startSearching(() => {
      void (async () => {
        try {
          const results = await api.searchPlaces(searchKeyword.trim(), {
            cityName: cityName.trim() || undefined,
            latitude: draftPoint.latitude ? Number(draftPoint.latitude) : undefined,
            longitude: draftPoint.longitude ? Number(draftPoint.longitude) : undefined,
            limit: 8,
          });
          setSearchResults(results);
          setFeedback(null);
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '搜索失败。');
        }
      })();
    });
  };

  const savePlaceToForm = (place: PlaceCandidate) => {
    setDraftPoint((current) => ({
      ...current,
      latitude: typeof place.latitude === 'number' ? place.latitude.toFixed(6) : current.latitude,
      longitude: typeof place.longitude === 'number' ? place.longitude.toFixed(6) : current.longitude,
      selectedPlace: place,
    }));
    if (place.cityName) {
      setCityName(place.cityName);
    }
    setSearchResults([]);
    setFeedback(null);
  };

  const pickLocation = (latitude: string, longitude: string) => {
    setDraftPoint((current) => ({ ...current, latitude, longitude }));
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    void (async () => {
      try {
        const result = await api.reverseGeocode(lat, lng);
        if (result.recommendedPlace) {
          setDraftPoint((current) => ({
            ...current,
            latitude,
            longitude,
            selectedPlace: result.recommendedPlace ?? null,
          }));
          if (result.recommendedPlace.cityName) {
            setCityName(result.recommendedPlace.cityName);
          }
        }
      } catch {}
    })();
  };

  const persistTripMeta = async () =>
    api.updateTrip(trip.id, {
      title: title.trim() || '未命名路线',
      summary: summary.trim() || undefined,
      cityName: cityName.trim() || undefined,
    });

  const createOrUpdatePoint = () => {
    startGeneratingPoint(() => {
      void (async () => {
        try {
          let workingTrip = await persistTripMeta();
          const uploadedMedia = await registerUploadedFiles(newPointFiles, workingTrip.id, editingPointId ?? undefined);
          let placeId: string | undefined;
          let customPlaceName: string | undefined;

          if (draftPoint.selectedPlace) {
            const savedPlace = await api.upsertPlace({
              provider: draftPoint.selectedPlace.provider ?? 'MANUAL',
              providerId: draftPoint.selectedPlace.providerId ?? undefined,
              name: draftPoint.selectedPlace.name,
              shortName: draftPoint.selectedPlace.shortName ?? undefined,
              formattedAddress: draftPoint.selectedPlace.formattedAddress ?? undefined,
              provinceName: draftPoint.selectedPlace.provinceName ?? undefined,
              cityName: draftPoint.selectedPlace.cityName ?? undefined,
              districtName: draftPoint.selectedPlace.districtName ?? undefined,
              countryCode: draftPoint.selectedPlace.countryCode ?? 'CN',
              latitude: draftPoint.selectedPlace.latitude ?? undefined,
              longitude: draftPoint.selectedPlace.longitude ?? undefined,
            });
            placeId = savedPlace.id ?? undefined;
            customPlaceName = savedPlace.name;
          }

          const payload = {
            title: draftPoint.title.trim() || '未命名点位',
            note: draftPoint.note.trim() || undefined,
            placeId,
            customPlaceName,
            startedAt: fromLocalDatetimeInput(draftPoint.startedAt) ?? new Date().toISOString(),
            endedAt: fromLocalDatetimeInput(draftPoint.endedAt) ?? undefined,
            latitude: draftPoint.latitude ? Number(draftPoint.latitude) : undefined,
            longitude: draftPoint.longitude ? Number(draftPoint.longitude) : undefined,
            mediaAssetIds: uploadedMedia.map((media) => media.id),
          };

          workingTrip = editingPointId
            ? await api.updateTripPoint(workingTrip.id, editingPointId, payload)
            : await api.createTripPoint(workingTrip.id, payload);

          syncTrip(workingTrip);
          resetDraftPoint(workingTrip);
          setRangeStart(toLocalDatetimeInput(workingTrip.startedAt));
          setRangeEnd(toLocalDatetimeInput(workingTrip.endedAt));
          setFeedback(editingPointId ? '点位已更新。' : '点位已加入点位管理。');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '保存点位失败。');
        }
      })();
    });
  };

  const startEditingPoint = (point: TripDraftPoint) => {
    setEditingPointId(point.id);
    setDraftPoint({
      title: point.title ?? '',
      note: point.note ?? '',
      startedAt: toLocalDatetimeInput(point.startedAt),
      endedAt: toLocalDatetimeInput(point.endedAt),
      latitude: point.latitude != null ? point.latitude.toFixed(6) : '',
      longitude: point.longitude != null ? point.longitude.toFixed(6) : '',
      selectedPlace: point.place
        ? {
            id: point.place.id,
            name: point.place.name,
            cityName: point.place.cityName ?? null,
            districtName: point.place.districtName ?? null,
            latitude: point.place.latitude ?? null,
            longitude: point.place.longitude ?? null,
          }
        : null,
    });
    setFeedback(`正在编辑：${point.title ?? '未命名点位'}`);
  };

  const deletePoint = (pointId: string) => {
    startDeletingPoint(() => {
      void (async () => {
        try {
          const nextTrip = await api.deleteTripPoint(trip.id, pointId);
          syncTrip(nextTrip);
          if (editingPointId === pointId) {
            resetDraftPoint(nextTrip);
          }
          setRangeStart(toLocalDatetimeInput(nextTrip.startedAt));
          setRangeEnd(toLocalDatetimeInput(nextTrip.endedAt));
          setFeedback(nextTrip.points.length ? '点位已删除。' : '最后一个点位也已经删除。');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '删除点位失败。');
        }
      })();
    });
  };

  const openPublish = () => {
    setModalOpen(true);
    setFeedback(null);
  };

  const publish = () => {
    if (!previewDraft.points.length) {
      setFeedback('当前没有可发布的完整路线点位。');
      return;
    }

    startPublishing(() => {
      void (async () => {
        try {
          const firstPreviewMediaId =
            previewDraft.coverMediaId ??
            previewDraft.points.flatMap((point) => point.mediaAssets ?? []).find((media) => media.id)?.id;
          const nextTrip = await api.updateTrip(trip.id, {
            title: previewDraft.title,
            summary: previewDraft.summary ?? undefined,
            cityName: previewDraft.cityName ?? undefined,
            startedAt: previewDraft.startedAt ?? undefined,
            endedAt: previewDraft.endedAt ?? undefined,
            coverMediaId: firstPreviewMediaId,
          });
          await api.publishTrip(nextTrip.id, {
            title: previewDraft.title,
            summary: previewDraft.summary ?? undefined,
            coverMediaId: firstPreviewMediaId,
            visibility: 'PUBLIC',
          });
          router.push('/');
          router.refresh();
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '发布失败。');
        }
      })();
    });
  };

  const amapKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY ?? '';
  const amapSecurityCode = process.env.NEXT_PUBLIC_AMAP_JS_SECURITY_CODE ?? '';

  return (
    <main className="site-shell studio-page">
      <div className="route-breadcrumb">
        <Link className="text-link" href="/">
          首页
        </Link>
      </div>

      <section className="studio-card studio-card-wide studio-minimal-shell">
        <div className="studio-map-frame">
          <WorkbenchMap
            points={orderedPoints}
            draftPoint={draftPoint}
            onPick={pickLocation}
            amapKey={amapKey}
            amapSecurityCode={amapSecurityCode}
          />

          <div className="studio-map-overlay">
            <div className="studio-search-row">
              <input
                className="studio-search-input"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="搜索地点或城市"
              />
              <button className="editor-button" type="button" onClick={searchPlaces}>
                {isSearching ? '搜索中' : '搜索'}
              </button>
            </div>

            {searchResults.length ? (
              <div className="studio-place-results studio-place-results-floating">
                {searchResults.map((place, index) => (
                  <button
                    key={`${place.provider ?? 'manual'}-${place.providerId ?? place.name}-${index}`}
                    className="studio-place-result"
                    type="button"
                    onClick={() => savePlaceToForm(place)}
                  >
                    <strong>{place.name}</strong>
                    <span>{place.formattedAddress ?? [place.cityName, place.districtName].filter(Boolean).join(' ')}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <section className="studio-compose-strip">
          <input className="studio-search-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="路线标题" />
          <input className="studio-search-input" value={cityName} onChange={(event) => setCityName(event.target.value)} placeholder="城市" />
          <input
            className="studio-search-input"
            value={draftPoint.title}
            onChange={(event) => setDraftPoint((current) => ({ ...current, title: event.target.value }))}
            placeholder="点位标题"
          />
          <input
            className="studio-search-input"
            type="datetime-local"
            value={draftPoint.startedAt}
            onChange={(event) => setDraftPoint((current) => ({ ...current, startedAt: event.target.value }))}
          />
          <input
            className="studio-search-input"
            type="datetime-local"
            value={draftPoint.endedAt}
            onChange={(event) => setDraftPoint((current) => ({ ...current, endedAt: event.target.value }))}
          />
          <input
            className="studio-search-input"
            value={draftPoint.latitude}
            onChange={(event) => setDraftPoint((current) => ({ ...current, latitude: event.target.value }))}
            placeholder="纬度"
          />
          <input
            className="studio-search-input"
            value={draftPoint.longitude}
            onChange={(event) => setDraftPoint((current) => ({ ...current, longitude: event.target.value }))}
            placeholder="经度"
          />
          <textarea
            className="studio-textarea-compact"
            value={draftPoint.note}
            onChange={(event) => setDraftPoint((current) => ({ ...current, note: event.target.value }))}
            placeholder="点位描述"
            rows={2}
          />
          <textarea
            className="studio-textarea-compact"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="路线描述"
            rows={2}
          />
          <input
            className="studio-file-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setNewPointFiles(Array.from(event.target.files ?? []))}
          />
          <div className="studio-compose-actions">
            <button className="editor-button editor-button-primary" type="button" onClick={createOrUpdatePoint}>
              {isGeneratingPoint ? '保存中' : editingPointId ? '保存编辑' : '生成点位'}
            </button>
            {editingPointId ? (
              <button className="editor-button" type="button" onClick={() => resetDraftPoint(trip)}>
                取消编辑
              </button>
            ) : null}
          </div>
        </section>

        <section className="studio-points-panel">
          <div className="section-heading">
            <h2 className="section-title">点位管理</h2>
            <span className="meta-chip">{orderedPoints.length}</span>
          </div>
          {orderedPoints.length ? (
            <div className="studio-point-grid">
              {orderedPoints.map((point, index) => (
                <article key={point.id} className="studio-point-item">
                  <div className="studio-point-header">
                    <span className="meta-chip">#{index + 1}</span>
                    <div className="studio-point-header-actions">
                      <button className="editor-mini-button" type="button" onClick={() => startEditingPoint(point)}>
                        编辑
                      </button>
                      <button className="editor-mini-button" type="button" onClick={() => deletePoint(point.id)} disabled={isDeletingPoint}>
                        删除
                      </button>
                    </div>
                  </div>
                  <h3>{point.title ?? '未命名点位'}</h3>
                  <p className="section-copy">{point.customPlaceName ?? point.place?.name ?? '未命名地点'}</p>
                  <p className="section-copy">{formatTime(point.startedAt)}</p>
                  {!canUsePointInRoute(point) ? <p className="section-copy">信息未补全，暂时不能用于形成路线。</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <p className="section-copy">暂无点位</p>
            </div>
          )}
        </section>

        {feedback ? <p className="editor-feedback">{feedback}</p> : null}
        <button className="studio-time-fab" type="button" onClick={openPublish}>
          发布作品
        </button>
      </section>

      {modalOpen ? (
        <div className="studio-modal-backdrop">
          <section className="studio-modal">
            <div className="section-heading">
              <h2 className="section-title">待发布内容</h2>
              <button className="editor-button" type="button" onClick={() => setModalOpen(false)}>
                关闭
              </button>
            </div>
            <div className="studio-compact-grid">
              <input className="studio-search-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="发布标题" />
              <input className="studio-search-input" value={cityName} onChange={(event) => setCityName(event.target.value)} placeholder="发布城市" />
              <textarea className="studio-textarea-compact studio-modal-textarea" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="这段路线/旅程想说的话" rows={3} />
            </div>
            <div className="studio-compact-grid">
              <input className="studio-search-input" type="datetime-local" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
              <input className="studio-search-input" type="datetime-local" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
            </div>
            <LivePublishPreview trip={previewDraft} />
            <div className="studio-inline-actions">
              <button className="editor-button editor-button-primary" type="button" onClick={publish}>
                {isPublishing ? '发布中' : '发布'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
