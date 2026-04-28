import type {
  CommentItem,
  FeedItem,
  FeedRoutePreviewPoint,
  FeedResponse,
  MediaAsset,
  PlaceCandidate,
  RouteCounts,
  RouteCoordinate,
  RouteDetail,
  RoutePoint,
  RouteSegment,
  TripDraft,
  TripDraftPoint,
  UserSummary,
  ViewerInteractionState,
} from '../types';
import { getSessionUserId } from './session';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

type RequestOptions = RequestInit & {
  allowNotFound?: boolean;
};

type RawMediaAsset = {
  id: string;
  originalName?: string | null;
  caption?: string | null;
  takenAt?: string | null;
  storageKey?: string | null;
  bucket?: string | null;
  status?: string | null;
  mimeType?: string | null;
  width?: number | string | null;
  height?: number | string | null;
  exifLatitude?: number | string | null;
  exifLongitude?: number | string | null;
};


type RawFeedItem = {
  id: string;
  title: string;
  summary?: string | null;
  cityName?: string | null;
  pointCount?: number | null;
  mediaCount?: number | null;
  publishedAt?: string | null;
  author?: UserSummary | null;
  coverMedia?: RawMediaAsset | null;
  viewerState?: {
    liked?: boolean | null;
    saved?: boolean | null;
  } | null;
  trip: {
    id: string;
    title: string;
    kind?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    routePreview?: Array<{
      latitude?: number | string | null;
      longitude?: number | string | null;
      pointId?: string | null;
      sequence?: number | null;
    }> | null;
  };
  _count?: {
    likes?: number | null;
    saves?: number | null;
    comments?: number | null;
  } | null;
};

type RawLinePoint = {
  id: string;
  title?: string | null;
  note?: string | null;
  sequence?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string | null;
  checkInAt?: string | null;
  state?: string | null;
  mediaCount?: number | null;
  placeId?: string | null;
};

type RawLineResponse = {
  id: string;
  title: string;
  summary?: string | null;
  pointCount?: number | null;
  mediaCount?: number | null;
  visibility?: string | null;
  status?: string | null;
  totalDistanceMeters?: number | null;
  totalDurationSeconds?: number | null;
  routeSegments?: RouteSegment[] | null;
  points?: RawLinePoint[] | null;
};

type RawTripPoint = {
  id: string;
  title?: string | null;
  note?: string | null;
  sequence?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  mediaCount?: number | null;
  mediaAssets?: RawMediaAsset[] | null;
  place?: {
    id: string;
    name: string;
    cityName?: string | null;
    districtName?: string | null;
  } | null;
};

type RawPostResponse = {
  id: string;
  title: string;
  summary?: string | null;
  cityName?: string | null;
  publishedAt?: string | null;
  pointCount?: number | null;
  mediaCount?: number | null;
  author?: UserSummary | null;
  coverMedia?: RawMediaAsset | null;
  counts?: {
    likes?: number | null;
    saves?: number | null;
    comments?: number | null;
  } | null;
  viewerState?: {
    liked?: boolean | null;
    saved?: boolean | null;
  } | null;
  comments?: Array<{
    id: string;
    content: string;
    createdAt?: string | null;
    user: UserSummary;
  }> | null;
  trip: {
    id: string;
    title: string;
    summary?: string | null;
    cityName?: string | null;
    visibility?: string | null;
    status?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    pointCount?: number | null;
    mediaCount?: number | null;
    routePreview?: Array<{
      latitude?: number | string | null;
      longitude?: number | string | null;
    }> | null;
    points?: RawTripPoint[] | null;
  };
};

