'use client';

import type { RouteCoordinate, RoutePoint, RouteSegment } from '../types';

type ProjectedPoint = {
  x: number;
  y: number;
};

type MapPoint = ProjectedPoint & {
  id: string;
  label: string;
};

const FALLBACK_POINTS: MapPoint[] = [
  { id: 'fallback-1', x: 54, y: 214, label: '起点' },
  { id: 'fallback-2', x: 150, y: 150, label: '停留点' },
  { id: 'fallback-3', x: 280, y: 168, label: '停留点' },
  { id: 'fallback-4', x: 430, y: 86, label: '终点' },
];

function pointLabel(point: RoutePoint, index: number) {
  return (
    point.title ||
    point.placeName ||
    point.cityName ||
    point.districtName ||
    `点位 ${index + 1}`
  );
}

function toCoordinates(points: RoutePoint[]): Array<RouteCoordinate & { id: string; label: string }> {
  return points
    .map((point, index) => {
      if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
        return null;
      }

      return {
        id: point.id,
        label: pointLabel(point, index),
        latitude: point.latitude,
        longitude: point.longitude,
      };
    })
    .filter((point): point is RouteCoordinate & { id: string; label: string } => point !== null);
}

function projectCoordinates(
  coordinates: Array<RouteCoordinate & { id: string; label: string }>,
): MapPoint[] {
  if (!coordinates.length) {
    return FALLBACK_POINTS;
  }

  const longitudes = coordinates.map((point) => point.longitude);
  const latitudes = coordinates.map((point) => point.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const width = Math.max(maxLongitude - minLongitude, 0.001);
  const height = Math.max(maxLatitude - minLatitude, 0.001);

  return coordinates.map((point) => {
    const x = 58 + ((point.longitude - minLongitude) / width) * 384;
    const y = 218 - ((point.latitude - minLatitude) / height) * 148;
    return {
      id: point.id,
      label: point.label,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
    };
  });
}

function buildPath(points: ProjectedPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
}

export function RouteMap({
  title,
  points,
  routeSegments,
  pointCount,
}: {
  title: string;
  points: RoutePoint[];
  routeSegments: RouteSegment[];
  pointCount: number;
}) {
  const projectedPoints = projectCoordinates(toCoordinates(points));
  const path = buildPath(projectedPoints);

  return (
    <section className="map-card map-card-compact">
      <div className="map-card-header">
        <div>
          <p className="eyebrow">路线图</p>
          <h2 className="section-title">{title}</h2>
        </div>
        <p className="map-card-note">
          {routeSegments.length ? '已生成路线段' : `${pointCount} 个点位`}
        </p>
      </div>
      <div className="map-canvas map-canvas-compact" role="img" aria-label={`${title} 路线图`}>
        <div className="map-canvas-paper" />
        <svg className="map-canvas-svg" viewBox="0 0 500 280" role="presentation">
          {projectedPoints.length > 1 ? <path className="map-path-shadow" d={path} /> : null}
          {projectedPoints.length > 1 ? <path className="map-path" d={path} /> : null}
          {projectedPoints.map((point, index) => (
            <g key={point.id}>
              <circle
                className={index === 0 ? 'map-node map-node-start' : 'map-node'}
                cx={point.x}
                cy={point.y}
                r="7"
              />
              <text
                className="map-node-label"
                x={Math.min(point.x + 12, 420)}
                y={Math.max(point.y - 10, 24)}
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
