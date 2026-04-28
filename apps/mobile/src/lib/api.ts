import type {
  CreatePlaceDto,
  CreateMediaAssetDto,
  CreateTripDto,
  CreateTripPointDto,
  FeedResponse,
  HealthResponse,
  LineDetail,
  LinePoint,
  PaginatedTrips,
  PointRecord,
  PlaceSearchResult,
  PlaceStatusResponse,
  PostDetail,
  ReverseGeocodeResponse,
  RoutePreviewPoint,
  RouteSegment,
  SeedResponse,
  Trip,
  UserSummary,
  Visibility,
} from '../types';

interface ApiClientOptions {
  baseUrl: string;
  userId: string;
}

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

function normalizePointRecord(raw: {
  id: string;
  title?: string | null;
  note?: string | null;
  capturedAt?: string | null;
  checkInAt?: string | null;
  placeId?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  mediaCount?: number | null;
  mediaAssetIds?: string[] | null;
  state?: string | null;
}): PointRecord {
  return {
    id: raw.id,
    title: raw.title ?? null,
    note: raw.note ?? null,
    capturedAt: raw.capturedAt ?? null,
    checkInAt: raw.checkInAt ?? null,
    placeId: raw.placeId ?? null,
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    mediaCount: raw.mediaCount ?? 0,
    mediaAssetIds: raw.mediaAssetIds ?? [],
    state: (raw.state ?? 'DRAFT') as PointRecord['state'],
  };
}

function normalizeLinePoint(
  raw: {
    id: string;
    title?: string | null;
    note?: string | null;
    capturedAt?: string | null;
    checkInAt?: string | null;
    placeId?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    mediaCount?: number | null;
    mediaAssetIds?: string[] | null;
    state?: string | null;
    sequence?: number | null;
  },
  index: number,
): LinePoint {
  return {
    ...normalizePointRecord(raw),
    sequence: raw.sequence ?? index,
  };
}

function normalizeRouteSegment(raw: {
  id: string;
  fromPointId?: string | null;
  toPointId?: string | null;
  provider?: string | null;
  strategy?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  polyline?: string | null;
}): RouteSegment {
  return {
    id: raw.id,
    fromPointId: raw.fromPointId ?? null,
    toPointId: raw.toPointId ?? null,
    provider: raw.provider ?? null,
    strategy: raw.strategy ?? null,
    distanceMeters: raw.distanceMeters ?? null,
    durationSeconds: raw.durationSeconds ?? null,
    polyline: raw.polyline ?? '',
  };
}

function normalizeLineDetail(raw: {
  id: string;
  title: string;
  summary?: string | null;
  visibility?: string | null;
  status?: string | null;
  pointCount?: number | null;
  routeSegments?: Array<{
    id: string;
    fromPointId?: string | null;
    toPointId?: string | null;
    provider?: string | null;
    strategy?: string | null;
    distanceMeters?: number | null;
    durationSeconds?: number | null;
    polyline?: string | null;
  }> | null;
  points?: Array<{
    id: string;
    title?: string | null;
    note?: string | null;
    capturedAt?: string | null;
    checkInAt?: string | null;
    placeId?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    mediaCount?: number | null;
    mediaAssetIds?: string[] | null;
    state?: string | null;
    sequence?: number | null;
  }> | null;
}): LineDetail {
  const points = (raw.points ?? []).map((point, index) => normalizeLinePoint(point, index));
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary ?? null,
    visibility: raw.visibility ?? null,
    status: raw.status ?? null,
    pointCount: raw.pointCount ?? points.length,
    routeSegments: (raw.routeSegments ?? []).map(normalizeRouteSegment),
    points,
  };
}