type RawTripDraftPoint = {
  id: string;
  title?: string | null;
  note?: string | null;
  customPlaceName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  sequence?: number | null;
  sourceType?: string | null;
  mediaCount?: number | null;
  mediaAssets?: RawMediaAsset[] | null;
  place?: {
    id: string;
    name: string;
    cityName?: string | null;
    districtName?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
};

type RawTripDraft = {
  id: string;
  title: string;
  summary?: string | null;
  kind?: string | null;
  status?: string | null;
  visibility?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
  coverMediaId?: string | null;
  coverMedia?: RawMediaAsset | null;
  pointCount?: number | null;
  mediaCount?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  routePreview?: Array<{
    latitude?: number | string | null;
    longitude?: number | string | null;
  }> | null;
  points?: RawTripDraftPoint[] | null;
  post?: {
    id: string;
  } | null;
};

type RawPlaceCandidate = {
  id?: string | null;
  provider?: string | null;
  providerId?: string | null;
  name: string;
  shortName?: string | null;
  formattedAddress?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  countryCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  source?: string | null;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asCoordinates(
  points: Array<{ latitude?: number | string | null; longitude?: number | string | null }>,
): RouteCoordinate[] {
  return points
    .map((point) => {
      const latitude = toNumber(point.latitude);
      const longitude = toNumber(point.longitude);

      if (latitude === null || longitude === null) {
        return null;
      }

      return { latitude, longitude };
    })
    .filter((point): point is RouteCoordinate => point !== null);
}

function sortRoutePoints(points: RoutePoint[]): RoutePoint[] {
  return [...points].sort((left, right) => {
    const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
    const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;

    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    const leftTimestamp =
      left.checkInAt ?? left.capturedAt ?? left.startedAt ?? left.endedAt ?? '';
    const rightTimestamp =
      right.checkInAt ?? right.capturedAt ?? right.startedAt ?? right.endedAt ?? '';
    return leftTimestamp.localeCompare(rightTimestamp);
  });
}

function normalizeMediaAsset(media?: RawMediaAsset | null): MediaAsset | null {
  if (!media) {
    return null;
  }

  return {
    id: media.id,
    originalName: media.originalName ?? null,
    caption: media.caption ?? null,
    takenAt: media.takenAt ?? null,
    storageKey: media.storageKey ?? null,
    bucket: media.bucket ?? null,
    status: media.status ?? null,
    mimeType: media.mimeType ?? null,
    width: toNumber(media.width),
    height: toNumber(media.height),
    exifLatitude: toNumber(media.exifLatitude),
    exifLongitude: toNumber(media.exifLongitude),
  };
}

function normalizeFeedItem(item: RawFeedItem): FeedItem {
  const routePreview = (item.trip.routePreview ?? [])
    .map((point): FeedRoutePreviewPoint | null => {
      const latitude = toNumber(point.latitude);
      const longitude = toNumber(point.longitude);

      if (latitude === null || longitude === null) {
        return null;
      }

      return {
        latitude,
        longitude,
        ...(point.pointId ? { pointId: point.pointId } : {}),
        ...(typeof point.sequence === 'number' ? { sequence: point.sequence } : {}),
      };
    })
    .filter((point): point is FeedRoutePreviewPoint => point !== null);

  return {
    id: item.id,
    title: item.title,
    summary: item.summary ?? null,
    cityName: item.cityName ?? null,
    pointCount: item.pointCount ?? 0,
    mediaCount: item.mediaCount ?? 0,
    publishedAt: item.publishedAt ?? new Date(0).toISOString(),
    author:
      item.author ?? {
        id: 'unknown-user',
        displayName: 'Unknown author',
      },
    coverMedia: normalizeMediaAsset(item.coverMedia),
    viewerState: {
      liked: item.viewerState?.liked ?? false,
      saved: item.viewerState?.saved ?? false,
    },
    trip: {
      id: item.trip.id,
      title: item.trip.title,
      kind: item.trip.kind ?? null,
      startedAt: item.trip.startedAt ?? null,
      endedAt: item.trip.endedAt ?? null,
      routePreview,
    },
    _count: {
      likes: item._count?.likes ?? 0,
      saves: item._count?.saves ?? 0,
      comments: item._count?.comments ?? 0,
    },
  };
}

async function request<T>(
  path: string,
  options?: RequestOptions,
): Promise<T | null> {
  const currentUserId = await getSessionUserId();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(currentUserId ? { 'x-user-id': currentUserId } : {}),
        ...(options?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
      throw new Error('现在连不上后端接口。请先启动 API，再回来创建草稿或上传图片。');
    }
    throw error;
  }

  if (options?.allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const message = await response.text();
    const looksLikeHtml =
      contentType.includes('text/html') ||
      message.startsWith('<!DOCTYPE html') ||
      message.startsWith('<html');

    if (looksLikeHtml) {
      throw new Error('后端接口没有正常连上。请先启动 API，再刷新页面重试。');
    }

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeLineDetail(line: RawLineResponse): RouteDetail {
  const sortedPoints = sortRoutePoints(
    (line.points ?? []).map((point, index) => ({
      id: point.id,
      title: point.title,
      note: point.note,
      sequence: point.sequence ?? index + 1,
      latitude: toNumber(point.latitude),
      longitude: toNumber(point.longitude),
      capturedAt: point.capturedAt ?? null,
      checkInAt: point.checkInAt ?? null,
      state: point.state ?? null,
      mediaCount: point.mediaCount ?? null,
    })),
  );

  return {
    id: line.id,
    source: 'line',
    title: line.title,
    summary: line.summary ?? null,
    pointCount: line.pointCount ?? sortedPoints.length,
    mediaCount:
      line.mediaCount ??
      sortedPoints.reduce((sum, point) => sum + (point.mediaCount ?? 0), 0),
    publishedAt: null,
    startedAt: sortedPoints[0]?.checkInAt ?? sortedPoints[0]?.capturedAt ?? null,
    endedAt:
      sortedPoints[sortedPoints.length - 1]?.checkInAt ??
      sortedPoints[sortedPoints.length - 1]?.capturedAt ??
      null,
    visibility: line.visibility ?? null,
    status: line.status ?? null,
    author: null,
    counts: null,
    routePreview: asCoordinates(sortedPoints),
    routeSegments: line.routeSegments ?? [],
    points: sortedPoints,
  };
}

function normalizePostDetail(post: RawPostResponse): RouteDetail {
  const sortedPoints = sortRoutePoints(
    (post.trip.points ?? []).map((point, index) => ({
      id: point.id,
      title: point.title,
      note: point.note,
      sequence: point.sequence ?? index + 1,
      latitude: toNumber(point.latitude),
      longitude: toNumber(point.longitude),
      startedAt: point.startedAt ?? null,
      endedAt: point.endedAt ?? null,
      mediaCount: point.mediaCount ?? null,
      placeName: point.place?.name ?? null,
      cityName: point.place?.cityName ?? null,
      districtName: point.place?.districtName ?? null,
      mediaAssets: (point.mediaAssets ?? [])
        .map(normalizeMediaAsset)
        .filter((media): media is MediaAsset => media !== null),
    })),
  );

  return {
    id: post.id,
    source: 'post',
    title: post.title,
    summary: post.summary ?? post.trip.summary ?? null,
    cityName: post.cityName ?? post.trip.cityName ?? null,
    pointCount: post.pointCount ?? post.trip.pointCount ?? sortedPoints.length,
    mediaCount:
      post.mediaCount ??
      post.trip.mediaCount ??
      sortedPoints.reduce((sum, point) => sum + (point.mediaCount ?? 0), 0),
    publishedAt: post.publishedAt ?? null,
    startedAt:
      post.trip.startedAt ??
      sortedPoints[0]?.startedAt ??
      sortedPoints[0]?.endedAt ??
      null,
    endedAt:
      post.trip.endedAt ??
      sortedPoints[sortedPoints.length - 1]?.endedAt ??
      sortedPoints[sortedPoints.length - 1]?.startedAt ??
      null,
    visibility: post.trip.visibility ?? null,
    status: post.trip.status ?? null,
    author: post.author ?? null,
    counts: {
      likes: post.counts?.likes ?? 0,
      saves: post.counts?.saves ?? 0,
      comments: post.counts?.comments ?? 0,
    },
    viewerState: {
      liked: post.viewerState?.liked ?? false,
      saved: post.viewerState?.saved ?? false,
    },
    coverMedia: normalizeMediaAsset(post.coverMedia),
    routePreview: asCoordinates(post.trip.routePreview ?? sortedPoints),
    routeSegments: [],
    points: sortedPoints,
    comments: (post.comments ?? []).map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt ?? null,
      user: comment.user,
    })),
  };
}

