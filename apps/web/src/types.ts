export interface UserSummary {
  id: string;
  username?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface ViewerInteractionState {
  liked: boolean;
  saved: boolean;
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt?: string | null;
  user: UserSummary;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface FeedRoutePreviewPoint extends RouteCoordinate {
  pointId?: string;
  sequence?: number;
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
  viewerState?: ViewerInteractionState | null;
  /** 每个点位及其用户照片，用于首页 feed 内嵌画廊与地图联动（web 层按帖子补全）。 */
  points?: RoutePoint[];
  trip: {
    id: string;
    title: string;
    kind?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    routePreview?: FeedRoutePreviewPoint[] | null;
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
  mode?: string | null;
}

export interface RoutePoint {
  id: string;
  title?: string | null;
  note?: string | null;
  sequence: number;
  latitude?: number | null;
  longitude?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  capturedAt?: string | null;
  checkInAt?: string | null;
  state?: string | null;
  placeName?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  mediaCount?: number | null;
  mediaAssets?: MediaAsset[];
}

export interface RouteSegment {
  id: string;
  polyline: string;
  fromPointId?: string | null;
  toPointId?: string | null;
  provider?: string | null;
  strategy?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
}

export interface RouteCounts {
  likes: number;
  saves: number;
  comments: number;
}

export interface MediaAsset {
  id: string;
  originalName?: string | null;
  caption?: string | null;
  takenAt?: string | null;
  storageKey?: string | null;
  bucket?: string | null;
  status?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  exifLatitude?: number | null;
  exifLongitude?: number | null;
}

export interface PlaceCandidate {
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
  latitude?: number | null;
  longitude?: number | null;
  source?: string | null;
}

export interface RouteDetail {
  id: string;
  source: 'line' | 'post';
  title: string;
  summary?: string | null;
  cityName?: string | null;
  pointCount: number;
  mediaCount: number;
  publishedAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  visibility?: string | null;
  status?: string | null;
  author?: UserSummary | null;
  counts?: RouteCounts | null;
  viewerState?: ViewerInteractionState | null;
  coverMedia?: MediaAsset | null;
  routePreview: RouteCoordinate[];
  routeSegments: RouteSegment[];
  points: RoutePoint[];
  comments?: CommentItem[];
}

export interface TripDraftPoint {
  id: string;
  title?: string | null;
  note?: string | null;
  customPlaceName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sequence: number;
  sourceType?: string | null;
  mediaCount?: number | null;
  mediaAssets?: MediaAsset[];
  place?: {
    id: string;
    name: string;
    cityName?: string | null;
    districtName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

export interface TripDraft {
  id: string;
  title: string;
  summary?: string | null;
  kind?: string | null;
  status?: string | null;
  visibility?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
  coverMediaId?: string | null;
  coverMedia?: MediaAsset | null;
  pointCount: number;
  mediaCount: number;
  startedAt?: string | null;
  endedAt?: string | null;
  routePreview: RouteCoordinate[];
  points: TripDraftPoint[];
  post?: {
    id: string;
  } | null;
}

export type NotificationType = 'like' | 'comment' | 'follow';

export interface NotificationItem {
  id: string;
  type: NotificationType | string;
  isRead: boolean;
  createdAt?: string | null;
  actor: UserSummary;
  post?: { id: string; title?: string | null } | null;
  commentId?: string | null;
}

export interface NotificationList {
  items: NotificationItem[];
  unreadCount: number;
}

export interface UserPreferences {
  userId: string;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyFollows: boolean;
  feedScope: 'all' | 'following' | string;
  language: string;
}

export interface FollowStatus {
  userId: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export interface SearchUserResult extends UserSummary {
  followersCount?: number | null;
  postsCount?: number | null;
}

export interface SearchPostResult {
  id: string;
  title: string;
  summary?: string | null;
  cityName?: string | null;
  pointCount?: number | null;
  mediaCount?: number | null;
  publishedAt?: string | null;
  author?: UserSummary | null;
  coverMedia?: MediaAsset | null;
}

export interface SearchResults {
  query: string;
  posts: SearchPostResult[];
  users: SearchUserResult[];
  places: PlaceCandidate[];
}
