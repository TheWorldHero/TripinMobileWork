export type Visibility = 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
export type TripKind = 'TRAVEL' | 'LIFESTYLE' | 'MIXED';
export type TripStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type PointSource = 'AUTO' | 'MANUAL' | 'HYBRID';
export type CoordinateValue = number | string | null;
export type PointState = 'DRAFT' | 'NEEDS_LOCATION' | 'READY_FOR_LINE';

export interface HealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
}

export interface UserSummary {
  id: string;
  username?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface AuthResponse {
  user: UserSummary;
  sessionUserId: string;
  issuedAt: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
}

export interface MediaAsset {
  id: string;
  originalName: string;
  caption?: string | null;
  takenAt?: string | null;
  storageKey: string;
  bucket: string;
  status: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  exifLatitude?: CoordinateValue;
  exifLongitude?: CoordinateValue;
}

export interface PlaceSummary {
  id: string;
  name: string;
  cityName?: string | null;
  districtName?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
}

export interface PlaceSearchResult {
  id?: string;
  provider: 'AMAP' | 'MANUAL' | 'IMPORTED';
  providerId?: string | null;
  name: string;
  shortName?: string | null;
  formattedAddress?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  countryCode: string;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  source: 'local' | 'amap';
}

export interface PlaceStatusResponse {
  amapConfigured: boolean;
}

export interface ReverseGeocodeResponse {
  amapConfigured: boolean;
  formattedAddress?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  recommendedPlace?: PlaceSearchResult | null;
  nearbyPlaces: PlaceSearchResult[];
}

export interface PointRecord {
  id: string;
  title?: string | null;
  note?: string | null;
  capturedAt?: string | null;
  checkInAt?: string | null;
  placeId?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  mediaCount: number;
  mediaAssetIds: string[];
  state: PointState;
}

export interface DraftPoint {
  id: string;
  mediaAssetId: string;
  mediaAssetIds: string[];
  sourceType: 'MEDIA' | 'BACKFILL';
  state: PointState;
  status: PointState;
  title: string;
  note: string;
  createdAt: string;
  capturedAt?: string | null;
  checkInAt?: string | null;
  placeId?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  mediaCount: number;
}

export interface LinePoint extends PointRecord {
  sequence: number;
}

export interface RouteSegment {
  id: string;
  fromPointId?: string | null;
  toPointId?: string | null;
  provider?: string | null;
  strategy?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  polyline: string;
}

export interface LineDetail {
  id: string;
  title: string;
  summary?: string | null;
  visibility?: Visibility | string | null;
  status?: string | null;
  pointCount: number;
  routeSegments: RouteSegment[];
  points: LinePoint[];
}

export interface TripPoint {
  id: string;
  title?: string | null;
  note?: string | null;
  customPlaceName?: string | null;
  startedAt: string;
  endedAt?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  sequence: number;
  sourceType: PointSource;
  mediaCount: number;
  place?: PlaceSummary | null;
  mediaAssets: MediaAsset[];
}

export interface RoutePreviewPoint {
  pointId: string;
  sequence: number;
  latitude: number;
  longitude: number;
}

export interface Trip {
  id: string;
  title: string;
  summary?: string | null;
  kind: TripKind;
  status: TripStatus;
  visibility: Visibility;
  cityName?: string | null;
  provinceName?: string | null;
  coverMediaId?: string | null;
  pointCount: number;
  mediaCount: number;
  startedAt?: string | null;
  endedAt?: string | null;
  routePreview?: RoutePreviewPoint[] | null;
  points: TripPoint[];
  coverMedia?: MediaAsset | null;
  post?: { id: string } | null;
}

export interface FeedItem {
  id: string;
  title: string;
  summary?: string | null;
  cityName?: string | null;
  pointCount: number;
  mediaCount: number;
  publishedAt: string;
  author: UserSummary;
  coverMedia?: MediaAsset | null;
  viewerState?: {
    liked?: boolean | null;
    saved?: boolean | null;
  } | null;
  trip: {
    id: string;
    title: string;
    kind: TripKind;
    startedAt?: string | null;
    endedAt?: string | null;
    routePreview?: RoutePreviewPoint[] | null;
  };
  _count: {
    likes: number;
    saves: number;
    comments: number;
  };
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor?: string | null;
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: UserSummary;
}

export interface PostDetail {
  id: string;
  title: string;
  summary?: string | null;
  cityName?: string | null;
  publishedAt: string;
  pointCount: number;
  mediaCount: number;
  author: UserSummary;
  coverMedia?: MediaAsset | null;
  viewerState?: {
    liked?: boolean | null;
    saved?: boolean | null;
  } | null;
  trip: Trip;
  comments: CommentItem[];
  counts: {
    likes: number;
    saves: number;
    comments: number;
  };
}

export interface PaginatedTrips {
  items: Trip[];
  nextCursor?: string | null;
}

export interface SeedResponse {
  ok: boolean;
  users: number;
  posts: number;
  tripId: string;
  postId: string;
}

export interface CreateTripDto {
  title: string;
  summary?: string;
  cityName?: string;
  provinceName?: string;
  kind?: TripKind;
  visibility?: Visibility;
}

export interface CreateMediaAssetDto {
  originalName: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
  caption?: string;
  takenAt?: string;
  exifLatitude?: number;
  exifLongitude?: number;
  tripId?: string;
  tripPointId?: string;
}

export interface CreateTripPointDto {
  startedAt: string;
  endedAt?: string;
  placeId?: string;
  customPlaceName?: string;
  title?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  sourceType?: PointSource;
  sequence?: number;
  mediaAssetIds?: string[];
}

export interface CreatePlaceDto {
  provider?: 'AMAP' | 'MANUAL' | 'IMPORTED';
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
}
