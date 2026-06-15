import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  LogBox,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RoutePreview } from '../components/RoutePreview';
import { createApiClient } from '../lib/api';
import { TripinMapView } from '../native/TripinMapView';
import type { CommentItem, FeedItem, MediaAsset, PostDetail, Trip, TripPoint, UserSummary } from '../types';

const API_BASE_URL = 'http://localhost:3001/api/v1';
const WEB_BASE_URL = 'http://localhost:3000';
const USER_ID = 'demo-user';

type TabKey = 'record' | 'home' | 'studio' | 'me';
type MePanel =
  | 'overview'
  | 'profile'
  | 'routes'
  | 'posts'
  | 'favorites'
  | 'security'
  | 'privacy'
  | 'help'
  | 'settings';

type LocalImage = {
  uri: string;
  name: string;
  mimeType: string;
  bytes: number;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type DraftForm = {
  title: string;
  summary: string;
  cityName: string;
  pointLocation: string;
  pointTitle: string;
  pointNote: string;
  startedAt: string;
};

type PointEditForm = {
  title: string;
  location: string;
  startedAt: string;
  note: string;
};

const initialForm: DraftForm = {
  title: '我的路线',
  summary: '',
  cityName: '',
  pointLocation: '',
  pointTitle: '',
  pointNote: '',
  startedAt: new Date().toISOString().slice(0, 16),
};

const MOCK_FEED_ITEMS: FeedItem[] = [
  {
    id: 'mock-post-suzhou-morning',
    title: '苏州河边的蓝调散步',
    summary: '从咖啡店走到桥下，三段停留刚好连成一条适合傍晚复走的路线。',
    cityName: '上海',
    pointCount: 4,
    mediaCount: 6,
    publishedAt: '2026-04-28T08:42:00.000Z',
    author: {
      id: 'mock-user-luna',
      username: 'luna.routes',
      displayName: 'Luna Chen',
      bio: 'city walker',
    },
    viewerState: { liked: true, saved: false },
    trip: {
      id: 'mock-trip-suzhou-morning',
      title: '苏州河边的蓝调散步',
      kind: 'LIFESTYLE',
      startedAt: '2026-04-28T08:10:00.000Z',
      endedAt: '2026-04-28T10:05:00.000Z',
      routePreview: [
        { pointId: 'mock-sz-1', sequence: 1, latitude: 31.2427, longitude: 121.4381 },
        { pointId: 'mock-sz-2', sequence: 2, latitude: 31.2442, longitude: 121.4478 },
        { pointId: 'mock-sz-3', sequence: 3, latitude: 31.2409, longitude: 121.4561 },
        { pointId: 'mock-sz-4', sequence: 4, latitude: 31.2368, longitude: 121.4635 },
      ],
    },
    _count: { likes: 328, saves: 42, comments: 2 },
  },
  {
    id: 'mock-post-xihu-rain',
    title: '雨后西湖，绕开人群的三站',
    summary: '不是景点清单，是一条从安静巷口到湖边长椅的路线。',
    cityName: '杭州',
    pointCount: 3,
    mediaCount: 4,
    publishedAt: '2026-04-27T15:18:00.000Z',
    author: {
      id: 'mock-user-neo',
      username: 'neo.walks',
      displayName: 'Neo Zhang',
      bio: 'weekend routes',
    },
    viewerState: { liked: false, saved: true },
    trip: {
      id: 'mock-trip-xihu-rain',
      title: '雨后西湖，绕开人群的三站',
      kind: 'TRAVEL',
      startedAt: '2026-04-27T14:20:00.000Z',
      endedAt: '2026-04-27T17:00:00.000Z',
      routePreview: [
        { pointId: 'mock-xh-1', sequence: 1, latitude: 30.2475, longitude: 120.1468 },
        { pointId: 'mock-xh-2', sequence: 2, latitude: 30.2526, longitude: 120.1432 },
        { pointId: 'mock-xh-3', sequence: 3, latitude: 30.2584, longitude: 120.1497 },
      ],
    },
    _count: { likes: 516, saves: 91, comments: 1 },
  },
  {
    id: 'mock-post-chengdu-night',
    title: '成都夜骑：从小酒馆到河边风',
    summary: '四个点位串起夜里的亮色，适合收藏给下一次短途骑行。',
    cityName: '成都',
    pointCount: 5,
    mediaCount: 8,
    publishedAt: '2026-04-26T21:36:00.000Z',
    author: {
      id: 'mock-user-mika',
      username: 'mika.moves',
      displayName: 'Mika Li',
      bio: 'night ride notes',
    },
    viewerState: { liked: false, saved: false },
    trip: {
      id: 'mock-trip-chengdu-night',
      title: '成都夜骑：从小酒馆到河边风',
      kind: 'MIXED',
      startedAt: '2026-04-26T19:30:00.000Z',
      endedAt: '2026-04-26T22:15:00.000Z',
      routePreview: [
        { pointId: 'mock-cd-1', sequence: 1, latitude: 30.6539, longitude: 104.0605 },
        { pointId: 'mock-cd-2', sequence: 2, latitude: 30.6572, longitude: 104.0712 },
        { pointId: 'mock-cd-3', sequence: 3, latitude: 30.6636, longitude: 104.0785 },
        { pointId: 'mock-cd-4', sequence: 4, latitude: 30.6681, longitude: 104.0862 },
        { pointId: 'mock-cd-5', sequence: 5, latitude: 30.6724, longitude: 104.0941 },
      ],
    },
    _count: { likes: 782, saves: 134, comments: 2 },
  },
];

const MOCK_COMMENTS_BY_POST_ID: Record<string, CommentItem[]> = {
  'mock-post-suzhou-morning': [
    {
      id: 'mock-comment-suzhou-1',
      content: '这个路线图很清楚，第二个点适合停下来拍照。',
      createdAt: '2026-04-28T09:02:00.000Z',
      user: { id: 'mock-user-iris', username: 'iris.walks', displayName: 'Iris' },
    },
    {
      id: 'mock-comment-suzhou-2',
      content: '收藏了，傍晚去复走。',
      createdAt: '2026-04-28T09:20:00.000Z',
      user: { id: 'mock-user-kai', username: 'kai.city', displayName: 'Kai' },
    },
  ],
  'mock-post-xihu-rain': [
    {
      id: 'mock-comment-xihu-1',
      content: '雨后这条线比主路舒服很多。',
      createdAt: '2026-04-27T16:01:00.000Z',
      user: { id: 'mock-user-yu', username: 'yu.notes', displayName: 'Yu' },
    },
  ],
  'mock-post-chengdu-night': [
    {
      id: 'mock-comment-chengdu-1',
      content: '夜骑路线需要这个点位切图功能。',
      createdAt: '2026-04-26T22:06:00.000Z',
      user: { id: 'mock-user-river', username: 'river.route', displayName: 'River' },
    },
    {
      id: 'mock-comment-chengdu-2',
      content: '终点放河边很合理。',
      createdAt: '2026-04-26T22:18:00.000Z',
      user: { id: 'mock-user-min', username: 'min.trips', displayName: 'Min' },
    },
  ],
};

const MOCK_POINT_TITLES: Record<string, string> = {
  'mock-sz-1': '河边咖啡店',
  'mock-sz-2': '苏州河桥下',
  'mock-sz-3': '安静街角',
  'mock-sz-4': '傍晚终点',
  'mock-xh-1': '巷口出发',
  'mock-xh-2': '湖边长椅',
  'mock-xh-3': '雨后终点',
  'mock-cd-1': '小酒馆',
  'mock-cd-2': '夜市路口',
  'mock-cd-3': '桥边停靠',
  'mock-cd-4': '河岸骑行',
  'mock-cd-5': '终点风口',
};

const MOCK_POINT_IMAGE_URLS: Record<string, string> = {
  'mock-sz-1': 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  'mock-sz-2': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'mock-sz-3': 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  'mock-sz-4': 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80',
  'mock-xh-1': 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80',
  'mock-xh-2': 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  'mock-xh-3': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'mock-cd-1': 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
  'mock-cd-2': 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80',
  'mock-cd-3': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'mock-cd-4': 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80',
  'mock-cd-5': 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
};

const initialPointEditForm: PointEditForm = {
  title: '',
  location: '',
  startedAt: new Date().toISOString().slice(0, 16),
  note: '',
};

type TripImageEntry = {
  uri: string;
  pointId: string;
  pointIndex: number;
};

const FALLBACK_COORDINATE = {
  latitude: 30.5928,
  longitude: 114.3055,
};

function formatDate(value?: string | null) {
  if (!value) return '未设置时间';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function pointName(point: TripPoint, index: number) {
  return point.title || point.place?.name || point.customPlaceName || `点位 ${index + 1}`;
}

function isTemporaryPoint(point: TripPoint) {
  return point.sourceType === 'AUTO' || point.title?.includes('临时点位') || point.note?.includes('临时点位');
}

function numericCoordinate(value?: number | string | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasUsableCoordinate(point: TripPoint) {
  return numericCoordinate(point.latitude) !== null && numericCoordinate(point.longitude) !== null;
}

function pointTimeMs(point: TripPoint) {
  const time = new Date(point.startedAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function toLocalInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function defaultPublishWindow(points: TripPoint[]) {
  const times = points
    .filter(hasUsableCoordinate)
    .map(pointTimeMs)
    .filter((time) => time > 0)
    .sort((left, right) => left - right);

  return {
    start: times[0] ? toLocalInputValue(new Date(times[0]).toISOString()) : '',
    end: times.length ? toLocalInputValue(new Date(times[times.length - 1]).toISOString()) : '',
  };
}

function pointsInTimeWindow(points: TripPoint[], start: string, end: string, excludedIds: string[]) {
  const parsedStart = start ? new Date(start).getTime() : Number.NaN;
  const parsedEnd = end ? new Date(end).getTime() : Number.NaN;
  const startTime = Number.isFinite(parsedStart) ? parsedStart : Number.NEGATIVE_INFINITY;
  const endTime = Number.isFinite(parsedEnd) ? parsedEnd + 59999 : Number.POSITIVE_INFINITY;
  const excluded = new Set(excludedIds);

  return points
    .filter(hasUsableCoordinate)
    .filter((point) => {
      const time = pointTimeMs(point);
      return time >= startTime && time <= endTime && !excluded.has(point.id);
    })
    .sort((left, right) => pointTimeMs(left) - pointTimeMs(right) || left.sequence - right.sequence);
}

function coordinateFromText(value: string): Coordinate | null {
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const first = Number(matches[0]);
  const second = Number(matches[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { latitude: first, longitude: second };
  }
  if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
    return { latitude: second, longitude: first };
  }
  return null;
}

function mediaUri(media?: MediaAsset | null) {
  if (!media?.storageKey) return null;
  if (media.storageKey.startsWith('http') || media.storageKey.startsWith('file:')) {
    return media.storageKey;
  }
  if (media.storageKey.startsWith('/')) {
    return `${WEB_BASE_URL}${media.storageKey}`;
  }
  return `${WEB_BASE_URL}/${media.storageKey}`;
}

function isMockPostId(postId: string) {
  return postId.startsWith('mock-post-');
}

function mockMediaAsset(pointId: string, index: number, title: string, latitude: number, longitude: number): MediaAsset {
  return {
    id: `mock-media-${pointId}`,
    originalName: `${pointId}.jpg`,
    caption: title,
    takenAt: new Date(Date.UTC(2026, 3, 26 + index, 8, index * 7)).toISOString(),
    storageKey: MOCK_POINT_IMAGE_URLS[pointId] ?? MOCK_POINT_IMAGE_URLS['mock-sz-1'],
    bucket: 'mock-route-media',
    status: 'READY',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 1600,
    exifLatitude: latitude,
    exifLongitude: longitude,
  };
}

function createMockPostDetail(post: FeedItem, comments: CommentItem[]): PostDetail {
  const routePreview = post.trip.routePreview ?? [];
  const points: TripPoint[] = routePreview.map((point, index) => {
    const title = MOCK_POINT_TITLES[point.pointId] ?? `${post.cityName ?? '路线'}点位 ${index + 1}`;
    return {
      id: point.pointId,
      title,
      note: index === 0 ? '从这里开始记录路线。' : index === routePreview.length - 1 ? '路线终点。' : '中途停留点。',
      customPlaceName: title,
      startedAt: new Date(Date.UTC(2026, 3, 26 + index, 8, index * 7)).toISOString(),
      latitude: point.latitude,
      longitude: point.longitude,
      sequence: point.sequence,
      sourceType: 'MANUAL',
      mediaCount: 1,
      place: {
        id: `mock-place-${point.pointId}`,
        name: title,
        cityName: post.cityName,
        latitude: point.latitude,
        longitude: point.longitude,
      },
      mediaAssets: [mockMediaAsset(point.pointId, index, title, point.latitude, point.longitude)],
    };
  });
  const coverMedia = points[0]?.mediaAssets[0] ?? null;

  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    cityName: post.cityName,
    publishedAt: post.publishedAt,
    pointCount: post.pointCount,
    mediaCount: post.mediaCount,
    author: post.author,
    coverMedia,
    viewerState: post.viewerState,
    trip: {
      id: post.trip.id,
      title: post.trip.title,
      summary: post.summary,
      kind: post.trip.kind,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      cityName: post.cityName,
      provinceName: post.cityName,
      coverMediaId: coverMedia?.id,
      pointCount: post.pointCount,
      mediaCount: post.mediaCount,
      startedAt: post.trip.startedAt,
      endedAt: post.trip.endedAt,
      routePreview,
      points,
      coverMedia,
      post: { id: post.id },
    },
    comments,
    counts: {
      likes: post._count.likes,
      saves: post._count.saves,
      comments: comments.length,
    },
  };
}

function collectTripImageEntries(trip?: Trip | null) {
  if (!trip) return [];

  const seen = new Set<string>();
  const entries: TripImageEntry[] = [];

  trip.points.forEach((point, pointIndex) => {
    (point.mediaAssets ?? []).forEach((media) => {
      const uri = mediaUri(media);
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        entries.push({ uri, pointId: point.id, pointIndex });
      }
    });
  });

  return entries;
}

function collectTripImages(trip?: Trip | null) {
  if (!trip) return [];

  const seen = new Set<string>();
  const images: string[] = [];
  const candidates = [
    trip.coverMedia,
    ...trip.points.flatMap((point) => point.mediaAssets ?? []),
  ];

  for (const media of candidates) {
    const uri = mediaUri(media);
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      images.push(uri);
    }
  }

  return images;
}

async function pickImages() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('需要允许相册权限后才能上传图片。');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.86,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset, index): LocalImage => {
    const name = asset.fileName || `mobile-image-${Date.now()}-${index}.jpg`;
    return {
      uri: asset.uri,
      name,
      mimeType: asset.mimeType || 'image/jpeg',
      bytes: asset.fileSize || 1,
    };
  });
}

