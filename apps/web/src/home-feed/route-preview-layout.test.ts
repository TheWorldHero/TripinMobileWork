import { describe, expect, it } from 'vitest';

import { createRoutePreviewLayout, ROUTE_PREVIEW_VIEWBOX_HEIGHT, ROUTE_PREVIEW_VIEWBOX_WIDTH } from './route-preview-layout';
import type { HomeFeedStop } from './types';

const stops: HomeFeedStop[] = [
  {
    id: 's1',
    title: 'Great Wall',
    placeLabel: 'Badaling',
    timeLabel: '07:10',
    latitude: 40.3564,
    longitude: 116.0206,
    images: ['wall-1', 'wall-2'],
  },
  {
    id: 's2',
    title: 'Forbidden City',
    placeLabel: 'Palace Museum',
    timeLabel: '11:40',
    latitude: 39.9163,
    longitude: 116.3972,
    images: ['palace-1'],
  },
  {
    id: 's3',
    title: 'Jingshan',
    placeLabel: 'Jingshan Park',
    timeLabel: '15:20',
    latitude: 39.9321,
    longitude: 116.3961,
    images: ['hill-1', 'hill-2', 'hill-3'],
  },
  {
    id: 's4',
    title: 'Houhai',
    placeLabel: 'Houhai',
    timeLabel: '18:40',
    latitude: 39.9409,
    longitude: 116.3876,
    images: ['lake-1'],
  },
];

describe('createRoutePreviewLayout', () => {
  it('creates anchors within the feed map viewbox', () => {
    const layout = createRoutePreviewLayout(stops, 2);

    expect(layout.anchors).toHaveLength(4);
    expect(layout.anchors.every((anchor) => anchor.x >= 0 && anchor.x <= ROUTE_PREVIEW_VIEWBOX_WIDTH)).toBe(true);
    expect(layout.anchors.every((anchor) => anchor.y >= 0 && anchor.y <= ROUTE_PREVIEW_VIEWBOX_HEIGHT)).toBe(true);
  });

  it('spreads anchors from left to right and exposes percentage positions for overlay buttons', () => {
    const layout = createRoutePreviewLayout(stops, 1);

    expect(layout.anchors[0]!.x).toBeLessThan(layout.anchors[1]!.x);
    expect(layout.anchors[1]!.x).toBeLessThan(layout.anchors[2]!.x);
    expect(layout.anchors[0]!.leftPercent).toContain('%');
    expect(layout.anchors[2]!.topPercent).toContain('%');
  });

  it('builds a progressive active path that only includes anchors through the active stop', () => {
    const layout = createRoutePreviewLayout(stops, 1);

    expect(layout.fullPathD).toContain(stops.length > 2 ? 'C' : 'L');
    expect(layout.activePathD).toContain(layout.anchors[1]!.x.toFixed(1));
    expect(layout.activePathD).not.toContain(layout.anchors[3]!.x.toFixed(1));
  });

  it('returns a centered single anchor with no path for one-stop posts', () => {
    const layout = createRoutePreviewLayout(stops.slice(0, 1), 0);

    expect(layout.anchors).toHaveLength(1);
    expect(layout.fullPathD).toBe('');
    expect(layout.activePathD).toBe('');
    expect(layout.anchors[0]).toMatchObject({
      x: ROUTE_PREVIEW_VIEWBOX_WIDTH / 2,
      y: expect.any(Number),
    });
  });
});