export function createApiClient(options: ApiClientOptions) {
  const normalizedBaseUrl = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': options.userId,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  }

  return {
    getHealth() {
      return request<HealthResponse>('/health');
    },
    getCurrentUser() {
      return request<UserSummary>('/users/me');
    },
    updateCurrentUser(payload: {
      username?: string;
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
    }) {
      return request<UserSummary>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    getUserPosts(userId: string) {
      return request<FeedResponse['items']>(`/users/${userId}/posts`);
    },
    getUserSavedPosts(userId: string) {
      return request<FeedResponse['items']>(`/users/${userId}/saves`);
    },
    getFeed() {
      return request<FeedResponse>('/feed');
    },
    getPost(postId: string) {
      return request<PostDetail>(`/posts/${postId}`);
    },
    likePost(postId: string) {
      return request<{
        counts: PostDetail['counts'];
        viewerState: NonNullable<PostDetail['viewerState']>;
      }>(`/posts/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    unlikePost(postId: string) {
      return request<{
        counts: PostDetail['counts'];
        viewerState: NonNullable<PostDetail['viewerState']>;
      }>(`/posts/${postId}/like`, {
        method: 'DELETE',
      });
    },
    savePost(postId: string) {
      return request<{
        counts: PostDetail['counts'];
        viewerState: NonNullable<PostDetail['viewerState']>;
      }>(`/posts/${postId}/save`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    unsavePost(postId: string) {
      return request<{
        counts: PostDetail['counts'];
        viewerState: NonNullable<PostDetail['viewerState']>;
      }>(`/posts/${postId}/save`, {
        method: 'DELETE',
      });
    },
    createComment(postId: string, content: string) {
      return request<PostDetail['comments'][number]>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    getTrips() {
      return request<PaginatedTrips>('/trips');
    },
    getPlaceStatus() {
      return request<PlaceStatusResponse>('/places/status');
    },
    searchPlaces(query: {
      keyword: string;
      cityName?: string;
      latitude?: number;
      longitude?: number;
      cityLimit?: boolean;
      limit?: number;
    }) {
      const params = new URLSearchParams();
      params.set('keyword', query.keyword);
      if (query.cityName) {
        params.set('cityName', query.cityName);
      }
      if (typeof query.latitude === 'number') {
        params.set('latitude', String(query.latitude));
      }
      if (typeof query.longitude === 'number') {
        params.set('longitude', String(query.longitude));
      }
      if (typeof query.cityLimit === 'boolean') {
        params.set('cityLimit', String(query.cityLimit));
      }
      if (typeof query.limit === 'number') {
        params.set('limit', String(query.limit));
      }

      return request<PlaceSearchResult[]>(`/places/search?${params.toString()}`);
    },
    reverseGeocode(query: {
      latitude: number;
      longitude: number;
      radius?: number;
    }) {
      const params = new URLSearchParams({
        latitude: String(query.latitude),
        longitude: String(query.longitude),
      });
      if (typeof query.radius === 'number') {
        params.set('radius', String(query.radius));
      }

      return request<ReverseGeocodeResponse>(`/places/reverse-geocode?${params.toString()}`);
    },
    upsertPlace(dto: CreatePlaceDto) {
      return request<{ id: string } & Record<string, unknown>>('/places', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    getTrip(tripId: string) {
      return request<Trip>(`/trips/${tripId}`);
    },
    createPoint(dto: {
      mediaAssetIds: string[];
      title?: string;
      note?: string;
      capturedAt?: string;
    }) {
      return request<{
        id: string;
        title?: string | null;
        note?: string | null;
        capturedAt?: string | null;
        checkInAt?: string | null;
        placeId?: string | null;
        latitude?: number | string | null;
        longitude?: number | string | null;
        mediaCount?: number | null;
        mediaAssetIds?: string[] | null;
        state?: string | null;
      }>('/points', {
        method: 'POST',
        body: JSON.stringify(dto),
      }).then(normalizePointRecord);
    },
    getInbox() {
      return request<{
        items?: Array<{
          id: string;
          title?: string | null;
          note?: string | null;
          capturedAt?: string | null;
          checkInAt?: string | null;
          placeId?: string | null;
          latitude?: number | string | null;
          longitude?: number | string | null;
          mediaCount?: number | null;
          mediaAssetIds?: string[] | null;
          state?: string | null;
        }> | null;
        nextCursor?: string | null;
      }>('/points/inbox').then((response) => ({
        items: (response.items ?? []).map(normalizePointRecord),
        nextCursor: response.nextCursor ?? null,
      }));
    },
    confirmPointLocation(
      pointId: string,
      dto: { placeId?: string; latitude?: number; longitude?: number; checkInAt?: string },
    ) {
      return request<{
        id: string;
        title?: string | null;
        note?: string | null;
        capturedAt?: string | null;
        checkInAt?: string | null;
        placeId?: string | null;
        latitude?: number | string | null;
        longitude?: number | string | null;
        mediaCount?: number | null;
        mediaAssetIds?: string[] | null;
        state?: string | null;
      }>(`/points/${pointId}/location`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }).then(normalizePointRecord);
    },
    createLine(dto: { title: string; summary?: string; visibility?: Visibility }) {
      return request<{
        id: string;
        title: string;
        summary?: string | null;
        visibility?: string | null;
        status?: string | null;
        pointCount?: number | null;
        routeSegments?: LineDetail['routeSegments'] | null;
        points?: Array<{
          id: string;
          title?: string | null;
          note?: string | null;
          capturedAt?: string | null;
          checkInAt?: string | null;
          placeId?: string | null;
          latitude?: number | string | null;
          longitude?: number | string | null;
          mediaCount?: number | null;
          mediaAssetIds?: string[] | null;
          state?: string | null;
          sequence?: number | null;
        }> | null;
      }>('/lines', {
        method: 'POST',
        body: JSON.stringify(dto),
      }).then(normalizeLineDetail);
    },
    getLine(lineId: string) {
      return request<{
        id: string;
        title: string;
        summary?: string | null;
        visibility?: string | null;
        status?: string | null;
        pointCount?: number | null;
        routeSegments?: LineDetail['routeSegments'] | null;
        points?: Array<{
          id: string;
          title?: string | null;
          note?: string | null;
          capturedAt?: string | null;
          checkInAt?: string | null;
          placeId?: string | null;
          latitude?: number | string | null;
          longitude?: number | string | null;
          mediaCount?: number | null;
          mediaAssetIds?: string[] | null;
          state?: string | null;
          sequence?: number | null;
        }> | null;
      }>(`/lines/${lineId}`).then(normalizeLineDetail);
    },
    attachPoints(lineId: string, pointIds: string[]) {
      return request<{
        id: string;
        title: string;
        summary?: string | null;
        visibility?: string | null;
        status?: string | null;
        pointCount?: number | null;
        routeSegments?: LineDetail['routeSegments'] | null;
        points?: Array<{
          id: string;
          title?: string | null;
          note?: string | null;
          capturedAt?: string | null;
          checkInAt?: string | null;
          placeId?: string | null;
          latitude?: number | string | null;
          longitude?: number | string | null;
          mediaCount?: number | null;
          mediaAssetIds?: string[] | null;
          state?: string | null;
          sequence?: number | null;
        }> | null;
      }>(`/lines/${lineId}/attach-points`, {
        method: 'POST',
        body: JSON.stringify({ pointIds }),
      }).then(normalizeLineDetail);
    },
    reorderLinePoints(lineId: string, pointIds: string[]) {
      return request<{
        id: string;
        title: string;
        summary?: string | null;
        visibility?: string | null;
        status?: string | null;
        pointCount?: number | null;
        routeSegments?: LineDetail['routeSegments'] | null;
        points?: Array<{
          id: string;
          title?: string | null;
          note?: string | null;
          capturedAt?: string | null;
          checkInAt?: string | null;
          placeId?: string | null;
          latitude?: number | string | null;
          longitude?: number | string | null;
          mediaCount?: number | null;
          mediaAssetIds?: string[] | null;
          state?: string | null;
          sequence?: number | null;
        }> | null;
      }>(`/lines/${lineId}/reorder-points`, {
        method: 'POST',
        body: JSON.stringify({ pointIds }),
      }).then(normalizeLineDetail);
    },
    removeLinePoint(lineId: string, pointId: string) {
      return request<{
        id: string;
        title: string;
        summary?: string | null;
        visibility?: string | null;
        status?: string | null;
        pointCount?: number | null;
        routeSegments?: LineDetail['routeSegments'] | null;
        points?: Array<{
          id: string;
          title?: string | null;
          note?: string | null;
          capturedAt?: string | null;
          checkInAt?: string | null;
          placeId?: string | null;
          latitude?: number | string | null;
          longitude?: number | string | null;
          mediaCount?: number | null;
          mediaAssetIds?: string[] | null;
          state?: string | null;
          sequence?: number | null;
        }> | null;
      }>(`/lines/${lineId}/points/${pointId}`, {
        method: 'DELETE',
      }).then(normalizeLineDetail);
    },
    refreshLineRoutes(lineId: string) {
      return request<{
        lineId: string;
        segmentsUpdated: number;
        totalDistanceMeters: number;
        totalDurationSeconds: number;
      }>(`/routes/lines/${lineId}/refresh`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    seedDemo(reset = true) {
      return request<SeedResponse>('/dev/seed', {
        method: 'POST',
        body: JSON.stringify({ reset }),
      });
    },
    createTrip(dto: CreateTripDto) {
      return request<Trip>('/trips', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    updateTrip(tripId: string, dto: CreateTripDto) {
      return request<Trip>(`/trips/${tripId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    createMediaAsset(dto: CreateMediaAssetDto) {
      return request<{ id: string } & Record<string, unknown>>('/media/assets', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    markMediaReady(mediaAssetId: string, storageKey?: string) {
      return request(`/media/assets/${mediaAssetId}/mark-ready`, {
        method: 'POST',
        body: JSON.stringify({ storageKey }),
      });
    },
    autoAssembleTrip(tripId: string, mediaAssetIds: string[]) {
      return request<Trip>(`/trips/${tripId}/auto-assemble`, {
        method: 'POST',
        body: JSON.stringify({ mediaAssetIds }),
      });
    },
    createTripPoint(tripId: string, dto: CreateTripPointDto) {
      return request<Trip>(`/trips/${tripId}/points`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    updateTripPoint(tripId: string, pointId: string, dto: CreateTripPointDto) {
      return request<Trip>(`/trips/${tripId}/points/${pointId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    deleteTripPoint(tripId: string, pointId: string) {
      return request<Trip>(`/trips/${tripId}/points/${pointId}`, {
        method: 'DELETE',
      });
    },
    publishTrip(tripId: string, payload: { title?: string; summary?: string; visibility?: Visibility }) {
      return request<Trip>(`/trips/${tripId}/publish`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getStaticMapUrl(options: {
      route?: RoutePreviewPoint[] | null;
      focus?: { latitude: number; longitude: number } | null;
      width?: number;
      height?: number;
      traffic?: boolean;
    }) {
      const params = new URLSearchParams();
      if (options.route?.length) {
        params.set(
          'route',
          options.route
            .map((point) => `${point.longitude},${point.latitude}`)
            .join('|'),
        );
      }
      if (options.focus) {
        params.set('focus', `${options.focus.longitude},${options.focus.latitude}`);
      }
      if (typeof options.width === 'number') {
        params.set('width', String(options.width));
      }
      if (typeof options.height === 'number') {
        params.set('height', String(options.height));
      }
      if (typeof options.traffic === 'boolean') {
        params.set('traffic', String(options.traffic));
      }

      return `${normalizedBaseUrl}/places/static-map?${params.toString()}`;
    },
  };
}
