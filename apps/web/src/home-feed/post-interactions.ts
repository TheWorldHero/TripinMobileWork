import type { HomeFeedPost, HomeFeedStop } from './types';

export type HomeFeedPostState = {
  activeStopIndex: number;
  activeImageIndex: number;
};

export type StopListDensity = 'single' | 'pair' | 'trio' | 'scroll';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSafeStop(post: HomeFeedPost, stopIndex: number): HomeFeedStop | null {
  if (!post.stops.length) {
    return null;
  }

  return post.stops[clamp(stopIndex, 0, post.stops.length - 1)] ?? null;
}

function getImageCount(stop: HomeFeedStop | null) {
  return Math.max(stop?.images.length ?? 0, 1);
}

function normalizeState(post: HomeFeedPost, state: HomeFeedPostState): HomeFeedPostState {
  if (!post.stops.length) {
    return createInitialPostState();
  }

  const activeStopIndex = clamp(state.activeStopIndex, 0, post.stops.length - 1);
  const stop = getSafeStop(post, activeStopIndex);
  const imageCount = getImageCount(stop);

  return {
    activeStopIndex,
    activeImageIndex: clamp(state.activeImageIndex, 0, imageCount - 1),
  };
}

export function createInitialPostState(): HomeFeedPostState {
  return { activeStopIndex: 0, activeImageIndex: 0 };
}

export function selectStop(
  post: HomeFeedPost,
  _state: HomeFeedPostState,
  stopIndex: number,
): HomeFeedPostState {
  if (!post.stops.length) {
    return createInitialPostState();
  }

  return {
    activeStopIndex: clamp(stopIndex, 0, post.stops.length - 1),
    activeImageIndex: 0,
  };
}

export function stepImageForward(post: HomeFeedPost, state: HomeFeedPostState): HomeFeedPostState {
  if (!post.stops.length) {
    return createInitialPostState();
  }

  const current = normalizeState(post, state);
  const stop = getSafeStop(post, current.activeStopIndex);
  const imageCount = getImageCount(stop);

  if (current.activeImageIndex < imageCount - 1) {
    return {
      activeStopIndex: current.activeStopIndex,
      activeImageIndex: current.activeImageIndex + 1,
    };
  }

  if (current.activeStopIndex >= post.stops.length - 1) {
    return current;
  }

  return {
    activeStopIndex: current.activeStopIndex + 1,
    activeImageIndex: 0,
  };
}

export function stepImageBackward(post: HomeFeedPost, state: HomeFeedPostState): HomeFeedPostState {
  if (!post.stops.length) {
    return createInitialPostState();
  }

  const current = normalizeState(post, state);
  if (current.activeImageIndex > 0) {
    return {
      activeStopIndex: current.activeStopIndex,
      activeImageIndex: current.activeImageIndex - 1,
    };
  }

  if (current.activeStopIndex <= 0) {
    return current;
  }

  const previousStopIndex = current.activeStopIndex - 1;
  const previousStop = getSafeStop(post, previousStopIndex);

  return {
    activeStopIndex: previousStopIndex,
    activeImageIndex: getImageCount(previousStop) - 1,
  };
}

export function canStepImageForward(post: HomeFeedPost, state: HomeFeedPostState) {
  const current = normalizeState(post, state);
  const next = stepImageForward(post, current);

  return next.activeStopIndex !== current.activeStopIndex || next.activeImageIndex !== current.activeImageIndex;
}

export function canStepImageBackward(post: HomeFeedPost, state: HomeFeedPostState) {
  const current = normalizeState(post, state);
  const previous = stepImageBackward(post, current);

  return (
    previous.activeStopIndex !== current.activeStopIndex ||
    previous.activeImageIndex !== current.activeImageIndex
  );
}

export function getStopListDensity(stopCount: number): StopListDensity {
  if (stopCount <= 1) {
    return 'single';
  }

  if (stopCount === 2) {
    return 'pair';
  }

  if (stopCount === 3) {
    return 'trio';
  }

  return 'scroll';
}

export function getVisibleStopWindow(
  stopCount: number,
  activeIndex: number,
  visibleCount: number,
): [number, number] {
  if (stopCount <= 0 || visibleCount <= 0) {
    return [0, 0];
  }

  if (stopCount <= visibleCount) {
    return [0, stopCount];
  }

  const safeActiveIndex = clamp(activeIndex, 0, stopCount - 1);
  const maxStart = stopCount - visibleCount;
  const centeredStart = safeActiveIndex - Math.ceil(visibleCount / 2) + 1;
  const start = clamp(centeredStart, 0, maxStart);

  return [start, start + visibleCount];
}
