import { describe, expect, it } from 'vitest';

import {
  createInitialPostState,
  getStopListDensity,
  getVisibleStopWindow,
  selectStop,
  stepImageBackward,
  stepImageForward,
  type HomeFeedPostState,
} from './post-interactions';
import type { HomeFeedPost } from './types';

const post: HomeFeedPost = {
  id: 'post-demo',
  title: 'Beijing day route',
  summary: 'Great Wall, Forbidden City, Jingshan',
  authorName: 'Li Wen',
  cityName: 'Beijing',
  authorBadge: 'TripIn / Beijing',
  avatarLabel: 'LW',
  detailHref: '/routes/post-demo',
  publishedLabel: '2026/4/5',
  likeCount: 1,
  commentCount: 1,
  stops: [
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
    {
      id: 's5',
      title: 'Bell Tower Night',
      placeLabel: 'Gulou East',
      timeLabel: '20:15',
      latitude: 39.9472,
      longitude: 116.3927,
      images: ['tower-1', 'tower-2'],
    },
  ],
};

describe('getStopListDensity', () => {
  it('maps stop counts to density modes', () => {
    expect(getStopListDensity(0)).toBe('single');
    expect(getStopListDensity(1)).toBe('single');
    expect(getStopListDensity(2)).toBe('pair');
    expect(getStopListDensity(3)).toBe('trio');
    expect(getStopListDensity(4)).toBe('scroll');
    expect(getStopListDensity(8)).toBe('scroll');
  });
});

describe('post image and stop state', () => {
  it('starts at the first stop and first image', () => {
    expect(createInitialPostState()).toEqual({
      activeStopIndex: 0,
      activeImageIndex: 0,
    });
  });

  it('switching stop resets the image index to the first image of that stop', () => {
    const state: HomeFeedPostState = { activeStopIndex: 0, activeImageIndex: 1 };

    expect(selectStop(post, state, 2)).toEqual({
      activeStopIndex: 2,
      activeImageIndex: 0,
    });
  });

  it('image forward only changes the current image inside the active stop', () => {
    const state: HomeFeedPostState = { activeStopIndex: 2, activeImageIndex: 0 };

    expect(stepImageForward(post, state)).toEqual({
      activeStopIndex: 2,
      activeImageIndex: 1,
    });
  });

  it('image forward moves to the next stop when the current stop has no more images', () => {
    const state: HomeFeedPostState = { activeStopIndex: 0, activeImageIndex: 1 };

    expect(stepImageForward(post, state)).toEqual({
      activeStopIndex: 1,
      activeImageIndex: 0,
    });
  });

  it('image forward clamps at the final image of the final stop', () => {
    const state: HomeFeedPostState = { activeStopIndex: 4, activeImageIndex: 1 };

    expect(stepImageForward(post, state)).toEqual(state);
  });

  it('image backward only changes the current image inside the active stop', () => {
    const state: HomeFeedPostState = { activeStopIndex: 2, activeImageIndex: 2 };

    expect(stepImageBackward(post, state)).toEqual({
      activeStopIndex: 2,
      activeImageIndex: 1,
    });
  });

  it('image backward moves to the previous stop and lands on its last image', () => {
    const state: HomeFeedPostState = { activeStopIndex: 3, activeImageIndex: 0 };

    expect(stepImageBackward(post, state)).toEqual({
      activeStopIndex: 2,
      activeImageIndex: 2,
    });
  });

  it('image backward clamps at the first image of the first stop', () => {
    const state: HomeFeedPostState = { activeStopIndex: 0, activeImageIndex: 0 };

    expect(stepImageBackward(post, state)).toEqual(state);
  });
});

describe('getVisibleStopWindow', () => {
  it('returns the full range when stop count fits the visible count', () => {
    expect(getVisibleStopWindow(3, 1, 4)).toEqual([0, 3]);
    expect(getVisibleStopWindow(4, 2, 4)).toEqual([0, 4]);
  });

  it('returns a sliding window when there are more than four stops', () => {
    expect(getVisibleStopWindow(5, 0, 4)).toEqual([0, 4]);
    expect(getVisibleStopWindow(5, 2, 4)).toEqual([1, 5]);
    expect(getVisibleStopWindow(5, 4, 4)).toEqual([1, 5]);
  });
});
