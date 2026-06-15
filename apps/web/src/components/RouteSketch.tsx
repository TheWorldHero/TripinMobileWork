'use client';

import type { RouteCoordinate } from '../types';

type SketchPoint = RouteCoordinate & {
  id?: string;
  label?: string;
};

type Projected = {
  x: number;
  y: number;
  id?: string;
  label?: string;
};

const VIEW_W = 400;

function project(points: SketchPoint[], width: number, height: number): Projected[] {
  const padX = 34;
  const padY = 30;
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.0001);
  const lngRange = Math.max(maxLng - minLng, 0.0001);

  return points.map((point, index) => {
    if (points.length === 1) {
      return { x: width / 2, y: height / 2, id: point.id, label: point.label };
    }
    const x = padX + ((point.longitude - minLng) / lngRange) * (width - padX * 2);
    // North is up: larger latitudes render higher.
    const y = padY + ((maxLat - point.latitude) / latRange) * (height - padY * 2);
    return { x, y, id: point.id ?? String(index), label: point.label };
  });
}

function smoothPath(points: Projected[]): string {
  if (points.length < 2) {
    return '';
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (afterNext.x - current.x) / 6;
    const cp2y = next.y - (afterNext.y - current.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return path;
}

/**
 * Decorative real-map-flavoured route preview, mirroring the mobile app's
 * RoutePreview: light blue canvas, water/park/road texture, blue route line
 * with numbered stop badges (起 / 终 at the ends).
 */
export function RouteSketch({
  points,
  aspect = 2.4,
  markers = true,
  emptyLabel = '路线预览将在这里显示',
  activeId,
  onPointClick,
}: {
  points: SketchPoint[];
  aspect?: number;
  markers?: boolean;
  emptyLabel?: string;
  activeId?: string | null;
  onPointClick?: (id: string) => void;
}) {
  const height = Math.round(VIEW_W / aspect);
  const valid = points.filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  const projected = valid.length ? project(valid, VIEW_W, height) : [];
  const path = smoothPath(projected);

  return (
    <div className="route-sketch" style={{ aspectRatio: `${VIEW_W} / ${height}` }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        role={onPointClick ? 'group' : 'img'}
        aria-label={projected.length ? `路线预览，共 ${projected.length} 个点位` : '路线预览'}
      >
        {/* decorative map texture */}
        <ellipse cx={VIEW_W * 0.82} cy={height * 0.18} rx={VIEW_W * 0.3} ry={height * 0.34} fill="var(--map-water)" transform={`rotate(-7 ${VIEW_W * 0.82} ${height * 0.18})`} />
        <rect x={VIEW_W * 0.62} y={height * 0.66} width={VIEW_W * 0.42} height={height * 0.5} fill="var(--map-park)" transform={`rotate(5 ${VIEW_W * 0.8} ${height * 0.9})`} />
        <rect x={-20} y={height * 0.72} width={VIEW_W * 0.4} height={height * 0.34} fill="#ffffff" opacity="0.5" />
        <rect x={VIEW_W * 0.08} y={-12} width={VIEW_W * 0.22} height={height * 0.4} fill="#ffffff" opacity="0.44" />
        <line x1={-10} y1={height * 0.3} x2={VIEW_W + 10} y2={height * 0.46} stroke="#ffffff" strokeWidth="7" opacity="0.85" />
        <line x1={VIEW_W * 0.3} y1={-10} x2={VIEW_W * 0.52} y2={height + 10} stroke="#ffffff" strokeWidth="5" opacity="0.7" />
        <line x1={-10} y1={height * 0.78} x2={VIEW_W + 10} y2={height * 0.62} stroke="#ffffff" strokeWidth="4" opacity="0.6" />

        {/* route */}
        {path ? (
          <>
            <path d={path} fill="none" stroke="#62a6e4" strokeWidth="9" strokeLinecap="round" opacity="0.18" />
            <path d={path} fill="none" stroke="#bcdcf7" strokeWidth="6.5" strokeLinecap="round" />
            <path d={path} fill="none" stroke="#3b82c4" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : null}

        {markers
          ? projected.map((point, index) => {
              const isStart = index === 0 && projected.length > 1;
              const isEnd = index === projected.length - 1 && projected.length > 1;
              const isActive = activeId != null && point.id === activeId;
              const radius = isActive ? 14 : 11;
              const fill = isStart || isActive ? '#3b82c4' : isEnd ? '#62a6e4' : '#ffffff';
              const textFill = isStart || isEnd || isActive ? '#ffffff' : '#3b82c4';
              const label = point.label ?? (isStart ? '起' : isEnd ? '终' : String(index + 1));
              return (
                <g
                  key={point.id ?? index}
                  onClick={onPointClick && point.id ? () => onPointClick(point.id as string) : undefined}
                  onKeyDown={
                    onPointClick && point.id
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onPointClick(point.id as string);
                          }
                        }
                      : undefined
                  }
                  role={onPointClick && point.id ? 'button' : undefined}
                  tabIndex={onPointClick && point.id ? 0 : undefined}
                  aria-label={onPointClick && point.id ? `点位 ${label}` : undefined}
                  style={onPointClick ? { cursor: 'pointer' } : undefined}
                >
                  {isActive ? (
                    <circle className="sketch-pulse" cx={point.x} cy={point.y} r={radius} fill="none" stroke="#3b82c4" strokeWidth="3" />
                  ) : null}
                  <circle cx={point.x} cy={point.y} r={radius} fill={fill} stroke={isEnd && !isActive ? '#62a6e4' : '#3b82c4'} strokeWidth="2.5" />
                  <text
                    x={point.x}
                    y={point.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isActive ? 12 : 10.5}
                    fontWeight="800"
                    fill={textFill}
                  >
                    {label}
                  </text>
                </g>
              );
            })
          : null}
      </svg>
      {!projected.length ? <div className="route-sketch-empty">{emptyLabel}</div> : null}
    </div>
  );
}