function normalizeTripDraftPoint(point: RawTripDraftPoint, index: number): TripDraftPoint {
  return {
    id: point.id,
    title: point.title ?? null,
    note: point.note ?? null,
    customPlaceName: point.customPlaceName ?? null,
    startedAt: point.startedAt ?? null,
    endedAt: point.endedAt ?? null,
    latitude: toNumber(point.latitude),
    longitude: toNumber(point.longitude),
    sequence: point.sequence ?? index + 1,
    sourceType: point.sourceType ?? null,
    mediaCount: point.mediaCount ?? 0,
    mediaAssets: (point.mediaAssets ?? [])
      .map(normalizeMediaAsset)
      .filter((media): media is MediaAsset => media !== null),
    place: point.place
      ? {
          id: point.place.id,
          name: point.place.name,
          cityName: point.place.cityName ?? null,
          districtName: point.place.districtName ?? null,
          latitude: toNumber(point.place.latitude),
          longitude: toNumber(point.place.longitude),
        }
      : null,
  };
}

function normalizeTripDraft(trip: RawTripDraft): TripDraft {
  const points = (trip.points ?? []).map(normalizeTripDraftPoint);
  return {
    id: trip.id,
    title: trip.title,
    summary: trip.summary ?? null,
    kind: trip.kind ?? null,
    status: trip.status ?? null,
    visibility: trip.visibility ?? null,
    cityName: trip.cityName ?? null,
    provinceName: trip.provinceName ?? null,
    coverMediaId: trip.coverMediaId ?? null,
    coverMedia: normalizeMediaAsset(trip.coverMedia),
    pointCount: trip.pointCount ?? points.length,
    mediaCount: trip.mediaCount ?? 0,
    startedAt: trip.startedAt ?? null,
    endedAt: trip.endedAt ?? null,
    routePreview: asCoordinates(trip.routePreview ?? points),
    points: sortRoutePoints(points as RoutePoint[]) as TripDraftPoint[],
    post: trip.post ?? null,
  };
}