async function getCurrentCoordinate() {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

async function uploadImageToWeb(image: LocalImage) {
  const formData = new FormData();
  formData.append('file', {
    uri: image.uri,
    name: image.name,
    type: image.mimeType,
  } as unknown as Blob);

  const response = await fetch(`${WEB_BASE_URL}/api/uploads`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error((await response.text()) || '图片上传失败。');
  }

  return (await response.json()) as {
    storageKey: string;
    originalName: string;
    mimeType: string;
    bytes: number;
  };
}

export default function AppRoot() {
  const api = useMemo(() => createApiClient({ baseUrl: API_BASE_URL, userId: USER_ID }), []);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [mockFeedItems, setMockFeedItems] = useState<FeedItem[]>(MOCK_FEED_ITEMS);
  const [mockCommentsByPostId, setMockCommentsByPostId] =
    useState<Record<string, CommentItem[]>>(MOCK_COMMENTS_BY_POST_ID);
  const [postDetails, setPostDetails] = useState<Record<string, PostDetail>>({});
  const [selectedPointByPostId, setSelectedPointByPostId] = useState<Record<string, string>>({});
  const [feedCommentTexts, setFeedCommentTexts] = useState<Record<string, string>>({});
  const [savedItems, setSavedItems] = useState<FeedItem[]>([]);
  const [publishedItems, setPublishedItems] = useState<FeedItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [draftTrip, setDraftTrip] = useState<Trip | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState('');
  const [mePanel, setMePanel] = useState<MePanel>('overview');
  const [profileForm, setProfileForm] = useState({ displayName: '', username: '', bio: '' });
  const [form, setForm] = useState<DraftForm>(initialForm);
  const [pickedImages, setPickedImages] = useState<LocalImage[]>([]);
  const [recordImages, setRecordImages] = useState<LocalImage[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<TripPoint | null>(null);
  const [pointEditForm, setPointEditForm] = useState<PointEditForm>(initialPointEditForm);
  const [pointEditCoordinate, setPointEditCoordinate] = useState<Coordinate | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinate | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStart, setPublishStart] = useState('');
  const [publishEnd, setPublishEnd] = useState('');
  const [excludedPublishPointIds, setExcludedPublishPointIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const mockPostDetails = useMemo(
    () =>
      mockFeedItems.reduce<Record<string, PostDetail>>((details, item) => {
        details[item.id] = createMockPostDetail(item, mockCommentsByPostId[item.id] ?? []);
        return details;
      }, {}),
    [mockFeedItems, mockCommentsByPostId],
  );

  useEffect(() => {
    LogBox.ignoreAllLogs(true);
    void refreshAll();
  }, []);

  useEffect(() => {
    if (!message) return undefined;

    const timeout = setTimeout(() => {
      setMessage('');
    }, 3200);

    return () => clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedPost) {
        setSelectedPost(null);
        return true;
      }

      if (activeTab !== 'home') {
        setSelectedPost(null);
        setMePanel('overview');
        setActiveTab('home');
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [activeTab, selectedPost]);

  function goHome() {
    setSelectedPost(null);
    setMePanel('overview');
    setActiveTab('home');
  }

  async function refreshAll(targetTripId?: string) {
    try {
      setLoading(true);
      const [health, feed, tripList, user] = await Promise.all([
        api.getHealth(),
        api.getFeed(),
        api.getTrips(),
        api.getCurrentUser(),
      ]);

      if (!health.ok) {
        throw new Error('API 未正常启动。');
      }

      const detailEntries = await Promise.allSettled(
        feed.items.map(async (item) => [item.id, await api.getPost(item.id)] as const),
      );
      const nextPostDetails = detailEntries.reduce<Record<string, PostDetail>>((details, entry) => {
        if (entry.status === 'fulfilled') {
          const [postId, detail] = entry.value;
          details[postId] = detail;
        }
        return details;
      }, {});
      const [savedResult, publishedResult] = await Promise.allSettled([
        api.getUserSavedPosts(user.id),
        api.getUserPosts(user.id),
      ]);
      const nextSavedItems = savedResult.status === 'fulfilled' ? savedResult.value : [];
      const nextPublishedItems = publishedResult.status === 'fulfilled' ? publishedResult.value : [];

      const editableTrip =
        tripList.items.find((trip) => trip.id === targetTripId) ??
        tripList.items.find((trip) => trip.status === 'DRAFT') ??
        null;

      startTransition(() => {
        setCurrentUser(user);
        setFeedItems(feed.items);
        setPostDetails(nextPostDetails);
        setSavedItems(nextSavedItems);
        setPublishedItems(nextPublishedItems);
        setTrips(tripList.items);
        setDraftTrip(editableTrip);
        setProfileForm({
          displayName: user.displayName ?? '',
          username: user.username ?? '',
          bio: user.bio ?? '',
        });
      });
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '连接本地服务失败。');
    } finally {
      setLoading(false);
    }
  }

  async function createDraftTrip() {
    const created = await api.createTrip({
      title: form.title || '我的路线',
      summary: form.summary,
      cityName: form.cityName,
      kind: 'MIXED',
      visibility: 'PRIVATE',
    });
    setDraftTrip(created);
    return created;
  }

  async function ensureDraft(options?: { verify?: boolean }) {
    if (draftTrip && draftTrip.status !== 'PUBLISHED') {
      if (!options?.verify) {
        return draftTrip;
      }

      try {
        const latest = await api.getTrip(draftTrip.id);
        if (latest.status !== 'PUBLISHED') {
          setDraftTrip(latest);
          return latest;
        }
      } catch {
        setDraftTrip(null);
      }
    }

    return createDraftTrip();
  }

  async function getCoordinateForNewPoint(pointIndex: number, existingPoints: TripPoint[] = draftTrip?.points ?? []) {
    if (selectedCoordinate) {
      return selectedCoordinate;
    }

    const typedCoordinate = coordinateFromText(form.pointLocation);
    if (typedCoordinate) {
      return typedCoordinate;
    }

    const current = await getCurrentCoordinate();
    if (current) {
      return current;
    }

    const previousPoint = [...existingPoints]
      .reverse()
      .find((point) => numericCoordinate(point.latitude) !== null && numericCoordinate(point.longitude) !== null);
    const previousLatitude = numericCoordinate(previousPoint?.latitude);
    const previousLongitude = numericCoordinate(previousPoint?.longitude);
    const offset = Math.max(pointIndex, 1) * 0.006;

    return {
      latitude: (previousLatitude ?? FALLBACK_COORDINATE.latitude) + offset,
      longitude: (previousLongitude ?? FALLBACK_COORDINATE.longitude) + offset,
    };
  }

  async function createMediaAssets(trip: Trip, images: LocalImage[]) {
    const medias: MediaAsset[] = [];
    for (const image of images) {
      const uploaded = await uploadImageToWeb(image);
      const created = await api.createMediaAsset({
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        bytes: uploaded.bytes,
        tripId: trip.id,
      });
      const ready = (await api.markMediaReady(created.id, uploaded.storageKey)) as MediaAsset;
      medias.push(ready);
    }
    return medias;
  }

  async function clonePointMediaAssets(targetTrip: Trip, point: TripPoint) {
    const medias: MediaAsset[] = [];
    for (const media of point.mediaAssets ?? []) {
      const created = await api.createMediaAsset({
        originalName: media.originalName || 'tripin-image.jpg',
        mimeType: media.mimeType || 'image/jpeg',
        bytes: 1,
        tripId: targetTrip.id,
      });
      const ready = (await api.markMediaReady(created.id, media.storageKey)) as MediaAsset;
      medias.push(ready);
    }
    return medias;
  }

  function runTask(task: () => Promise<void>) {
    startTransition(() => {
      void task().catch((error) => {
        setMessage(error instanceof Error ? error.message : '操作失败。');
      });
    });
  }

  function handlePickStudioImages() {
    runTask(async () => {
      const images = await pickImages();
      if (images.length) {
        setPickedImages(images);
        setMessage(`已选择 ${images.length} 张图片。`);
      }
    });
  }

  function handleMapPress(coordinate: Coordinate) {
    setSelectedCoordinate(coordinate);
    setForm((current) => ({
      ...current,
      pointLocation: `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`,
    }));
    setMessage('已选中地图位置，填写点位信息后点击生成点位。');
  }

  function openPointEditor(point: TripPoint) {
    const latitude = numericCoordinate(point.latitude);
    const longitude = numericCoordinate(point.longitude);
    const coordinate =
      latitude !== null && longitude !== null
        ? { latitude, longitude }
        : null;

    setEditingPoint(point);
    setPointEditCoordinate(coordinate);
    setPointEditForm({
      title: point.title || point.customPlaceName || '',
      location: coordinate
        ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`
        : point.customPlaceName || '',
      startedAt: toLocalInputValue(point.startedAt) || new Date().toISOString().slice(0, 16),
      note: point.note || '',
    });
  }

  function closePointEditor() {
    setEditingPoint(null);
    setPointEditForm(initialPointEditForm);
    setPointEditCoordinate(null);
  }

  function handleUseCurrentLocationForEdit() {
    runTask(async () => {
      setMessage('正在获取当前位置...');
      const coordinate = await getCurrentCoordinate();
      if (!coordinate) {
        setMessage('定位失败，请检查模拟器或浏览器的位置权限。');
        return;
      }
      setPointEditCoordinate(coordinate);
      setPointEditForm((current) => ({
        ...current,
        location: `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`,
      }));
      setMessage('已填入当前位置。');
    });
  }

  function handleSavePointEdit() {
    if (!editingPoint) return;

    runTask(async () => {
      const trip = await ensureDraft({ verify: true });
      const typedCoordinate = coordinateFromText(pointEditForm.location);
      const existingLatitude = numericCoordinate(editingPoint.latitude);
      const existingLongitude = numericCoordinate(editingPoint.longitude);
      const coordinate =
        pointEditCoordinate ??
        typedCoordinate ??
        (existingLatitude !== null && existingLongitude !== null
          ? { latitude: existingLatitude, longitude: existingLongitude }
          : null);

      const updated = await api.updateTripPoint(trip.id, editingPoint.id, {
        title: pointEditForm.title.trim() || `点位 ${editingPoint.sequence}`,
        customPlaceName: pointEditForm.location.trim() || undefined,
        note: pointEditForm.note.trim() || undefined,
        startedAt: new Date(pointEditForm.startedAt || Date.now()).toISOString(),
        latitude: coordinate?.latitude,
        longitude: coordinate?.longitude,
        sourceType: coordinate ? 'MANUAL' : editingPoint.sourceType,
      });
      setDraftTrip(updated);
      closePointEditor();
      await refreshAll(updated.id);
      setMessage('点位信息已更新。');
    });
  }

  function handleAddPoint() {
    runTask(async () => {
      setMessage('正在生成点位...');
      const trip = await ensureDraft({ verify: true });
      const coordinate = await getCoordinateForNewPoint(trip.points.length + 1, trip.points);
      const medias = await createMediaAssets(trip, pickedImages);
      const fallbackTitle = form.pointTitle.trim() || form.pointLocation.trim() || `点位 ${trip.points.length + 1}`;
      const updated = await api.createTripPoint(trip.id, {
        title: fallbackTitle,
        customPlaceName: form.pointLocation.trim() || undefined,
        note: form.pointNote,
        startedAt: new Date(form.startedAt || Date.now()).toISOString(),
        latitude: coordinate?.latitude,
        longitude: coordinate?.longitude,
        sourceType: 'MANUAL',
        mediaAssetIds: medias.map((media) => media.id),
      });
      setDraftTrip(updated);
      setSelectedCoordinate(null);
      setPickedImages([]);
      setForm((current) => ({ ...current, pointLocation: '', pointTitle: '', pointNote: '' }));
      await refreshAll(updated.id);
      setMessage('点位已加入点位管理。');
    });
  }

  function handlePublish() {
    runTask(async () => {
      const trip = await ensureDraft({ verify: true });
      if (!trip.points.some(hasUsableCoordinate)) {
        Alert.alert('还不能发布', '至少需要一个带位置的点位才能形成路线。');
        return;
      }

      const window = defaultPublishWindow(trip.points);
      setForm((current) => ({
        ...current,
        title: current.title || trip.title || '我的路线',
        summary: current.summary || trip.summary || '',
        cityName: current.cityName || trip.cityName || '',
      }));
      setPublishStart(window.start);
      setPublishEnd(window.end);
      setExcludedPublishPointIds([]);
      setPublishOpen(true);
    });
  }

  function handleConfirmPublish() {
    runTask(async () => {
      const trip = await ensureDraft({ verify: true });
      const selectedPoints = pointsInTimeWindow(
        trip.points,
        publishStart,
        publishEnd,
        excludedPublishPointIds,
      );

      if (!selectedPoints.length) {
        Alert.alert('还不能发布', '当前时间段里没有可形成路线的完整点位。');
        return;
      }

      const draftForNextEdit = await api.updateTrip(trip.id, {
        title: form.title || trip.title || '我的路线',
        summary: form.summary || '',
        cityName: form.cityName || undefined,
        kind: 'MIXED',
        visibility: 'PRIVATE',
      });

      let publishTrip = await api.createTrip({
        title: form.title || trip.title || '我的路线',
        summary: form.summary || '',
        cityName: form.cityName || undefined,
        kind: 'MIXED',
        visibility: 'PRIVATE',
      });

      for (const [index, point] of selectedPoints.entries()) {
        const clonedMedias = await clonePointMediaAssets(publishTrip, point);
        publishTrip = await api.createTripPoint(publishTrip.id, {
          title: point.title || point.customPlaceName || `点位 ${index + 1}`,
          customPlaceName: point.customPlaceName || point.place?.name || undefined,
          note: point.note || undefined,
          startedAt: point.startedAt,
          endedAt: point.endedAt || undefined,
          placeId: point.place?.id,
          latitude: numericCoordinate(point.latitude) ?? undefined,
          longitude: numericCoordinate(point.longitude) ?? undefined,
          sourceType: point.sourceType,
          sequence: index + 1,
          mediaAssetIds: clonedMedias.map((media) => media.id),
        });
      }

      await api.publishTrip(publishTrip.id, {
        title: form.title || trip.title,
        summary: form.summary || trip.summary || '',
        visibility: 'PUBLIC',
      });
      setDraftTrip(draftForNextEdit);
      setPickedImages([]);
      setPublishOpen(false);
      setExcludedPublishPointIds([]);
      await refreshAll(draftForNextEdit.id);
      setActiveTab('home');
      setMessage('作品已发布到首页。');
    });
  }

  function togglePublishPoint(pointId: string) {
    setExcludedPublishPointIds((current) =>
      current.includes(pointId)
        ? current.filter((id) => id !== pointId)
        : [...current, pointId],
    );
  }

  function handleDeletePoint(pointId: string) {
    Alert.alert('删除点位', '确定要从点位管理中删除这个点位吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          runTask(async () => {
            const trip = await ensureDraft({ verify: true });
            const updated = await api.deleteTripPoint(trip.id, pointId);
            setDraftTrip(updated);
            await refreshAll(updated.id);
            setMessage('点位已删除。');
          });
        },
      },
    ]);
  }

  function mergeInteractionState(
    postId: string,
    counts: PostDetail['counts'],
    viewerState: NonNullable<PostDetail['viewerState']>,
  ) {
    setFeedItems((items) =>
      items.map((item) =>
        item.id === postId ? { ...item, _count: counts, viewerState } : item,
      ),
    );
    setSavedItems((items) =>
      items.map((item) =>
        item.id === postId ? { ...item, _count: counts, viewerState } : item,
      ),
    );
    setPublishedItems((items) =>
      items.map((item) =>
        item.id === postId ? { ...item, _count: counts, viewerState } : item,
      ),
    );
    setPostDetails((details) => {
      const detail = details[postId];
      if (!detail) return details;
      return {
        ...details,
        [postId]: {
          ...detail,
          counts,
          viewerState,
        },
      };
    });
  }

  function updateMockPost(postId: string, updater: (item: FeedItem) => FeedItem) {
    setMockFeedItems((items) => items.map((item) => (item.id === postId ? updater(item) : item)));
    setSelectedPost((current) => (current?.id === postId ? updater(current) : current));
  }

  function createLocalComment(content: string): CommentItem {
    return {
      id: `local-comment-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      user: currentUser ?? { id: USER_ID, username: 'demo', displayName: 'Demo User' },
    };
  }

  function handleToggleLike(postId: string) {
    if (isMockPostId(postId)) {
      updateMockPost(postId, (item) => {
        const liked = item.viewerState?.liked ?? false;
        return {
          ...item,
          _count: {
            ...item._count,
            likes: Math.max(0, item._count.likes + (liked ? -1 : 1)),
          },
          viewerState: {
            ...(item.viewerState ?? {}),
            liked: !liked,
          },
        };
      });
      return;
    }

    const detail = postDetails[postId];
    const feedItem = feedItems.find((item) => item.id === postId);
    const liked = detail?.viewerState?.liked ?? feedItem?.viewerState?.liked ?? false;

    runTask(async () => {
      const result = liked ? await api.unlikePost(postId) : await api.likePost(postId);
      mergeInteractionState(postId, result.counts, result.viewerState);
    });
  }

  function handleToggleSave(postId: string) {
    if (isMockPostId(postId)) {
      updateMockPost(postId, (item) => {
        const saved = item.viewerState?.saved ?? false;
        return {
          ...item,
          _count: {
            ...item._count,
            saves: Math.max(0, item._count.saves + (saved ? -1 : 1)),
          },
          viewerState: {
            ...(item.viewerState ?? {}),
            saved: !saved,
          },
        };
      });
      return;
    }

    const detail = postDetails[postId];
    const feedItem =
      feedItems.find((item) => item.id === postId) ??
      savedItems.find((item) => item.id === postId) ??
      publishedItems.find((item) => item.id === postId);
    const saved = detail?.viewerState?.saved ?? feedItem?.viewerState?.saved ?? false;

    runTask(async () => {
      const result = saved ? await api.unsavePost(postId) : await api.savePost(postId);
      mergeInteractionState(postId, result.counts, result.viewerState);
      if (saved) {
        setSavedItems((items) => items.filter((item) => item.id !== postId));
      } else {
        const latest = feedItem ? { ...feedItem, _count: result.counts, viewerState: result.viewerState } : null;
        if (latest) {
          setSavedItems((items) => (items.some((item) => item.id === postId) ? items : [latest, ...items]));
        }
      }
    });
  }

  function handleCreateComment(postId: string) {
    const content = commentText.trim();
    if (!content) {
      setMessage('先输入评论内容。');
      return;
    }

    if (isMockPostId(postId)) {
      const comment = createLocalComment(content);
      setMockCommentsByPostId((current) => ({
        ...current,
        [postId]: [...(current[postId] ?? []), comment],
      }));
      updateMockPost(postId, (item) => ({
        ...item,
        _count: {
          ...item._count,
          comments: item._count.comments + 1,
        },
      }));
      setCommentText('');
      setExpandedComments((current) => ({ ...current, [postId]: true }));
      setMessage('评论已发布。');
      return;
    }

    runTask(async () => {
      const comment = await api.createComment(postId, content);
      setPostDetails((details) => {
        const detail = details[postId];
        if (!detail) return details;
        return {
          ...details,
          [postId]: {
            ...detail,
            comments: [...detail.comments, comment],
            counts: {
              ...detail.counts,
              comments: detail.counts.comments + 1,
            },
          },
        };
      });
      setFeedItems((items) =>
        items.map((item) =>
          item.id === postId
            ? { ...item, _count: { ...item._count, comments: item._count.comments + 1 } }
            : item,
        ),
      );
      setCommentText('');
      setExpandedComments((current) => ({ ...current, [postId]: true }));
      setMessage('评论已发布。');
    });
  }

  function handleCreateFeedComment(postId: string) {
    const content = (feedCommentTexts[postId] ?? '').trim();
    if (!content) {
      setMessage('先输入评论内容。');
      return;
    }

    if (isMockPostId(postId)) {
      const comment = createLocalComment(content);
      setMockCommentsByPostId((current) => ({
        ...current,
        [postId]: [...(current[postId] ?? []), comment],
      }));
      updateMockPost(postId, (item) => ({
        ...item,
        _count: {
          ...item._count,
          comments: item._count.comments + 1,
        },
      }));
      setFeedCommentTexts((current) => ({ ...current, [postId]: '' }));
      setMessage('评论已发布。');
      return;
    }

    runTask(async () => {
      const comment = await api.createComment(postId, content);
      setPostDetails((details) => {
        const detail = details[postId];
        if (!detail) return details;
        return {
          ...details,
          [postId]: {
            ...detail,
            comments: [...detail.comments, comment],
            counts: {
              ...detail.counts,
              comments: detail.counts.comments + 1,
            },
          },
        };
      });
      setFeedItems((items) =>
        items.map((item) =>
          item.id === postId
            ? { ...item, _count: { ...item._count, comments: item._count.comments + 1 } }
            : item,
        ),
      );
      setFeedCommentTexts((current) => ({ ...current, [postId]: '' }));
      setMessage('评论已发布。');
    });
  }

  function handleSaveProfile() {
    runTask(async () => {
      const user = await api.updateCurrentUser({
        displayName: profileForm.displayName.trim() || 'Demo User',
        username: profileForm.username.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
      });
      setCurrentUser(user);
      setMessage('个人资料已更新。');
    });
  }

  function handleInstantRecord() {
    runTask(async () => {
      setMessage('正在获取当前位置并生成临时点位...');
      const trip = await ensureDraft({ verify: true });
      const currentCoordinate = await getCurrentCoordinate();
      const coordinate = currentCoordinate ?? (await getCoordinateForNewPoint(trip.points.length + 1, trip.points));
      const medias = await createMediaAssets(trip, recordImages);
      const locationLabel = coordinate
        ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`
        : undefined;
      const updated = await api.createTripPoint(trip.id, {
        title: `临时点位 ${trip.points.length + 1}`,
        customPlaceName: locationLabel,
        note: coordinate ? '临时点位，来自即时记录，请及时完善信息。' : '临时点位，来自即时记录，待补充位置。',
        startedAt: new Date().toISOString(),
        latitude: coordinate?.latitude,
        longitude: coordinate?.longitude,
        sourceType: 'AUTO',
        mediaAssetIds: medias.map((media) => media.id),
      });
      setRecordImages([]);
      setRecordOpen(false);
      setDraftTrip(updated);
      await refreshAll(updated.id);
      setActiveTab('studio');
      setMessage('临时点位已加入点位管理。');
    });
  }

  function renderHome() {
    if (selectedPost) {
      const selectedDetail = postDetails[selectedPost.id] ?? mockPostDetails[selectedPost.id];
      return (
        <ScrollView contentContainerStyle={styles.screenContent}>
          <PostDetailView
            post={selectedPost}
            detail={selectedDetail}
            commentText={commentText}
            commentsExpanded={Boolean(expandedComments[selectedPost.id])}
            onChangeCommentText={setCommentText}
            onToggleComments={() =>
              setExpandedComments((current) => ({
                ...current,
                [selectedPost.id]: !current[selectedPost.id],
              }))
            }
            onToggleLike={() => handleToggleLike(selectedPost.id)}
            onToggleSave={() => handleToggleSave(selectedPost.id)}
            onCreateComment={() => handleCreateComment(selectedPost.id)}
            selectedPointId={selectedPointByPostId[selectedPost.id]}
            onSelectPoint={(pointId) =>
              setSelectedPointByPostId((current) => ({ ...current, [selectedPost.id]: pointId }))
            }
          />
        </ScrollView>
      );
    }

    const displayFeedItems = feedItems.length ? [...mockFeedItems, ...feedItems] : mockFeedItems;

    return (
      <ScrollView contentContainerStyle={styles.feedContent}>
        <View style={styles.feedHeader}>
          <View>
            <Text style={styles.feedBrand}>TripIn</Text>
            <Text style={styles.feedSubtitle}>朋友正在分享今天走过的路线</Text>
          </View>
          <LinearGradient colors={['#0ea5e9', '#1d4ed8']} style={styles.headerGradientButton}>
            <Text style={styles.headerGradientText}>发布</Text>
          </LinearGradient>
        </View>
        {displayFeedItems.map((item) => (
            <PostCard
              key={item.id}
              post={item}
              detail={postDetails[item.id] ?? mockPostDetails[item.id]}
              commentText={feedCommentTexts[item.id] ?? ''}
              onOpen={() => setSelectedPost(item)}
              onToggleLike={() => handleToggleLike(item.id)}
              onToggleSave={() => handleToggleSave(item.id)}
              onChangeCommentText={(value) =>
                setFeedCommentTexts((current) => ({ ...current, [item.id]: value }))
              }
              onCreateComment={() => handleCreateFeedComment(item.id)}
              selectedPointId={selectedPointByPostId[item.id]}
              onSelectPoint={(pointId) =>
                setSelectedPointByPostId((current) => ({ ...current, [item.id]: pointId }))
              }
            />
          ))}
      </ScrollView>
    );
  }

  function renderStudio() {
    const points = draftTrip?.points ?? [];
    const pointMarkers = points
      .map((point, index) => {
        const latitude = numericCoordinate(point.latitude);
        const longitude = numericCoordinate(point.longitude);
        if (latitude === null || longitude === null) {
          return null;
        }
        return {
          id: point.id,
          latitude,
          longitude,
          title: pointName(point, index),
          subtitle: point.note ?? undefined,
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);
    const mapMarkers = selectedCoordinate
      ? [
          ...pointMarkers,
          {
            id: 'selected-coordinate',
            latitude: selectedCoordinate.latitude,
            longitude: selectedCoordinate.longitude,
            title: '待生成',
            subtitle: '点击生成点位后保存',
          },
        ]
      : pointMarkers;
    const mapRoute = mapMarkers.map((marker, index) => ({
      pointId: marker.id,
      sequence: index + 1,
      latitude: marker.latitude,
      longitude: marker.longitude,
    }));
    const mapPolylines =
      mapMarkers.length >= 2
        ? [
            {
              id: 'working-route',
              coordinates: mapMarkers.map((marker) => ({
                latitude: marker.latitude,
                longitude: marker.longitude,
              })),
              color: '#14443f',
              width: 8,
            },
          ]
        : [];
    return (
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.pageHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.pageTitle}>工作台</Text>
              <Text style={styles.pageSubtitle}>添加点位，整理成路线，再发布到主页</Text>
            </View>
            <Pressable style={styles.homeShortcut} hitSlop={16} onPress={goHome}>
              <Text style={styles.homeShortcutText}>首页</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mapPanel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>地图</Text>
              <Text style={styles.hintText}>生成点位后会在这里形成路线</Text>
            </View>
            <Text style={styles.mapBadge}>{mapMarkers.length} 点</Text>
          </View>
          <View style={styles.mapFrame}>
            {Platform.OS === 'android' ? (
              <TripinMapView
                style={styles.nativeMap}
                markers={mapMarkers}
                polylines={mapPolylines}
                onMapPress={handleMapPress}
              />
            ) : (
              <RoutePreview points={mapRoute} height={260} />
            )}
          </View>
          <Text style={styles.hintText}>
            如果模拟器没有定位权限，生成点位会自动使用地图中心附近的临时坐标，后续可再编辑。
          </Text>
          {selectedCoordinate ? (
            <Text style={styles.selectedLocationText}>
              已选位置：{selectedCoordinate.latitude.toFixed(5)}, {selectedCoordinate.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.hintText}>也可以直接点地图上的位置，再点击“生成点位”。</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>生成点位</Text>
          <TextInput
            value={form.pointLocation}
            onChangeText={(pointLocation) => {
              setForm((current) => ({ ...current, pointLocation }));
              setSelectedCoordinate(coordinateFromText(pointLocation));
            }}
            placeholder="位置：点地图获取，或输入地点/经纬度"
            style={styles.input}
          />
          <TextInput
            value={form.startedAt}
            onChangeText={(startedAt) => setForm((current) => ({ ...current, startedAt }))}
            placeholder="时间，例如 2026-04-28T10:30"
            style={styles.input}
          />
          <TextInput
            value={form.pointNote}
            onChangeText={(pointNote) => setForm((current) => ({ ...current, pointNote }))}
            placeholder="描述"
            multiline
            style={[styles.input, styles.textareaSmall]}
          />
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={handlePickStudioImages}>
              <Text style={styles.secondaryButtonText}>选择图片</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleAddPoint}>
              <Text style={styles.primaryButtonText}>生成点位</Text>
            </Pressable>
          </View>
          <Text style={styles.hintText}>
            {pickedImages.length
              ? `已选择 ${pickedImages.length} 张图片`
              : '位置不完整也可创建；形成路线时只使用带坐标的点位'}
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>点位管理</Text>
            <Text style={styles.hintText}>{points.length} 个点位</Text>
          </View>
          {points.length ? (
            points.map((point, index) => (
              <PointRow
                key={point.id}
                point={point}
                index={index}
                editable
                onEdit={() => openPointEditor(point)}
                onDelete={() => handleDeletePoint(point.id)}
              />
            ))
          ) : (
            <EmptyMessage title="还没有点位" description="上传图片或生成点位后，会出现在这里。" />
          )}
        </View>

        <Pressable style={styles.publishButton} onPress={handlePublish}>
          <Text style={styles.publishButtonText}>发布作品</Text>
        </Pressable>
      </ScrollView>
    );
  }

  function renderMe() {
    const draftCount = trips.filter((trip) => trip.status === 'DRAFT').length;
    const publishedCount = trips.filter((trip) => trip.status === 'PUBLISHED').length;
    const displayUser = currentUser ?? {
      id: USER_ID,
      displayName: 'Demo User',
      username: 'demo-user',
      bio: '',
    };

    if (mePanel !== 'overview') {
      return (
        <ScrollView contentContainerStyle={styles.screenContent}>
          <BackButton label="返回个人信息" onPress={() => setMePanel('overview')} />
          <AccountPanel
            panel={mePanel}
            user={displayUser}
            profileForm={profileForm}
            onChangeProfile={setProfileForm}
            onSaveProfile={handleSaveProfile}
            savedItems={savedItems}
            publishedItems={publishedItems}
            trips={trips}
            onOpenPost={(item) => {
              setSelectedPost(item);
              setActiveTab('home');
              setMePanel('overview');
            }}
            onRemoveSaved={(postId) => handleToggleSave(postId)}
            onGoStudio={() => {
              setMePanel('overview');
              setActiveTab('studio');
            }}
            onRefresh={() => void refreshAll()}
          />
        </ScrollView>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.screenContent}>
        <BackButton label="返回首页" onPress={goHome} />
        <View style={styles.profileBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayUser.displayName.slice(0, 1) || '我'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{displayUser.displayName}</Text>
            <Text style={styles.pageSubtitle}>
              {displayUser.username ? `@${displayUser.username}` : displayUser.id}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Stat value={String(trips.length)} label="路线" />
          <Stat value={String(draftCount)} label="草稿" />
          <Stat value={String(publishedCount)} label="发布" />
        </View>

        <View style={styles.accountGroup}>
          <AccountRow title="个人信息" meta="编辑资料" icon="人" onPress={() => setMePanel('profile')} />
          <AccountRow title="我的路线" meta={`${trips.length} 条`} icon="线" onPress={() => setMePanel('routes')} />
          <AccountRow title="我的发布" meta={`${publishedItems.length} 条`} icon="路" onPress={() => setMePanel('posts')} />
          <AccountRow title="收藏" meta={`${savedItems.length} 条`} icon="藏" onPress={() => setMePanel('favorites')} />
          <AccountRow
            title="退出账号"
            meta="当前为本地 demo"
            icon="退"
            danger
            onPress={() => setMessage('本地调试账号无需退出，关闭 App 即可。')}
          />
        </View>

      </ScrollView>
    );
  }

  const publishWindowPoints = pointsInTimeWindow(draftTrip?.points ?? [], publishStart, publishEnd, []);
  const publishPreviewPoints = pointsInTimeWindow(
    draftTrip?.points ?? [],
    publishStart,
    publishEnd,
    excludedPublishPointIds,
  );

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator />
          <Text style={styles.hintText}>正在连接本地服务...</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {activeTab === 'home' ? renderHome() : null}
          {activeTab === 'studio' ? renderStudio() : null}
          {activeTab === 'me' ? renderMe() : null}
        </View>
      )}

      {message ? <Text style={styles.toast}>{message}</Text> : null}

      <View style={styles.bottomBar}>
        <TabButton label="即时记录" active={activeTab === 'record'} onPress={() => setRecordOpen(true)} />
        <Pressable
          style={styles.plusButtonShell}
          hitSlop={18}
          onPressIn={() => {
            if (activeTab === 'studio') {
              goHome();
            } else {
              setSelectedPost(null);
              setMePanel('overview');
              setActiveTab('studio');
            }
          }}
        >
          <LinearGradient
            colors={activeTab === 'studio' ? ['#1d4ed8', '#0ea5e9'] : ['#0ea5e9', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.plusButton, activeTab === 'studio' ? styles.homeButton : null]}
          >
            <Text style={[styles.plusText, activeTab === 'studio' ? styles.homeButtonText : null]}>
              {activeTab === 'studio' ? '首页' : '＋'}
            </Text>
          </LinearGradient>
        </Pressable>
        <TabButton label="个人信息" active={activeTab === 'me'} onPress={() => setActiveTab('me')} />
      </View>

      <Modal visible={publishOpen} animationType="slide" onRequestClose={() => setPublishOpen(false)}>
        <SafeAreaView style={styles.app}>
          <ScrollView contentContainerStyle={styles.publishPage}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>发布作品</Text>
                <Text style={styles.hintText}>填写作品信息，选择时间段，确认本次要发布的路线。</Text>
              </View>
              <Pressable onPress={() => setPublishOpen(false)}>
                <Text style={styles.closeText}>关闭</Text>
              </Pressable>
            </View>

            <TextInput
              value={form.title}
              onChangeText={(title) => setForm((current) => ({ ...current, title }))}
              placeholder="标题"
              style={styles.input}
            />
            <TextInput
              value={form.cityName}
              onChangeText={(cityName) => setForm((current) => ({ ...current, cityName }))}
              placeholder="城市"
              style={styles.input}
            />
            <TextInput
              value={form.summary}
              onChangeText={(summary) => setForm((current) => ({ ...current, summary }))}
              placeholder="路线总描述"
              multiline
              style={[styles.input, styles.textareaSmall]}
            />

            <View style={styles.row}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>开始</Text>
                <TextInput value={publishStart} onChangeText={setPublishStart} style={styles.input} />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>结束</Text>
                <TextInput value={publishEnd} onChangeText={setPublishEnd} style={styles.input} />
              </View>
            </View>

            <View style={styles.previewBox}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>待发布路线</Text>
                <Text style={styles.mapBadge}>{publishPreviewPoints.length} 点</Text>
              </View>
              <RoutePreview
                points={publishPreviewPoints.map((point, index) => ({
                  pointId: point.id,
                  sequence: index + 1,
                  latitude: numericCoordinate(point.latitude) ?? 0,
                  longitude: numericCoordinate(point.longitude) ?? 0,
                }))}
                height={150}
              />
            </View>

            <ScrollView style={styles.publishPointList}>
              {publishWindowPoints.length ? (
                publishWindowPoints.map((point, index) => {
                  const excluded = excludedPublishPointIds.includes(point.id);
                  return (
                    <View key={point.id} style={[styles.routeEditRow, excluded ? styles.routeEditRowDisabled : null]}>
                      <View style={styles.pointIndex}>
                        <Text style={styles.pointIndexText}>{index + 1}</Text>
                      </View>
                      <View style={styles.pointInfo}>
                        <Text style={styles.pointTitle}>{pointName(point, index)}</Text>
                        <Text style={styles.hintText}>{formatDate(point.startedAt)}</Text>
                      </View>
                      <Pressable style={styles.smallActionButton} onPress={() => togglePublishPoint(point.id)}>
                        <Text style={styles.smallActionText}>{excluded ? '恢复' : '移出'}</Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <EmptyMessage title="没有可发布点位" description="这个时间段内没有带坐标的完整点位。" />
              )}
            </ScrollView>

            <Pressable style={styles.publishButton} onPress={handleConfirmPublish}>
              <Text style={styles.publishButtonText}>{isPending ? '发布中...' : '确认发布'}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal transparent visible={recordOpen} animationType="fade" onRequestClose={() => setRecordOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.recordModal}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>即时记录</Text>
              <Pressable onPress={() => setRecordOpen(false)}>
                <Text style={styles.closeText}>关闭</Text>
              </Pressable>
            </View>
            <Text style={styles.pageSubtitle}>会自动获取当前位置并生成临时点位，图片可选，后续可在点位管理里完善。</Text>
            <Pressable
              style={styles.uploadBox}
              onPress={() =>
                runTask(async () => {
                  const images = await pickImages();
                  if (images.length) setRecordImages(images);
                })
              }
            >
              <Text style={styles.uploadTitle}>上传图片</Text>
              <Text style={styles.hintText}>
                {recordImages.length ? `已选择 ${recordImages.length} 张图片` : '从模拟器相册中选择图片'}
              </Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleInstantRecord}>
              <Text style={styles.primaryButtonText}>{isPending ? '生成中...' : '获取位置并生成'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(editingPoint)} animationType="fade" onRequestClose={closePointEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.recordModal}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>完善点位</Text>
              <Pressable onPress={closePointEditor}>
                <Text style={styles.closeText}>关闭</Text>
              </Pressable>
            </View>
            <Text style={styles.pageSubtitle}>补全位置、时间和描述后，这个临时点位就可以用于生成路线。</Text>
            <TextInput
              value={pointEditForm.title}
              onChangeText={(title) => setPointEditForm((current) => ({ ...current, title }))}
              placeholder="点位标题"
              style={styles.input}
            />
            <TextInput
              value={pointEditForm.location}
              onChangeText={(location) => {
                setPointEditForm((current) => ({ ...current, location }));
                setPointEditCoordinate(coordinateFromText(location));
              }}
              placeholder="位置：可输入地点或经纬度"
              style={styles.input}
            />
            <TextInput
              value={pointEditForm.startedAt}
              onChangeText={(startedAt) => setPointEditForm((current) => ({ ...current, startedAt }))}
              placeholder="时间，例如 2026-04-28T10:30"
              style={styles.input}
            />
            <TextInput
              value={pointEditForm.note}
              onChangeText={(note) => setPointEditForm((current) => ({ ...current, note }))}
              placeholder="描述"
              multiline
              style={[styles.input, styles.textareaSmall]}
            />
            <View style={styles.row}>
              <Pressable style={styles.secondaryButton} onPress={handleUseCurrentLocationForEdit}>
                <Text style={styles.secondaryButtonText}>获取当前位置</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleSavePointEdit}>
                <Text style={styles.primaryButtonText}>{isPending ? '保存中...' : '保存点位'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.navButton, active ? styles.navButtonActive : null]} hitSlop={12} onPressIn={onPress}>
      <Text style={[styles.navButtonText, active ? styles.navButtonTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View
      style={styles.backButton}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={onPress}
    >
      <Text style={styles.backButtonText}>{label}</Text>
    </View>
  );
}

function GeneratedRouteCover({
  title,
  cityName,
  activePointLabel,
  compact = false,
}: {
  title: string;
  cityName?: string | null;
  activePointLabel?: string | null;
  compact?: boolean;
}) {
  return (
    <LinearGradient
      colors={['#dbeafe', '#60a5fa', '#1d4ed8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.generatedCover, compact ? styles.generatedCoverCompact : null]}
    >
      <View style={styles.generatedPhotoNoise} />
      <Text style={styles.generatedCoverKicker}>{cityName || 'TripIn route'}</Text>
      <Text style={styles.generatedCoverTitle}>{title || '未命名路线'}</Text>
      <View style={styles.generatedCoverMeta}>
        <Text style={styles.generatedCoverMetaText}>{activePointLabel ?? '选择路线点查看对应图片'}</Text>
      </View>
    </LinearGradient>
  );
}

function RouteMediaViewer({
  trip,
  route,
  title,
  cityName,
  compact = false,
  selectedPointId: cachedSelectedPointId,
  onSelectPoint,
}: {
  trip?: Trip | null;
  route: NonNullable<Trip['routePreview']>;
  title: string;
  cityName?: string | null;
  compact?: boolean;
  selectedPointId?: string | null;
  onSelectPoint?: (pointId: string) => void;
}) {
  const imageEntries = collectTripImageEntries(trip);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const safeImageIndex = imageEntries.length ? Math.min(activeImageIndex, imageEntries.length - 1) : 0;
  const activeImage = imageEntries[safeImageIndex];
  const activePointId = cachedSelectedPointId ?? selectedPointId ?? activeImage?.pointId ?? route[0]?.pointId ?? null;
  const activeRoutePoint = activePointId ? route.find((point) => point.pointId === activePointId) : null;
  const activeTripPoint = activePointId ? trip?.points.find((point) => point.id === activePointId) : null;
  const activePointLabel =
    activeTripPoint?.title ??
    activeTripPoint?.customPlaceName ??
    (activeRoutePoint ? `点位 ${activeRoutePoint.sequence}` : null);

  useEffect(() => {
    if (!cachedSelectedPointId || !imageEntries.length) return;
    const selectedImageIndex = imageEntries.findIndex((entry) => entry.pointId === cachedSelectedPointId);
    if (selectedImageIndex >= 0 && selectedImageIndex !== activeImageIndex) {
      setActiveImageIndex(selectedImageIndex);
    }
  }, [activeImageIndex, cachedSelectedPointId, imageEntries]);

  function showImage(nextIndex: number) {
    if (!imageEntries.length) return;
    const normalizedIndex = (nextIndex + imageEntries.length) % imageEntries.length;
    const nextImage = imageEntries[normalizedIndex];
    setActiveImageIndex(normalizedIndex);
    setSelectedPointId(nextImage.pointId);
    onSelectPoint?.(nextImage.pointId);
  }

  function handlePointPress(pointId: string) {
    setSelectedPointId(pointId);
    onSelectPoint?.(pointId);
    const firstImageIndex = imageEntries.findIndex((entry) => entry.pointId === pointId);
    if (firstImageIndex >= 0) {
      setActiveImageIndex(firstImageIndex);
    }
  }

  return (
    <View style={styles.routeMediaViewer}>
        {activeImage ? (
          <View style={[styles.viewerImageFrame, compact ? styles.viewerImageFrameCompact : null]}>
            <Image source={{ uri: activeImage.uri }} style={styles.viewerImage} />
          {imageEntries.length > 1 ? (
            <>
              <Pressable
                accessibilityRole="button"
                style={[styles.carouselButton, styles.carouselButtonLeft]}
                onPress={() => showImage(safeImageIndex - 1)}
              >
                <Text style={styles.carouselButtonText}>{'<'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.carouselButton, styles.carouselButtonRight]}
                onPress={() => showImage(safeImageIndex + 1)}
              >
                <Text style={styles.carouselButtonText}>{'>'}</Text>
              </Pressable>
            </>
          ) : null}
          <View style={styles.imageCounterBadge}>
            <Text style={styles.imageCounterText}>
              {safeImageIndex + 1}/{imageEntries.length} · 点位 {activeImage.pointIndex + 1}
            </Text>
          </View>
        </View>
      ) : (
        <GeneratedRouteCover
          title={title}
          cityName={cityName}
          activePointLabel={activePointLabel}
          compact={compact}
        />
      )}
      <View style={styles.viewerRoutePanel}>
        <View style={styles.viewerRouteHeader}>
          <Text style={styles.viewerRouteTitle}>路线图</Text>
          <Text style={styles.viewerRouteHint}>{activePointLabel ? `当前：${activePointLabel}` : '点击点位切换图片'}</Text>
        </View>
        <RoutePreview
          points={route}
          height={compact ? 132 : 168}
          selectedPointId={activePointId}
          onPointPress={handlePointPress}
          surface="feed"
        />
      </View>
    </View>
  );
}

function PostDetailView({
  post,
  detail,
  commentText,
  commentsExpanded,
  onChangeCommentText,
  onToggleComments,
  onToggleLike,
  onToggleSave,
  onCreateComment,
  selectedPointId,
  onSelectPoint,
}: {
  post: FeedItem;
  detail?: PostDetail;
  commentText: string;
  commentsExpanded: boolean;
  onChangeCommentText: (value: string) => void;
  onToggleComments: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onCreateComment: () => void;
  selectedPointId?: string | null;
  onSelectPoint?: (pointId: string) => void;
}) {
  const route = detail?.trip.routePreview ?? post.trip.routePreview ?? [];
  const counts = detail?.counts ?? post._count;
  const liked = detail?.viewerState?.liked ?? post.viewerState?.liked ?? false;
  const saved = detail?.viewerState?.saved ?? post.viewerState?.saved ?? false;
  const comments = detail?.comments ?? [];
  const visibleComments = commentsExpanded ? comments : comments.slice(0, 3);

  return (
    <View style={styles.detailStack}>
      <View style={styles.postCard}>
        <View style={styles.authorRow}>
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>{post.author.displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.authorCopy}>
            <Text style={styles.authorName}>{post.author.displayName}</Text>
            <Text style={styles.hintText}>{formatDate(post.publishedAt)}</Text>
          </View>
        </View>
        <Text style={styles.postTitle}>{detail?.title ?? post.title}</Text>
        {detail?.summary || post.summary ? (
          <Text style={styles.postSummary}>{detail?.summary ?? post.summary}</Text>
        ) : null}
        <RouteMediaViewer
          trip={detail?.trip}
          route={route}
          title={detail?.title ?? post.title}
          cityName={detail?.cityName ?? post.cityName}
          selectedPointId={selectedPointId}
          onSelectPoint={onSelectPoint}
        />
        <View style={styles.actionGrid}>
          <Pressable style={[styles.actionButton, liked ? styles.actionButtonActive : null]} onPress={onToggleLike}>
            <Text style={[styles.actionButtonText, liked ? styles.actionButtonTextActive : null]}>
              {liked ? '已赞' : '点赞'} · {counts.likes}
            </Text>
          </Pressable>
          <Pressable style={[styles.actionButton, saved ? styles.actionButtonActive : null]} onPress={onToggleSave}>
            <Text style={[styles.actionButtonText, saved ? styles.actionButtonTextActive : null]}>
              {saved ? '已收藏' : '收藏'} · {counts.saves}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>行程路线</Text>
        {detail?.trip.points?.length ? (
          detail.trip.points.map((point, index) => <PointRow key={point.id} point={point} index={index} />)
        ) : (
          <EmptyMessage title="路线详情加载中" description="如果一直看不到点位，请刷新后端和移动端服务。" />
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>评论</Text>
          <Text style={styles.hintText}>{counts.comments} 条</Text>
        </View>
        <View style={styles.commentComposer}>
          <TextInput
            value={commentText}
            onChangeText={onChangeCommentText}
            placeholder="写一句评论"
            style={[styles.input, styles.commentInput]}
          />
          <Pressable style={styles.commentSendButton} onPress={onCreateComment}>
            <Text style={styles.commentSendText}>发送</Text>
          </Pressable>
        </View>
        {visibleComments.length ? (
          visibleComments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{comment.user.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.commentBody}>
                <Text style={styles.commentAuthor}>{comment.user.displayName}</Text>
                <Text style={styles.commentText}>{comment.content}</Text>
                <Text style={styles.hintText}>{formatDate(comment.createdAt)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyMessage title="暂无评论" description="成为第一个评论这条路线的人。" />
        )}
        {comments.length > 3 ? (
          <Pressable style={styles.expandButton} onPress={onToggleComments}>
            <Text style={styles.expandButtonText}>{commentsExpanded ? '收起评论' : '展开全部评论'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PostCard({
  post,
  detail,
  expanded = false,
  commentText = '',
  onOpen,
  onToggleLike,
  onToggleSave,
  onChangeCommentText,
  onCreateComment,
  selectedPointId,
  onSelectPoint,
}: {
  post: FeedItem;
  detail?: PostDetail;
  expanded?: boolean;
  commentText?: string;
  onOpen?: () => void;
  onToggleLike?: () => void;
  onToggleSave?: () => void;
  onChangeCommentText?: (value: string) => void;
  onCreateComment?: () => void;
  selectedPointId?: string | null;
  onSelectPoint?: (pointId: string) => void;
}) {
  const points = detail?.trip.routePreview ?? post.trip.routePreview ?? [];
  const counts = detail?.counts ?? post._count;
  const liked = detail?.viewerState?.liked ?? post.viewerState?.liked ?? false;
  const saved = detail?.viewerState?.saved ?? post.viewerState?.saved ?? false;
  const title = detail?.title ?? post.title;
  const summary = detail?.summary ?? post.summary;
  const cityName = detail?.cityName ?? post.cityName;
  const pointCount = detail?.pointCount ?? post.pointCount;
  const authorHandle = post.author.username ?? post.author.displayName;

  function handleMorePress() {
    Alert.alert('路线操作', title, [
      ...(onOpen ? [{ text: '查看详情', onPress: onOpen }] : []),
      ...(onToggleSave ? [{ text: saved ? '取消收藏' : '收藏路线', onPress: onToggleSave }] : []),
      { text: '取消', style: 'cancel' as const },
    ]);
  }

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Pressable style={styles.authorRow} onPress={onOpen}>
          <LinearGradient colors={['#0ea5e9', '#1d4ed8']} style={styles.avatarRing}>
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>{post.author.displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
          </LinearGradient>
          <View style={styles.authorCopy}>
            <Text style={styles.authorName}>{authorHandle}</Text>
            <Text style={styles.postLocation}>
              {cityName || 'TripIn'} · {formatDate(post.publishedAt)}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开路线操作菜单"
          hitSlop={10}
          style={styles.postMenuButton}
          onPress={handleMorePress}
        >
          <Text style={styles.postMenu}>•••</Text>
        </Pressable>
      </View>
      <RouteMediaViewer
        trip={detail?.trip}
        route={points}
        title={title}
        cityName={cityName}
        compact={!expanded}
        selectedPointId={selectedPointId}
        onSelectPoint={onSelectPoint}
      />
      <View style={styles.socialActionRow}>
        <Pressable style={styles.socialActionButton} onPress={onToggleLike}>
          <Text style={[styles.socialActionIcon, liked ? styles.socialActionIconActive : null]}>
            {liked ? '♥' : '♡'}
          </Text>
          <Text style={[styles.socialActionText, liked ? styles.socialActionTextActive : null]}>喜欢</Text>
        </Pressable>
        <Pressable style={styles.socialActionButton} onPress={onOpen}>
          <Text style={styles.socialActionIcon}>◌</Text>
          <Text style={styles.socialActionText}>评论</Text>
        </Pressable>
        <Pressable style={[styles.socialActionButton, styles.socialActionButtonLast]} onPress={onToggleSave}>
          <Text style={[styles.socialActionIcon, saved ? styles.socialActionIconActive : null]}>
            {saved ? '◆' : '◇'}
          </Text>
          <Text style={[styles.socialActionText, saved ? styles.socialActionTextActive : null]}>收藏</Text>
        </Pressable>
      </View>
      <Text style={styles.likeLine}>{counts.likes} 次喜欢</Text>
      <Pressable style={styles.captionBlock} onPress={onOpen}>
        <Text style={styles.captionLine}>
          <Text style={styles.captionAuthor}>{authorHandle}</Text>
          {summary ? ` ${summary}` : ` ${title}`}
        </Text>
      </Pressable>
      <View style={styles.routeStatsRow}>
        <Text style={styles.routeStat}>路线 · {pointCount} 个点位</Text>
        <Text style={styles.routeStat}>{counts.comments} 条评论</Text>
        <Text style={styles.routeStat}>{counts.saves} 次收藏</Text>
      </View>
      <Pressable style={styles.feedCommentTeaser} onPress={onOpen}>
        <Text style={styles.feedCommentTeaserText}>添加评论...</Text>
      </Pressable>
    </View>
  );
}
function AccountRow({
  title,
  meta,
  icon,
  danger = false,
  onPress,
}: {
  title: string;
  meta?: string;
  icon: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.accountRow} onPress={onPress}>
      <View style={[styles.accountIcon, danger ? styles.accountIconDanger : null]}>
        <Text style={[styles.accountIconText, danger ? styles.accountIconTextDanger : null]}>{icon}</Text>
      </View>
      <Text style={[styles.accountRowTitle, danger ? styles.accountRowDangerText : null]}>{title}</Text>
      {meta ? <Text style={styles.accountRowMeta}>{meta}</Text> : null}
      <Text style={styles.accountArrow}>›</Text>
    </Pressable>
  );
}

function AccountPanel({
  panel,
  user,
  profileForm,
  onChangeProfile,
  onSaveProfile,
  savedItems,
  publishedItems,
  trips,
  onOpenPost,
  onRemoveSaved,
  onGoStudio,
  onRefresh,
}: {
  panel: MePanel;
  user: UserSummary;
  profileForm: { displayName: string; username: string; bio: string };
  onChangeProfile: (value: { displayName: string; username: string; bio: string }) => void;
  onSaveProfile: () => void;
  savedItems: FeedItem[];
  publishedItems: FeedItem[];
  trips: Trip[];
  onOpenPost: (item: FeedItem) => void;
  onRemoveSaved: (postId: string) => void;
  onGoStudio: () => void;
  onRefresh: () => void;
}) {
  if (panel === 'profile') {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>个人资料</Text>
        <TextInput
          value={profileForm.displayName}
          onChangeText={(displayName) => onChangeProfile({ ...profileForm, displayName })}
          placeholder="昵称"
          style={styles.input}
        />
        <TextInput
          value={profileForm.username}
          onChangeText={(username) => onChangeProfile({ ...profileForm, username })}
          placeholder="用户名"
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          value={profileForm.bio}
          onChangeText={(bio) => onChangeProfile({ ...profileForm, bio })}
          placeholder="个人简介"
          multiline
          style={[styles.input, styles.textareaSmall]}
        />
        <Pressable style={styles.primaryButton} onPress={onSaveProfile}>
          <Text style={styles.primaryButtonText}>保存资料</Text>
        </Pressable>
      </View>
    );
  }

  if (panel === 'routes') {
    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>我的路线</Text>
          <Text style={styles.hintText}>{trips.length} 条</Text>
        </View>
        {trips.length ? (
          trips.map((trip) => (
            <View key={trip.id} style={styles.tripRow}>
              <Text style={styles.tripTitle}>{trip.title || '未命名路线'}</Text>
              <Text style={styles.hintText}>
                {trip.status === 'PUBLISHED' ? '已发布' : '草稿'} · {trip.pointCount ?? trip.points.length} 个点位
              </Text>
              {trip.summary ? <Text style={styles.pointNote}>{trip.summary}</Text> : null}
            </View>
          ))
        ) : (
          <EmptyMessage title="还没有路线" description="去工作台生成点位并发布后，这里会保存你的路线。" />
        )}
      </View>
    );
  }

  if (panel === 'posts') {
    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>我的发布</Text>
          <Text style={styles.hintText}>{publishedItems.length} 条</Text>
        </View>
        {publishedItems.length ? (
          publishedItems.map((item) => (
            <Pressable key={item.id} style={styles.compactPostRow} onPress={() => onOpenPost(item)}>
              <Text style={styles.tripTitle}>{item.title}</Text>
              <Text style={styles.hintText}>{item.pointCount} 点位 · {item._count.likes} 赞 · {item._count.comments} 评论</Text>
            </Pressable>
          ))
        ) : (
          <EmptyMessage title="还没有发布" description="去工作台发布一条路线后，这里会出现你的作品。" />
        )}
      </View>
    );
  }

  if (panel === 'favorites') {
    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>收藏</Text>
          <Text style={styles.hintText}>{savedItems.length} 条</Text>
        </View>
        {savedItems.length ? (
          savedItems.map((item) => (
            <View key={item.id} style={styles.favoriteRow}>
              <Pressable style={styles.favoriteMain} onPress={() => onOpenPost(item)}>
                <Text style={styles.tripTitle}>{item.title}</Text>
                <Text style={styles.hintText}>{item.author.displayName} · {item._count.likes} 赞 · {item._count.comments} 评论</Text>
              </Pressable>
              <Pressable style={styles.removeButton} onPress={() => onRemoveSaved(item.id)}>
                <Text style={styles.removeButtonText}>删除</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <EmptyMessage title="暂无收藏" description="在作品详情里点收藏后，会保存到这里。" />
        )}
      </View>
    );
  }

  if (panel === 'settings') {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>设置</Text>
        <AccountInfoLine label="当前账号" value={user.displayName} />
        <AccountInfoLine label="本地 API" value={API_BASE_URL} />
        <AccountInfoLine label="上传服务" value={WEB_BASE_URL} />
        <Pressable style={styles.secondaryButton} onPress={onRefresh}>
          <Text style={styles.secondaryButtonText}>刷新本地数据</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={onGoStudio}>
          <Text style={styles.primaryButtonText}>进入工作台</Text>
        </Pressable>
      </View>
    );
  }

  if (panel === 'overview') {
    return null;
  }

  const panelCopy: Record<Exclude<MePanel, 'overview' | 'profile' | 'routes' | 'posts' | 'favorites' | 'settings'>, {
    title: string;
    rows: Array<{ label: string; value: string }>;
  }> = {
    security: {
      title: '账号安全',
      rows: [
        { label: '账号 ID', value: user.id },
        { label: '登录方式', value: '本地调试账号' },
        { label: '状态', value: '已连接后端 API' },
      ],
    },
    privacy: {
      title: '隐私中心',
      rows: [
        { label: '定位权限', value: '由模拟器系统设置控制' },
        { label: '图片权限', value: '上传时按需申请' },
        { label: '公开内容', value: '仅发布后的路线进入主页' },
      ],
    },
    help: {
      title: '帮助与客服',
      rows: [
        { label: '启动后端', value: 'start-tripin.cmd' },
        { label: '启动移动端', value: 'start-mobile.cmd' },
        { label: '红屏处理', value: '保持 Metro 窗口开启后重载 App' },
      ],
    },
  };
  const content = panelCopy[panel];

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{content.title}</Text>
      {content.rows.map((row) => (
        <AccountInfoLine key={row.label} label={row.label} value={row.value} />
      ))}
    </View>
  );
}

function AccountInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PointRow({
  point,
  index,
  editable = false,
  onEdit,
  onDelete,
}: {
  point: TripPoint;
  index: number;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const firstImage = mediaUri(point.mediaAssets?.[0]);
  const temporary = isTemporaryPoint(point);
  return (
    <View style={styles.pointRow}>
      <View style={styles.pointIndex}>
        <Text style={styles.pointIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.pointInfo}>
        <View style={styles.pointTitleRow}>
          <Text style={styles.pointTitle}>{pointName(point, index)}</Text>
          {temporary ? (
            <View style={styles.tempBadge}>
              <Text style={styles.tempBadgeText}>临时</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.hintText}>{formatDate(point.startedAt)}</Text>
        {point.note ? <Text style={styles.pointNote}>{point.note}</Text> : null}
        {!hasUsableCoordinate(point) ? <Text style={styles.warningText}>缺少位置，暂不能形成路线</Text> : null}
      </View>
      {firstImage ? <Image source={{ uri: firstImage }} style={styles.pointImage} /> : null}
      {editable ? (
        <View style={styles.pointActions}>
          {onEdit ? (
            <Pressable accessibilityRole="button" style={styles.editPointButton} onPress={onEdit}>
              <Text style={styles.editPointText}>编</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable accessibilityRole="button" style={styles.deletePointButton} onPress={onDelete}>
              <Text style={styles.deletePointText}>删</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function EmptyMessage({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.hintText}>{description}</Text>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.hintText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#fbfcff',
  },
  body: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 44 : 18,
    paddingBottom: 118,
    gap: 16,
  },
  feedContent: {
    paddingTop: 6,
    paddingBottom: 118,
    backgroundColor: '#fbfcff',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 34 : 8,
    paddingBottom: 12,
  },
  feedBrand: {
    color: '#111827',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
  },
  feedSubtitle: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  headerGradientButton: {
    minHeight: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerGradientText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  storyRail: {
    flexDirection: 'row',
    gap: 15,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
  },
  storyItem: {
    width: 70,
    alignItems: 'center',
    gap: 6,
  },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: 55,
    height: 55,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7faff',
    borderWidth: 2,
    borderColor: '#fbfcff',
  },
  storyInitial: {
    color: '#1d4ed8',
    fontSize: 18,
    fontWeight: '900',
  },
  storyName: {
    width: '100%',
    color: '#344054',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pageHeader: {
    gap: 4,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  homeShortcut: {
    minWidth: 62,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  homeShortcutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  pageTitle: {
    color: '#101828',
    fontSize: 30,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
  },
  panel: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  mapPanel: {
    gap: 12,
    padding: 12,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e9ee',
    overflow: 'hidden',
  },
  mapFrame: {
    height: 260,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#dfe7ef',
  },
  nativeMap: {
    flex: 1,
  },
  mapBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#eef2ff',
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '900',
  },
  selectedLocationText: {
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ecfdf3',
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelTitle: {
    color: '#101828',
    fontSize: 18,
    fontWeight: '800',
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9dee7',
    backgroundColor: '#fff',
    color: '#101828',
    fontSize: 15,
  },
  textarea: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  textareaSmall: {
    minHeight: 64,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#eef1f5',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  publishButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#2563eb',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  postCard: {
    gap: 10,
    paddingVertical: 15,
    backgroundColor: '#fbfcff',
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf8',
  },
  cardOpenArea: {
    gap: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7faff',
    borderWidth: 2,
    borderColor: '#fbfcff',
  },
  smallAvatarText: {
    color: '#1d4ed8',
    fontWeight: '900',
  },
  authorCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  authorName: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '900',
  },
  postLocation: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  postMenu: {
    color: '#344054',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
  },
  postMenuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  postTitle: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 16,
  },
  postSummary: {
    color: '#475467',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  routeMediaViewer: {
    gap: 10,
  },
  viewerImageFrame: {
    height: 360,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#eef4ff',
    position: 'relative',
  },
  viewerImageFrameCompact: {
    height: 300,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  viewerRoutePanel: {
    gap: 8,
    paddingHorizontal: 0,
  },
  viewerRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
  },
  viewerRouteTitle: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '900',
  },
  viewerRouteHint: {
    flex: 1,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  carouselButton: {
    position: 'absolute',
    top: '42%',
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  carouselButtonLeft: {
    left: 10,
  },
  carouselButtonRight: {
    right: 10,
  },
  carouselButtonText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  imageCounterBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.76)',
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  photoStrip: {
    gap: 10,
    paddingRight: 4,
  },
  postPhoto: {
    width: 116,
    height: 116,
    borderRadius: 18,
    backgroundColor: '#eef1f5',
  },
  postPhotoLead: {
    width: 190,
  },
  generatedCover: {
    minHeight: 360,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    gap: 11,
    padding: 16,
    borderRadius: 0,
    backgroundColor: '#1d4ed8',
    position: 'relative',
  },
  generatedCoverCompact: {
    minHeight: 300,
  },
  generatedPhotoNoise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  generatedCoverKicker: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  generatedCoverTitle: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  generatedRouteMap: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  generatedCoverMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  generatedCoverMetaText: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f2f4f7',
    color: '#475467',
    fontSize: 12,
    fontWeight: '700',
  },
  metaPillActive: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  detailStack: {
    gap: 16,
  },
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTopTitle: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#f2f4f7',
  },
  actionButtonActive: {
    backgroundColor: '#111827',
  },
  actionButtonText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '900',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  socialActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  socialActionButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  socialActionButtonLast: {
    marginLeft: 'auto',
  },
  socialActionIcon: {
    color: '#101828',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  socialActionIconActive: {
    color: '#1d4ed8',
  },
  socialActionText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '800',
  },
  socialActionTextActive: {
    color: '#1d4ed8',
  },
  likeLine: {
    paddingHorizontal: 16,
    color: '#101828',
    fontSize: 14,
    fontWeight: '900',
  },
  captionBlock: {
    paddingHorizontal: 16,
  },
  captionLine: {
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 21,
  },
  captionAuthor: {
    color: '#101828',
    fontWeight: '900',
  },
  routeStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  routeStat: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  feedCommentTeaser: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  feedCommentTeaserText: {
    color: '#98a2b3',
    fontSize: 13,
    fontWeight: '700',
  },
  commentComposer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  commentInput: {
    flex: 1,
  },
  feedCommentInput: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: '#f3f7ff',
    borderColor: '#e4ecfb',
    fontSize: 14,
  },
  commentSendButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  commentSendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  commentAvatarText: {
    color: '#1e3a8a',
    fontWeight: '900',
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentAuthor: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '900',
  },
  commentText: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  expandButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
  },
  pointRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  pointIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  pointIndexText: {
    color: '#fff',
    fontWeight: '800',
  },
  pointInfo: {
    flex: 1,
    gap: 3,
  },
  pointTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  tempBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tempBadgeText: {
    color: '#c2410c',
    fontSize: 11,
    fontWeight: '900',
  },
  pointNote: {
    color: '#475467',
    fontSize: 13,
  },
  warningText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  pointImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#eef1f5',
  },
  pointActions: {
    gap: 8,
  },
  editPointButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  editPointText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '900',
  },
  deletePointButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  deletePointText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '900',
  },
  hintText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyBox: {
    gap: 6,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  emptyTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  textButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '800',
  },
  backButton: {
    alignSelf: 'flex-start',
    minWidth: 116,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    elevation: 4,
    zIndex: 20,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '900',
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  profileName: {
    color: '#101828',
    fontSize: 24,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  accountGroup: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  accountRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  accountIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f4f7',
  },
  accountIconDanger: {
    backgroundColor: '#fef2f2',
  },
  accountIconText: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '900',
  },
  accountIconTextDanger: {
    color: '#dc2626',
  },
  accountRowTitle: {
    flex: 1,
    color: '#101828',
    fontSize: 16,
    fontWeight: '900',
  },
  accountRowDangerText: {
    color: '#dc2626',
  },
  accountRowMeta: {
    color: '#98a2b3',
    fontSize: 13,
    fontWeight: '700',
  },
  accountArrow: {
    color: '#cbd5e1',
    fontSize: 24,
    lineHeight: 26,
  },
  statCard: {
    flex: 1,
    gap: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  statValue: {
    color: '#101828',
    fontSize: 22,
    fontWeight: '900',
  },
  tripRow: {
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  tripTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  compactPostRow: {
    gap: 5,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  favoriteMain: {
    flex: 1,
    gap: 5,
  },
  removeButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  removeButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '900',
  },
  infoLine: {
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  infoLabel: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(251,252,255,0.97)',
    borderWidth: 1,
    borderColor: '#d9e4fb',
    elevation: 18,
    zIndex: 100,
  },
  navButton: {
    minWidth: 88,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  navButtonActive: {
    backgroundColor: '#edf4ff',
  },
  navButtonText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '800',
  },
  navButtonTextActive: {
    color: '#1d4ed8',
  },
  plusButtonShell: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
  },
  homeButton: {
    width: 56,
  },
  homeButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  toast: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 92,
    padding: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  recordModal: {
    gap: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#fff',
  },
  publishPage: {
    gap: 14,
    padding: 18,
    paddingBottom: 36,
  },
  publishModal: {
    maxHeight: '86%',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#fff',
  },
  timeField: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '900',
  },
  previewBox: {
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef1f5',
  },
  publishPointList: {
    maxHeight: 230,
  },
  routeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef1f5',
  },
  routeEditRowDisabled: {
    opacity: 0.45,
  },
  smallActionButton: {
    minWidth: 54,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  smallActionText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '900',
  },
  closeText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '800',
  },
  uploadBox: {
    gap: 6,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#98a2b3',
    backgroundColor: '#f8fafc',
  },
  uploadTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '900',
  },
});
