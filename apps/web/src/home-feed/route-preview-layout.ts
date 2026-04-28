import type { HomeFeedStop } from './types';

export const ROUTE_PREVIEW_VIEWBOX_WIDTH = 560;
export const ROUTE_PREVIEW_VIEWBOX_HEIGHT = 132;

const X_PADDING = 34;
const Y_MIN = 26;
const Y_MAX = 106;
const Y_CENTER = 68;

export type RoutePreviewAnchor = {
  x: number;
  y: number;
  leftPercent: string;
  topPercent: string;
};

export type RoutePreviewLayout = {
  anchors: RoutePreviewAnchor[];
  fullPathD: string;
  activePathD: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toPercent(value: number, total: number) {
  return `${((value / total) * 100).toFixed(3)}%`;
}

function normalizeLatitudes(stops: HomeFeedStop[]) {
  if (stops.length <= 1) {
    return stops.map(() => 0);
  }

  const latitudes = stops.map((stop) => stop.latitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.0001);

  return stops.map((stop) => ((stop.latitude - minLatitude) / latitudeRange - 0.5) * -1);
}

function createAnchors(stops: HomeFeedStop[]): RoutePreviewAnchor[] {
  if (!stops.length) {
    return [];
  }

  if (stops.length === 1) {
    const x = ROUTE_PREVIEW_VIEWBOX_WIDTH / 2;
    const y = Y_CENTER;

    return [
      {
        x,
        y,
        leftPercent: toPercent(x, ROUTE_PREVIEW_VIEWBOX_WIDTH),
        topPercent: toPercent(y, ROUTE_PREVIEW_VIEWBOX_HEIGHT),
      },
    ];
  }

  const width = ROUTE_PREVIEW_VIEWBOX_WIDTH - X_PADDING * 2;
  const normalizedLatitudes = normalizeLatitudes(stops);

  return stops.map((_, index) => {
    const progress = index / (stops.length - 1);
    const wave = Math.sin(progress * Math.PI * 1.2 - Math.PI * 0.15) * 12;
    const latitudeOffset = normalizedLatitudes[index] * 14;
    const taper = 1 - Math.abs(progress - 0.5) * 0.4;
    const x = X_PADDING + progress * width;
    const y = clamp(Y_CENTER + (wave + latitudeOffset) * taper, Y_MIN, Y_MAX);

    return {
      x,
      y,
      leftPercent: toPercent(x, ROUTE_PREVIEW_VIEWBOX_WIDTH),
      topPercent: toPercent(y, ROUTE_PREVIEW_VIEWBOX_HEIGHT),
    };
  });
}

function buildSmoothPath(points: RoutePreviewAnchor[]) {
  if (points.length <= 1) {
    return '';
  }

  if (points.length === 2) {
    return `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)} L ${points[1]!.x.toFixed(1)} ${points[1]!.y.toFixed(1)}`;
  }

  let path = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index]!;
    const current = points[index]!;
    const next = points[index + 1]!;
    const afterNext = points[index + 2] ?? next;

    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (afterNext.x - current.x) / 6;
    const cp2y = next.y - (afterNext.y - current.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }

  return path;
}

export function createRoutePreviewLayout(stops: HomeFeedStop[], activeStopIndex: number): RoutePreviewLayout {
  const anchors = createAnchors(stops);
  const activeIndex = clamp(activeStopIndex, 0, Math.max(anchors.length - 1, 0));

  return {
    anchors,
    fullPathD: buildSmoothPath(anchors),
    activePathD: buildSmoothPath(anchors.slice(0, activeIndex + 1)),
  };
}