function normalizePlaceCandidate(place: RawPlaceCandidate): PlaceCandidate {
  return {
    id: place.id ?? null,
    provider: place.provider ?? null,
    providerId: place.providerId ?? null,
    name: place.name,
    shortName: place.shortName ?? null,
    formattedAddress: place.formattedAddress ?? null,
    provinceName: place.provinceName ?? null,
    cityName: place.cityName ?? null,
    districtName: place.districtName ?? null,
    countryCode: place.countryCode ?? null,
    latitude: toNumber(place.latitude),
    longitude: toNumber(place.longitude),
    source: place.source ?? null,
  };
}

export const api = {
  async getCurrentUser(): Promise<UserSummary> {
    const response = await request<UserSummary>('/users/me');
    if (!response) {
      throw new Error('Failed to load current user.');
    }
    return response;
  },

  async getFeed(): Promise<FeedResponse> {
    const response = await request<{
      items?: RawFeedItem[] | null;
      nextCursor?: string | null;
      mode?: string | null;
    }>('/feed');
    return {
      items: (response?.items ?? []).map(normalizeFeedItem),
      nextCursor: response?.nextCursor ?? null,
      mode: response?.mode ?? null,
    };
  },

  async getRoute(routeId: string): Promise<RouteDetail> {
    const line = await request<RawLineResponse>(`/lines/${routeId}`, {
      allowNotFound: true,
    });
    if (line) {
      return normalizeLineDetail(line);
    }

    const post = await request<RawPostResponse>(`/posts/${routeId}`, {
      allowNotFound: true,
    });
    if (post) {
      return normalizePostDetail(post);
    }

    throw new Error(`Could not find route ${routeId}.`);
  },

  async getLine(lineId: string): Promise<RouteDetail> {
    const line = await request<RawLineResponse>(`/lines/${lineId}`);
    if (!line) {
      throw new Error(`Could not find line ${lineId}.`);
    }
    return normalizeLineDetail(line);
  },

  async reorderLinePoints(lineId: string, pointIds: string[]): Promise<RouteDetail> {
    const line = await request<RawLineResponse>(`/lines/${lineId}/reorder-points`, {
      method: 'POST',
      body: JSON.stringify({ pointIds }),
    });
    if (!line) {
      throw new Error(`Failed to reorder points for line ${lineId}.`);
    }
    return normalizeLineDetail(line);
  },

  async removeLinePoint(lineId: string, pointId: string): Promise<RouteDetail> {
    const line = await request<RawLineResponse>(`/lines/${lineId}/points/${pointId}`, {
      method: 'DELETE',
    });
    if (!line) {
      throw new Error(`Failed to remove a point from line ${lineId}.`);
    }
    return normalizeLineDetail(line);
  },

  async getInboxPoints(): Promise<RoutePoint[]> {
    const response = await request<{
      items?: Array<{
        id: string;
        title?: string | null;
        note?: string | null;
        latitude?: number | string | null;
        longitude?: number | string | null;
        capturedAt?: string | null;
        checkInAt?: string | null;
        state?: string | null;
        mediaCount?: number | null;
      }> | null;
    }>('/points/inbox');

    return (response?.items ?? []).map((point, index) => ({
      id: point.id,
      title: point.title ?? null,
      note: point.note ?? null,
      sequence: index + 1,
      latitude: toNumber(point.latitude),
      longitude: toNumber(point.longitude),
      capturedAt: point.capturedAt ?? null,
      checkInAt: point.checkInAt ?? null,
      state: point.state ?? null,
      mediaCount: point.mediaCount ?? 0,
    }));
  },

  async attachPointsToLine(lineId: string, pointIds: string[]): Promise<RouteDetail> {
    const line = await request<RawLineResponse>(`/lines/${lineId}/attach-points`, {
      method: 'POST',
      body: JSON.stringify({ pointIds }),
    });
    if (!line) {
      throw new Error(`Failed to attach points to line ${lineId}.`);
    }
    return normalizeLineDetail(line);
  },

  async confirmPointLocation(
    pointId: string,
    payload: {
      latitude: number;
      longitude: number;
      checkInAt: string;
      placeId?: string | null;
    },
  ): Promise<RoutePoint> {
    const point = await request<{
      id: string;
      title?: string | null;
      note?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
      capturedAt?: string | null;
      checkInAt?: string | null;
      state?: string | null;
      mediaCount?: number | null;
    }>(`/points/${pointId}/location`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (!point) {
      throw new Error(`Failed to update location for point ${pointId}.`);
    }

    return {
      id: point.id,
      title: point.title ?? null,
      note: point.note ?? null,
      sequence: 0,
      latitude: toNumber(point.latitude),
      longitude: toNumber(point.longitude),
      capturedAt: point.capturedAt ?? null,
      checkInAt: point.checkInAt ?? null,
      state: point.state ?? null,
      mediaCount: point.mediaCount ?? 0,
    };
  },

  async refreshRoutes(lineId: string): Promise<{
    lineId: string;
    segmentsUpdated: number;
    totalDistanceMeters: number;
    totalDurationSeconds: number;
  }> {
    const response = await request<{
      lineId: string;
      segmentsUpdated: number;
      totalDistanceMeters: number;
      totalDurationSeconds: number;
    }>(`/routes/lines/${lineId}/refresh`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!response) {
      throw new Error(`Failed to refresh routes for line ${lineId}.`);
    }
    return response;
  },

  async listTrips(): Promise<TripDraft[]> {
    const response = await request<{
      items?: RawTripDraft[] | null;
    }>('/trips');
    return (response?.items ?? []).map(normalizeTripDraft);
  },

  async getTrip(tripId: string): Promise<TripDraft> {
    const response = await request<RawTripDraft>(`/trips/${tripId}`);
    if (!response) {
      throw new Error(`Trip ${tripId} was not found.`);
    }
    return normalizeTripDraft(response);
  },

  async createTrip(payload: {
    title: string;
    summary?: string;
    cityName?: string;
    coverMediaId?: string;
    visibility?: string;
    startedAt?: string;
    endedAt?: string;
  }): Promise<TripDraft> {
    const response = await request<RawTripDraft>('/trips', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        summary: payload.summary,
        cityName: payload.cityName,
        coverMediaId: payload.coverMediaId,
        visibility: payload.visibility ?? 'PRIVATE',
        kind: 'MIXED',
        countryCode: 'CN',
        startedAt: payload.startedAt,
        endedAt: payload.endedAt,
      }),
    });
    if (!response) {
      throw new Error('Failed to create trip.');
    }
    return normalizeTripDraft(response);
  },

  async updateTrip(
    tripId: string,
    payload: {
      title?: string;
      summary?: string;
      cityName?: string;
      coverMediaId?: string;
      visibility?: string;
      startedAt?: string;
      endedAt?: string;
    },
  ): Promise<TripDraft> {
    const response = await request<RawTripDraft>(`/trips/${tripId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!response) {
      throw new Error(`Failed to update trip ${tripId}.`);
    }
    return normalizeTripDraft(response);
  },

  async createTripPoint(
    tripId: string,
    payload: {
      title: string;
      note?: string;
      placeId?: string;
      customPlaceName?: string;
      startedAt: string;
      endedAt?: string;
      latitude?: number;
      longitude?: number;
      mediaAssetIds?: string[];
    },
  ): Promise<TripDraft> {
    const response = await request<RawTripDraft>(`/trips/${tripId}/points`, {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        note: payload.note,
        placeId: payload.placeId,
        customPlaceName: payload.customPlaceName,
        startedAt: payload.startedAt,
        endedAt: payload.endedAt,
        latitude: payload.latitude,
        longitude: payload.longitude,
        sourceType: 'MANUAL',
        mediaAssetIds: payload.mediaAssetIds ?? [],
      }),
    });
    if (!response) {
      throw new Error(`Failed to add a point to trip ${tripId}.`);
    }
    return normalizeTripDraft(response);
  },

  async updateTripPoint(
    tripId: string,
    pointId: string,
    payload: {
      title?: string;
      note?: string;
      placeId?: string;
      customPlaceName?: string;
      startedAt?: string;
      endedAt?: string;
      latitude?: number;
      longitude?: number;
      mediaAssetIds?: string[];
    },
  ): Promise<TripDraft> {
    const response = await request<RawTripDraft>(`/trips/${tripId}/points/${pointId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!response) {
      throw new Error(`Failed to update point ${pointId}.`);
    }
    return normalizeTripDraft(response);
  },

  async deleteTripPoint(tripId: string, pointId: string): Promise<TripDraft> {
    const response = await request<RawTripDraft>(`/trips/${tripId}/points/${pointId}`, {
      method: 'DELETE',
    });
    if (!response) {
      throw new Error(`Failed to delete point ${pointId}.`);
    }
    return normalizeTripDraft(response);
  },

  async reorderTripPoints(tripId: string, pointIds: string[]): Promise<TripDraft> {
    const response = await request<RawTripDraft>(`/trips/${tripId}/points/reorder`, {
      method: 'POST',
      body: JSON.stringify({ pointIds }),
    });
    if (!response) {
      throw new Error(`Failed to reorder trip ${tripId}.`);
    }
    return normalizeTripDraft(response);
  },

  async publishTrip(
    tripId: string,
    payload: {
      title?: string;
      summary?: string;
      coverMediaId?: string;
      visibility?: string;
    },
  ): Promise<TripDraft> {
    const response = await request<RawTripDraft>(`/trips/${tripId}/publish`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response) {
      throw new Error(`Failed to publish trip ${tripId}.`);
    }
    return normalizeTripDraft(response);
  },

  async searchPlaces(
    keyword: string,
    options?: {
      cityName?: string;
      latitude?: number;
      longitude?: number;
      cityLimit?: boolean;
      limit?: number;
    },
  ): Promise<PlaceCandidate[]> {
    const params = new URLSearchParams({ keyword });
    if (options?.cityName) {
      params.set('cityName', options.cityName);
    }
    if (typeof options?.latitude === 'number') {
      params.set('latitude', String(options.latitude));
    }
    if (typeof options?.longitude === 'number') {
      params.set('longitude', String(options.longitude));
    }
    if (typeof options?.cityLimit === 'boolean') {
      params.set('cityLimit', String(options.cityLimit));
    }
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }

    const response = await request<RawPlaceCandidate[]>(`/places/search?${params.toString()}`);
    return (response ?? []).map(normalizePlaceCandidate);
  },

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{
    formattedAddress?: string | null;
    provinceName?: string | null;
    cityName?: string | null;
    districtName?: string | null;
    recommendedPlace?: PlaceCandidate | null;
    nearbyPlaces: PlaceCandidate[];
  }> {
    const response = await request<{
      formattedAddress?: string | null;
      provinceName?: string | null;
      cityName?: string | null;
      districtName?: string | null;
      recommendedPlace?: RawPlaceCandidate | null;
      nearbyPlaces?: RawPlaceCandidate[] | null;
    }>(`/places/reverse-geocode?latitude=${latitude}&longitude=${longitude}`);

    return {
      formattedAddress: response?.formattedAddress ?? null,
      provinceName: response?.provinceName ?? null,
      cityName: response?.cityName ?? null,
      districtName: response?.districtName ?? null,
      recommendedPlace: response?.recommendedPlace
        ? normalizePlaceCandidate(response.recommendedPlace)
        : null,
      nearbyPlaces: (response?.nearbyPlaces ?? []).map(normalizePlaceCandidate),
    };
  },

  async upsertPlace(payload: {
    provider?: string;
    providerId?: string;
    name: string;
    shortName?: string;
    formattedAddress?: string;
    provinceName?: string;
    cityName?: string;
    districtName?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<PlaceCandidate> {
    const response = await request<RawPlaceCandidate>('/places', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response) {
      throw new Error('Failed to save place.');
    }
    return normalizePlaceCandidate(response);
  },

  async createMediaAsset(payload: {
    originalName: string;
    mimeType: string;
    bytes: number;
    width?: number;
    height?: number;
    takenAt?: string;
    caption?: string;
    tripId?: string;
    tripPointId?: string;
  }): Promise<MediaAsset> {
    const response = await request<RawMediaAsset>('/media/assets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response) {
      throw new Error('Failed to create media asset.');
    }
    return normalizeMediaAsset(response) as MediaAsset;
  },

  async markMediaReady(mediaAssetId: string, storageKey: string): Promise<MediaAsset> {
    const response = await request<RawMediaAsset>(`/media/assets/${mediaAssetId}/mark-ready`, {
      method: 'POST',
      body: JSON.stringify({ storageKey }),
    });
    if (!response) {
      throw new Error(`Failed to mark media ${mediaAssetId} ready.`);
    }
    return normalizeMediaAsset(response) as MediaAsset;
  },

  async updateCurrentUser(payload: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }): Promise<UserSummary> {
    const response = await request<UserSummary>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (!response) {
      throw new Error('Failed to update current user.');
    }
    return response;
  },

  async getUserProfile(userId: string): Promise<UserSummary> {
    const response = await request<UserSummary>(`/users/${userId}`);
    if (!response) {
      throw new Error(`Failed to load user ${userId}.`);
    }
    return response;
  },

  async getUserPosts(userId: string): Promise<FeedItem[]> {
    const response = await request<RawFeedItem[]>(`/users/${userId}/posts`);
    return (response ?? []).map(normalizeFeedItem);
  },

  async getUserSavedPosts(userId: string): Promise<FeedItem[]> {
    const response = await request<RawFeedItem[]>(`/users/${userId}/saves`);
    return (response ?? []).map(normalizeFeedItem);
  },

  async likePost(postId: string): Promise<{ counts: RouteCounts; viewerState: ViewerInteractionState }> {
    const response = await request<{ counts: RouteCounts; viewerState: ViewerInteractionState }>(
      `/posts/${postId}/like`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
    if (!response) {
      throw new Error('Failed to like post.');
    }
    return response;
  },

  async unlikePost(postId: string): Promise<{ counts: RouteCounts; viewerState: ViewerInteractionState }> {
    const response = await request<{ counts: RouteCounts; viewerState: ViewerInteractionState }>(
      `/posts/${postId}/like`,
      {
        method: 'DELETE',
      },
    );
    if (!response) {
      throw new Error('Failed to unlike post.');
    }
    return response;
  },

  async savePost(postId: string): Promise<{ counts: RouteCounts; viewerState: ViewerInteractionState }> {
    const response = await request<{ counts: RouteCounts; viewerState: ViewerInteractionState }>(
      `/posts/${postId}/save`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
    if (!response) {
      throw new Error('Failed to save post.');
    }
    return response;
  },

  async unsavePost(postId: string): Promise<{ counts: RouteCounts; viewerState: ViewerInteractionState }> {
    const response = await request<{ counts: RouteCounts; viewerState: ViewerInteractionState }>(
      `/posts/${postId}/save`,
      {
        method: 'DELETE',
      },
    );
    if (!response) {
      throw new Error('Failed to unsave post.');
    }
    return response;
  },

  async listComments(postId: string): Promise<CommentItem[]> {
    const response = await request<CommentItem[]>(`/posts/${postId}/comments`);
    return response ?? [];
  },

  async createComment(postId: string, content: string): Promise<CommentItem> {
    const response = await request<CommentItem>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    if (!response) {
      throw new Error('Failed to create comment.');
    }
    return response;
  },
};




