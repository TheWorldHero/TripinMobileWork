'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../../lib/api';
import {
  datetimeLocalToIso,
  formatCoordinate,
  formatDateTime,
  toDatetimeLocalValue,
} from '../../lib/format';
import { mediaUrl } from '../../lib/media';
import { uploadMediaFile } from '../../lib/upload';
import type { PlaceCandidate, TripDraft, TripDraftPoint } from '../../types';
import { TopBar } from '../shell/TopBar';
import { StudioMap, type StudioMapPoint } from './StudioMap';

type PendingImage = { file: File; previewUrl: string };

function parseCoordinateText(text: string): { latitude: number; longitude: number } | null {
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)[\s,，]+(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) return { latitude: first, longitude: second };
  if (Math.abs(second) <= 90 && Math.abs(first) <= 180) return { latitude: second, longitude: first };
  return null;
}

function pointTitleOf(point: TripDraftPoint, index: number) {
  return point.title || point.place?.name || point.customPlaceName || `点位 ${index + 1}`;
}

export function StudioScreen({ tripId }: { tripId?: string }) {
  const router = useRouter();

  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 搜索加点
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordInput = parseCoordinateText(query);

  // 编辑弹层
  const [editing, setEditing] = useState<TripDraftPoint | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editImages, setEditImages] = useState<PendingImage[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileRef = useRef<HTMLInputElement | null>(null);

  // 发布弹层
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishSummary, setPublishSummary] = useState('');
  const [publishCity, setPublishCity] = useState('');
  const [publishing, setPublishing] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tripId) {
        setTrip(await api.getTrip(tripId));
      } else {
        const trips = await api.listTrips();
        const draft = trips.find((candidate) => candidate.status !== 'PUBLISHED');
        setTrip(
          draft
            ? await api.getTrip(draft.id)
            : await api.createTrip({
                title: `我的路线 ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date())}`,
              }),
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '工作台加载失败');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  // 防抖地点搜索
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const keyword = query.trim();
    if (!keyword || coordInput) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setSuggestions(await api.searchPlaces(keyword, { limit: 8 }));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, coordInput]);

  const located: StudioMapPoint[] = (trip?.points ?? [])
    .filter((point) => point.latitude != null && point.longitude != null)
    .map((point, index) => ({
      id: point.id,
      latitude: point.latitude as number,
      longitude: point.longitude as number,
      title: pointTitleOf(point, index),
      sequence: index + 1,
    }));

  // 统一加点入口
  const addPoint = useCallback(
    async (payload: {
      title: string;
      latitude?: number;
      longitude?: number;
      placeId?: string;
      customPlaceName?: string;
      cityName?: string | null;
    }) => {
      if (!trip || busy) return;
      setBusy(true);
      setError(null);
      try {
        const updated = await api.createTripPoint(trip.id, {
          title: payload.title,
          placeId: payload.placeId,
          customPlaceName: payload.customPlaceName,
          latitude: payload.latitude,
          longitude: payload.longitude,
          startedAt: new Date().toISOString(),
        });
        // 首个点位顺带把城市填进草稿，发布时省事
        if (payload.cityName && !trip.cityName) {
          try {
            await api.updateTrip(trip.id, { cityName: payload.cityName });
          } catch {
            /* 非关键 */
          }
        }
        const fresh = updated.points.find(
          (candidate) => !trip.points.some((existing) => existing.id === candidate.id),
        );
        setTrip(updated);
        if (fresh) setActiveId(fresh.id);
        setQuery('');
        setSuggestions([]);
        showToast('已加入路线');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '加点失败');
      } finally {
        setBusy(false);
      }
    },
    [trip, busy, showToast],
  );

  const addFromPlace = (place: PlaceCandidate) =>
    addPoint({
      title: place.name,
      latitude: place.latitude ?? undefined,
      longitude: place.longitude ?? undefined,
      placeId: place.id ?? undefined,
      customPlaceName: place.id ? undefined : place.name,
      cityName: place.cityName,
    });

  const addFromCoords = (coords: { latitude: number; longitude: number }) =>
    addPoint({
      title: `坐标 ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      latitude: coords.latitude,
      longitude: coords.longitude,
      customPlaceName: `坐标点`,
    });

  const addFromMapClick = useCallback(
    async (longitude: number, latitude: number) => {
      if (busy) return;
      try {
        const geo = await api.reverseGeocode(latitude, longitude);
        const name = geo.recommendedPlace?.name || geo.formattedAddress || '地图标记';
        await addPoint({
          title: name,
          latitude,
          longitude,
          customPlaceName: name,
          cityName: geo.cityName,
        });
      } catch {
        await addPoint({
          title: '地图标记',
          latitude,
          longitude,
          customPlaceName: '地图标记',
        });
      }
    },
    [busy, addPoint],
  );

  const addCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('当前浏览器不支持定位');
      return;
    }
    showToast('正在获取定位…');
    navigator.geolocation.getCurrentPosition(
      (position) => void addFromMapClick(position.coords.longitude, position.coords.latitude),
      () => showToast('定位失败，可搜索或输入坐标'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onPointDragEnd = useCallback(
    async (id: string, longitude: number, latitude: number) => {
      if (!trip) return;
      try {
        setTrip(await api.updateTripPoint(trip.id, id, { latitude, longitude }));
        showToast('已更新位置');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '更新位置失败');
      }
    },
    [trip, showToast],
  );

  const movePoint = async (index: number, direction: -1 | 1) => {
    if (!trip) return;
    const target = index + direction;
    if (target < 0 || target >= trip.points.length) return;
    const ids = trip.points.map((point) => point.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setError(null);
    try {
      setTrip(await api.reorderTripPoints(trip.id, ids));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '调整顺序失败');
    }
  };

  const deletePoint = async (point: TripDraftPoint) => {
    if (!trip || !window.confirm('删除这个点位？')) return;
    setError(null);
    try {
      setTrip(await api.deleteTripPoint(trip.id, point.id));
      showToast('已删除');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除失败');
    }
  };

  const openEditor = (point: TripDraftPoint) => {
    setEditing(point);
    setActiveId(point.id);
    setEditTitle(point.title ?? '');
    setEditLocation(
      point.latitude != null && point.longitude != null
        ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
        : point.place?.name ?? point.customPlaceName ?? '',
    );
    setEditTime(point.startedAt ? toDatetimeLocalValue(point.startedAt) : '');
    setEditNote(point.note ?? '');
    setEditImages([]);
  };

  const saveEdit = async () => {
    if (!trip || !editing || savingEdit) return;
    setSavingEdit(true);
    setError(null);
    try {
      const parsed = parseCoordinateText(editLocation);
      let updated = await api.updateTripPoint(trip.id, editing.id, {
        title: editTitle.trim() || undefined,
        note: editNote.trim() || undefined,
        startedAt: editTime ? datetimeLocalToIso(editTime) ?? undefined : undefined,
        latitude: parsed?.latitude,
        longitude: parsed?.longitude,
        customPlaceName: !parsed && editLocation.trim() ? editLocation.trim() : undefined,
      });
      for (const image of editImages) {
        await uploadMediaFile(image.file, { tripId: trip.id, tripPointId: editing.id });
        URL.revokeObjectURL(image.previewUrl);
      }
      if (editImages.length) {
        updated = await api.getTrip(trip.id);
      }
      setTrip(updated);
      setEditing(null);
      setEditImages([]);
      showToast('已更新');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败');
    } finally {
      setSavingEdit(false);
    }
  };

  const openPublish = () => {
    if (!trip) return;
    setPublishTitle(trip.title);
    setPublishSummary(trip.summary ?? '');
    setPublishCity(trip.cityName ?? '');
    setPublishOpen(true);
  };

  const publish = async () => {
    if (!trip || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      if (publishCity.trim() && publishCity.trim() !== (trip.cityName ?? '')) {
        await api.updateTrip(trip.id, { cityName: publishCity.trim() });
      }
      const published = await api.publishTrip(trip.id, {
        title: publishTitle.trim() || trip.title,
        summary: publishSummary.trim() || undefined,
        visibility: 'PUBLIC',
      });
      setPublishOpen(false);
      showToast('已发布到社区');
      router.push(published.post?.id ? `/routes/${published.post.id}` : '/');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '发布失败');
      setPublishing(false);
    }
  };

  const pointCount = trip?.points.length ?? 0;
  const missingLocation = pointCount - located.length;

  return (
    <div>
      <TopBar title="工作台">
        <button type="button" className="topbar-action" onClick={openPublish} disabled={!trip || pointCount === 0}>
          发布
        </button>
      </TopBar>

      {error ? <div className="notice error">{error}</div> : null}
      {loading ? <div className="loading-line">正在准备草稿…</div> : null}

      {trip ? (
        <>
          <StudioMap
            points={located}
            activeId={activeId}
            onMapClick={addFromMapClick}
            onPointClick={setActiveId}
            onPointDragEnd={onPointDragEnd}
          />

          {/* 搜索加点条 */}
          <div className="studio-search">
            <div className="studio-search-bar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" />
              </svg>
              <input
                className="studio-search-input"
                value={query}
                placeholder="搜地点加入路线，或输入坐标 39.90,116.40"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button type="button" className="studio-search-clear" aria-label="清空" onClick={() => setQuery('')}>
                  ×
                </button>
              ) : null}
            </div>
            <button type="button" className="studio-locate" onClick={addCurrentLocation} disabled={busy}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              定位
            </button>

            {coordInput ? (
              <button type="button" className="place-suggest-item coord" onClick={() => addFromCoords(coordInput)} disabled={busy}>
                <b>添加坐标点</b>
                <span>{coordInput.latitude.toFixed(5)}, {coordInput.longitude.toFixed(5)}</span>
              </button>
            ) : null}

            {!coordInput && (suggestions.length > 0 || searching) ? (
              <div className="place-suggest studio-suggest">
                {searching && suggestions.length === 0 ? (
                  <div className="place-suggest-item"><span>搜索中…</span></div>
                ) : null}
                {suggestions.map((place, index) => (
                  <button
                    key={`${place.id ?? place.providerId ?? place.name}-${index}`}
                    type="button"
                    className="place-suggest-item"
                    onClick={() => addFromPlace(place)}
                    disabled={busy}
                  >
                    <b>{place.name}</b>
                    <span>{[place.cityName, place.districtName, place.formattedAddress].filter(Boolean).join(' · ')}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* 路线信息 */}
          <div className="studio-route-head">
            <div className="studio-route-title">{trip.title}</div>
            <div className="studio-route-sub">
              {pointCount} 个点位{missingLocation > 0 ? ` · ${missingLocation} 个缺定位` : located.length ? ' · 已连成路线' : ''}
            </div>
          </div>

          {/* 点位列表 */}
          {pointCount === 0 ? (
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <b>开始搭建你的路线</b>
              <span>上方搜索一个地点，点一下就加进路线；地图上点选、当前定位也行。</span>
            </div>
          ) : (
            <div className="studio-points">
              {trip.points.map((point, index) => {
                const thumb = (point.mediaAssets ?? [])
                  .map((media) => mediaUrl(media))
                  .find((url): url is string => Boolean(url));
                const noLocation = point.latitude == null || point.longitude == null;
                const isActive = activeId === point.id;
                return (
                  <div
                    key={point.id}
                    className={`point-row ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveId(point.id)}
                  >
                    <span className="point-row-seq">{index + 1}</span>
                    {thumb ? <img className="point-row-thumb" src={thumb} alt="" /> : null}
                    <div className="point-row-body">
                      <div className="point-row-title">
                        {pointTitleOf(point, index)}
                        {noLocation ? <span className="badge temp">缺定位</span> : null}
                      </div>
                      <div className="point-row-meta">
                        {[formatDateTime(point.startedAt), formatCoordinate(point.latitude, point.longitude), point.note]
                          .filter(Boolean)
                          .join(' · ') || '点一下完善时间/备注/照片'}
                      </div>
                    </div>
                    <div className="point-row-actions" onClick={(event) => event.stopPropagation()}>
                      <button type="button" className="mini-btn" aria-label="上移" onClick={() => movePoint(index, -1)} disabled={index === 0}>↑</button>
                      <button type="button" className="mini-btn" aria-label="下移" onClick={() => movePoint(index, 1)} disabled={index === pointCount - 1}>↓</button>
                      <button type="button" className="mini-btn" onClick={() => openEditor(point)}>编辑</button>
                      <button type="button" className="mini-btn danger" aria-label="删除" onClick={() => deletePoint(point)}>删</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pointCount > 0 ? (
            <div className="action-bar">
              <button type="button" className="btn btn-gradient btn-block" onClick={openPublish}>
                发布路线（{pointCount} 个点位）
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {editing ? (
        <div className="sheet-backdrop" onClick={() => setEditing(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-grip" />
            <h3 className="sheet-title">完善点位</h3>
            <div className="field">
              <label className="field-label">名称</label>
              <input className="input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">位置（坐标或地名）</label>
              <input className="input" value={editLocation} placeholder="39.90, 116.40" onChange={(event) => setEditLocation(event.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">时间</label>
              <input className="input" type="datetime-local" value={editTime} onChange={(event) => setEditTime(event.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">备注</label>
              <textarea className="textarea" value={editNote} onChange={(event) => setEditNote(event.target.value)} />
            </div>

            <input
              ref={editFileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                const files = event.target.files;
                if (files?.length) {
                  setEditImages((current) => [
                    ...current,
                    ...Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
                  ]);
                }
                event.target.value = '';
              }}
            />
            <div className="upload-box" onClick={() => editFileRef.current?.click()}>
              <span>＋ 添加照片</span>
              <span style={{ fontWeight: 400, fontSize: 12 }}>可不选</span>
            </div>
            {editImages.length ? (
              <div className="image-strip">
                {editImages.map((image) => (
                  <span key={image.previewUrl} className="image-strip-item">
                    <img src={image.previewUrl} alt="待上传" />
                    <button
                      type="button"
                      className="image-strip-remove"
                      aria-label="移除"
                      onClick={() =>
                        setEditImages((current) => {
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

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(null)}>取消</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {publishOpen && trip ? (
        <div className="sheet-backdrop" onClick={() => !publishing && setPublishOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-grip" />
            <h3 className="sheet-title">发布作品</h3>
            <div className="field">
              <label className="field-label">标题</label>
              <input className="input" value={publishTitle} onChange={(event) => setPublishTitle(event.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">城市</label>
              <input className="input" value={publishCity} placeholder="例如：上海" onChange={(event) => setPublishCity(event.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">简介</label>
              <textarea className="textarea" value={publishSummary} placeholder="一句话介绍这条路线" onChange={(event) => setPublishSummary(event.target.value)} />
            </div>
            <div className="field">
              <span className="field-hint">将公开发布 {pointCount} 个点位，发布后出现在社区首页。</span>
            </div>
            <button type="button" className="btn btn-gradient btn-block" onClick={publish} disabled={publishing}>
              {publishing ? '发布中…' : '确认发布'}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
