'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

import { loadAmap } from '../../lib/amap';
import { RouteSketch } from '../RouteSketch';

export type StudioMapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  sequence: number;
};

type DraftPoint = { latitude: number; longitude: number } | null;

export function StudioMap({
  points,
  activeId,
  draft,
  onMapClick,
  onPointClick,
  onPointDragEnd,
}: {
  points: StudioMapPoint[];
  activeId?: string | null;
  draft?: DraftPoint;
  onMapClick?: (longitude: number, latitude: number) => void;
  onPointClick?: (id: string) => void;
  onPointDragEnd?: (id: string, longitude: number, latitude: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mode, setMode] = useState<'loading' | 'amap' | 'fallback'>('loading');

  // 用 ref 持有最新回调，避免因回调变化反复重建地图。
  const cbRef = useRef({ onMapClick, onPointClick, onPointDragEnd });
  cbRef.current = { onMapClick, onPointClick, onPointDragEnd };

  useEffect(() => {
    let cancelled = false;
    loadAmap().then((AMap) => {
      if (cancelled) return;
      if (!AMap || !containerRef.current) {
        setMode('fallback');
        return;
      }
      const map = new AMap.Map(containerRef.current, {
        zoom: 12,
        viewMode: '2D',
        resizeEnable: true,
        mapStyle: 'amap://styles/normal',
      });
      map.on('click', (event: any) => {
        if (event?.lnglat) {
          cbRef.current.onMapClick?.(event.lnglat.getLng(), event.lnglat.getLat());
        }
      });
      mapRef.current = map;
      setMode('amap');
    });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.destroy?.();
        mapRef.current = null;
      }
    };
  }, []);

  // 同步覆盖物（标记 + 连线 + 草稿点）
  useEffect(() => {
    if (mode !== 'amap' || !mapRef.current || !window.AMap) return;
    const AMap = window.AMap;
    const map = mapRef.current;

    overlaysRef.current.forEach((overlay) => map.remove(overlay));
    overlaysRef.current = [];

    const located = points.filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    );
    const path = located.map((point) => [point.longitude, point.latitude]);

    if (path.length >= 2) {
      const line = new AMap.Polyline({
        path,
        strokeColor: '#3f5d86',
        strokeWeight: 5,
        strokeOpacity: 0.95,
        lineJoin: 'round',
        showDir: true,
      });
      map.add(line);
      overlaysRef.current.push(line);
    }

    located.forEach((point, index) => {
      const isActive = point.id === activeId;
      const marker = new AMap.Marker({
        position: [point.longitude, point.latitude],
        draggable: Boolean(cbRef.current.onPointDragEnd),
        content: `<div class="amap-point${isActive ? ' active' : ''}">${index + 1}</div>`,
        offset: new AMap.Pixel(-15, -15),
        zIndex: isActive ? 130 : 110,
        title: point.title,
      });
      marker.on('click', () => cbRef.current.onPointClick?.(point.id));
      marker.on('dragend', (event: any) => {
        const position = event?.lnglat ?? marker.getPosition();
        if (position) {
          cbRef.current.onPointDragEnd?.(point.id, position.getLng(), position.getLat());
        }
      });
      map.add(marker);
      overlaysRef.current.push(marker);
    });

    if (draft) {
      const draftMarker = new AMap.Marker({
        position: [draft.longitude, draft.latitude],
        content: '<div class="amap-point draft">＋</div>',
        offset: new AMap.Pixel(-15, -15),
        zIndex: 140,
      });
      map.add(draftMarker);
      overlaysRef.current.push(draftMarker);
    }

    if (overlaysRef.current.length) {
      const fitCount = path.length + (draft ? 1 : 0);
      if (fitCount >= 2) {
        map.setFitView(overlaysRef.current, false, [48, 48, 48, 48]);
      } else if (draft) {
        map.setZoomAndCenter(15, [draft.longitude, draft.latitude]);
      } else if (path.length === 1) {
        map.setZoomAndCenter(14, path[0]);
      }
    }
  }, [mode, points, activeId, draft]);

  const sketchPoints = points
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map((point) => ({ latitude: point.latitude, longitude: point.longitude, id: point.id }));

  return (
    <div className="studio-map">
      {mode !== 'fallback' ? <div ref={containerRef} className="studio-map-canvas" /> : null}

      {mode === 'fallback' ? (
        <>
          <RouteSketch
            points={sketchPoints}
            aspect={1.5}
            activeId={activeId ?? null}
            onPointClick={onPointClick}
            emptyLabel="搜索地点或用当前定位添加点位，路线会显示在这里"
          />
          <div className="studio-map-note">
            未配置高德地图 Key（NEXT_PUBLIC_AMAP_JS_KEY），暂用路线示意图。搜索 / 坐标 / 定位加点仍可正常使用。
          </div>
        </>
      ) : null}

      {mode === 'loading' ? <div className="studio-map-loading">地图加载中…</div> : null}
    </div>
  );
}
