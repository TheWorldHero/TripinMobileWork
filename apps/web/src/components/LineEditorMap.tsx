'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { RefreshPlanSegment } from '../editor/line-editor-state';
import type { RoutePoint, RouteSegment } from '../types';

type ProjectedPoint = {
  id: string;
  title: string;
  x: number;
  y: number;
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

const AMAP_SCRIPT_ID = 'tripin-amap-jsapi';
const FALLBACK_CENTER: [number, number] = [116.397428, 39.90923];

let amapPromise: Promise<AMapNamespace> | null = null;

function loadAmap(key: string, securityJsCode?: string) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('高德地图只能在浏览器环境中加载。'));
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
          reject(new Error('高德 JS 已加载，但没有暴露 window.AMap。'));
        });
        existing.addEventListener('error', () => {
          amapPromise = null;
          reject(new Error('高德 JS 脚本加载失败。'));
        });
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
        amapPromise = null;
        reject(new Error('高德 JS 已加载，但没有暴露 window.AMap。'));
      };
      script.onerror = () => {
        amapPromise = null;
        reject(new Error('高德 JS 脚本加载失败。'));
      };
      document.head.appendChild(script);
    });
  }

  return amapPromise;
}

function projectPoints(points: RoutePoint[]): ProjectedPoint[] {
  const coordinatePoints = points.filter(
    (point): point is RoutePoint & { latitude: number; longitude: number } =>
      typeof point.latitude === 'number' && typeof point.longitude === 'number',
  );

  if (!coordinatePoints.length) {
    return [];
  }

  const longitudes = coordinatePoints.map((point) => point.longitude);
  const latitudes = coordinatePoints.map((point) => point.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const width = Math.max(maxLongitude - minLongitude, 0.001);
  const height = Math.max(maxLatitude - minLatitude, 0.001);

  return coordinatePoints.map((point) => ({
    id: point.id,
    title: point.title ?? '未命名点位',
    x: Number((42 + ((point.longitude - minLongitude) / width) * 416).toFixed(1)),
    y: Number((268 - ((point.latitude - minLatitude) / height) * 208).toFixed(1)),
  }));
}

function buildFallbackPath(points: ProjectedPoint[]) {
  if (!points.length) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
}

function parsePolyline(polyline: string) {
  return polyline
    .split(';')
    .map((segment) => segment.split(',').map(Number))
    .filter(
      (segment): segment is [number, number] =>
        segment.length === 2 &&
        Number.isFinite(segment[0]) &&
        Number.isFinite(segment[1]),
    );
}

type LineEditorMapProps = {
  title: string;
  points: RoutePoint[];
  routeSegments: RouteSegment[];
  selectedPointId?: string | null;
  dirtySegments: RefreshPlanSegment[];
  amapKey: string;
  amapSecurityCode?: string;
  onSelectPoint?: (pointId: string) => void;
  onDraftLocation?: (coordinates: { latitude: string; longitude: string }) => void;
};

export function LineEditorMap({
  title,
  points,
  routeSegments,
  selectedPointId,
  dirtySegments,
  amapKey,
  amapSecurityCode,
  onSelectPoint,
  onDraftLocation,
}: LineEditorMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const overlaysRef = useRef<AMapOverlay[]>([]);
  const mapClickBoundRef = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const dirtySegmentKeys = useMemo(
    () =>
      new Set(
        dirtySegments
          .filter((segment) => segment.status === 'dirty')
          .map((segment) => segment.key),
      ),
    [dirtySegments],
  );
  const fallbackPoints = useMemo(() => projectPoints(points), [points]);
  const fallbackPath = useMemo(() => buildFallbackPath(fallbackPoints), [fallbackPoints]);
  const selectedFallbackPoint =
    fallbackPoints.find((point) => point.id === selectedPointId) ?? fallbackPoints[0] ?? null;

  useEffect(() => {
    if (!containerRef.current || !amapKey) {
      return;
    }

    let cancelled = false;

    loadAmap(amapKey, amapSecurityCode)
      .then((AMap) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const positionedPoints = points.filter(
          (point): point is RoutePoint & { latitude: number; longitude: number } =>
            typeof point.latitude === 'number' && typeof point.longitude === 'number',
        );

        const center =
          positionedPoints[0] == null
            ? FALLBACK_CENTER
            : [positionedPoints[0].longitude, positionedPoints[0].latitude];

        if (!mapRef.current) {
          mapRef.current = new AMap.Map(containerRef.current, {
            zoom: positionedPoints.length > 1 ? 11 : 13,
            center,
            resizeEnable: true,
            rotateEnable: false,
            pitchEnable: false,
            dragEnable: true,
            zoomEnable: true,
            doubleClickZoom: true,
          });
        }

        if (!mapClickBoundRef.current && mapRef.current.on) {
          mapRef.current.on('click', (event: any) => {
            const lnglat = event?.lnglat;
            const longitude =
              typeof lnglat?.getLng === 'function' ? lnglat.getLng() : lnglat?.lng;
            const latitude =
              typeof lnglat?.getLat === 'function' ? lnglat.getLat() : lnglat?.lat;
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              onDraftLocation?.({
                latitude: latitude.toFixed(6),
                longitude: longitude.toFixed(6),
              });
            }
          });
          mapClickBoundRef.current = true;
        }

        if (overlaysRef.current.length) {
          mapRef.current.remove(overlaysRef.current);
          overlaysRef.current = [];
        }

        const overlays: AMapOverlay[] = [];
        const storedSegmentsByKey = new Map(
          routeSegments.map((segment) => [
            segment.fromPointId && segment.toPointId
              ? `${segment.fromPointId}->${segment.toPointId}`
              : segment.id,
            segment,
          ]),
        );
        const segmentSource = points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1];
          const key = `${point.id}->${nextPoint.id}`;
          const storedSegment = storedSegmentsByKey.get(key);
          const dirty = dirtySegmentKeys.has(key);

          return {
            id: storedSegment?.id ?? `fallback-segment-${point.id}`,
            fromPointId: point.id,
            toPointId: nextPoint.id,
            key,
            dirty,
            polyline:
              !dirty && storedSegment?.polyline
                ? storedSegment.polyline
                : typeof point.longitude === 'number' &&
                    typeof point.latitude === 'number' &&
                    typeof nextPoint.longitude === 'number' &&
                    typeof nextPoint.latitude === 'number'
                  ? `${point.longitude},${point.latitude};${nextPoint.longitude},${nextPoint.latitude}`
                  : '',
          };
        });

        for (const point of positionedPoints) {
          const selected = point.id === selectedPointId;
          const marker = new AMap.Marker({
            position: [point.longitude, point.latitude],
            zIndex: selected ? 220 : 160,
            offset: selected ? undefined : undefined,
            content: `
              <button class="tripin-editor-marker${selected ? ' tripin-editor-marker-selected' : ''}" type="button">
                <span>${String(point.sequence ?? 0).padStart(2, '0')}</span>
              </button>
            `,
          });
          marker.on?.('click', () => onSelectPoint?.(point.id));
          overlays.push(marker);
        }

        for (const segment of segmentSource) {
          if (!segment.polyline) {
            continue;
          }
          const path = parsePolyline(segment.polyline);
          if (!path.length) {
            continue;
          }

          const polyline = new AMap.Polyline({
            path,
            strokeWeight: segment.dirty ? 7 : 6,
            strokeColor: segment.dirty ? '#a95137' : '#204842',
            strokeOpacity: segment.dirty ? 0.88 : 0.72,
            lineJoin: 'round',
            lineCap: 'round',
            strokeStyle: segment.dirty ? 'dashed' : 'solid',
          });
          overlays.push(polyline);
        }

        if (overlays.length) {
          mapRef.current.add(overlays);
          mapRef.current.setFitView(overlays, false, [96, 96, 96, 96]);
        }

        overlaysRef.current = overlays;
        setMapError(null);
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : '初始化高德地图失败。');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    amapKey,
    amapSecurityCode,
    dirtySegmentKeys,
    onDraftLocation,
    onSelectPoint,
    points,
    routeSegments,
    selectedPointId,
  ]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  if (!amapKey) {
    return (
      <section className="editor-map-card editor-map-fallback">
        <div className="editor-map-head">
          <div>
            <p className="eyebrow">编辑地图预览</p>
            <h2 className="section-title">{title}</h2>
          </div>
          <p className="editor-map-note">
            补上 <code>NEXT_PUBLIC_AMAP_JS_KEY</code> 之后，这里就会显示真实高德地图；当前仍然可以继续整理路线。
          </p>
        </div>
        <div className="editor-map-fallback-canvas" role="img" aria-label={`${title} 编辑预览`}>
          <div className="editor-map-fallback-grid" />
          {fallbackPath ? (
            <svg className="editor-map-fallback-svg" viewBox="0 0 500 320" role="presentation">
              <path className="editor-map-fallback-shadow" d={fallbackPath} />
              <path className="editor-map-fallback-path" d={fallbackPath} />
              {fallbackPoints.map((point) => (
                <g key={point.id}>
                  <circle
                    className={`editor-map-fallback-node${point.id === selectedPointId ? ' editor-map-fallback-node-selected' : ''}`}
                    cx={point.x}
                    cy={point.y}
                    r={point.id === selectedPointId ? 12 : 9}
                  />
                </g>
              ))}
            </svg>
          ) : (
            <div className="editor-map-empty-state">
              <p className="eyebrow">等待地图数据</p>
              <p className="section-copy">
                这条路线暂时还没有足够的确认坐标，当前无法绘制路径。
              </p>
            </div>
          )}
          {selectedFallbackPoint ? (
            <div className="editor-map-selected-card">
              <p className="eyebrow">当前选中点</p>
              <p className="editor-map-selected-title">{selectedFallbackPoint.title}</p>
            </div>
          ) : null}
        </div>
        <div className="editor-map-meta">
          <span>{points.length} 个点</span>
          <span>{dirtySegments.filter((segment) => segment.status === 'dirty').length} 段待刷新</span>
        </div>
      </section>
    );
  }

  return (
    <section className="editor-map-card">
      <div className="editor-map-head">
        <div>
          <p className="eyebrow">实时地图画布</p>
          <h2 className="section-title">{title}</h2>
        </div>
        <p className="editor-map-note">
          真实点位和路径覆盖层会显示在这里；待刷新的路径段会持续高亮，直到你执行路线刷新。
        </p>
      </div>
      <div ref={containerRef} className="editor-map-live-canvas" />
      <div className="editor-map-meta">
        <span>地图上共 {points.length} 个点</span>
        <span>{dirtySegments.filter((segment) => segment.status === 'dirty').length} 段路径待更新</span>
        {mapError ? <span>{mapError}</span> : null}
      </div>
    </section>
  );
}
