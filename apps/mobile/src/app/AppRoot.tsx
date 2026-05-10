import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import type * as React from 'react';
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  LogBox,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const PRIMARY = '#1F4FE0';
const PRIMARY_TINT = '#E8EEFF';
const PRIMARY_DARK = '#1A3FB8';

// Instagram-inspired feed redesign tokens
const TINT = '#FF5C39';
const TINT_SOFT = '#FFE6DD';
const INK = '#0E0E0E';
const INK_SOFT = '#3A3A33';
const PAPER = '#FAFAF7';
const HAIRLINE = '#EBEBE5';
const MUTED = '#9A9A93';
const FONT_DISPLAY = 'BricolageGrotesque_700Bold';
const FONT_DISPLAY_MED = 'BricolageGrotesque_500Medium';
const FONT_BODY = 'PlusJakartaSans_400Regular';
const FONT_BODY_MED = 'PlusJakartaSans_500Medium';
const FONT_BODY_BOLD = 'PlusJakartaSans_700Bold';

import { DateTimePickerField } from '../components/DateTimePickerField';
import { RoutePreview } from '../components/RoutePreview';
import { createApiClient } from '../lib/api';
import { clearAuth, loadAuth, saveAuth } from '../lib/auth-storage';
import { TripinMapView } from '../native/TripinMapView';
import type { AuthResponse, FeedItem, MediaAsset, PlaceSearchResult, PostDetail, Trip, TripPoint, UserSummary } from '../types';

// EXPO_PUBLIC_API_HOST overrides the dev defaults at build/runtime time.
// For a Release APK pointing to the cloud, set it in apps/mobile/.env before building.
const API_HOST =
  (process.env.EXPO_PUBLIC_API_HOST ?? '').trim() ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');
const API_BASE_URL = `${API_HOST}/api/v1`;
// Uploaded media is served back as static files at /api/uploads/<...> by the same API.
// We previously had a separate Next.js Web service on port 3000 for this; uploads now
// go through the API directly, so we just need the API host + context path.
const WEB_BASE_URL = `${API_HOST}/api`;
const DEFAULT_USER_ID = 'demo-user';

type TabKey = 'record' | 'home' | 'studio' | 'me';
type AuthMode = 'login' | 'register';
type StudioPanel = 'overview' | 'create' | 'manage';
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

interface AuthorProfileState {
  user: UserSummary;
  posts: FeedItem[];
  loading: boolean;
}

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

type AuthForm = {
  identifier: string;
  email: string;
  username: string;
  displayName: string;
  password: string;
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

const initialPointEditForm: PointEditForm = {
  title: '',
  location: '',
  startedAt: new Date().toISOString().slice(0, 16),
  note: '',
};

const initialAuthForm: AuthForm = {
  identifier: 'demo-user',
  email: '',
  username: '',
  displayName: '',
  password: '',
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
    .filter(isPublishablePoint)
    .map(pointTimeMs)
    .filter((time) => time > 0)
    .sort((left, right) => left - right);

  return {
    start: times[0] ? toLocalInputValue(new Date(times[0]).toISOString()) : '',
    end: times.length ? toLocalInputValue(new Date(times[times.length - 1]).toISOString()) : '',
  };
}

function isPublishablePoint(point: TripPoint): boolean {
  // Publishable when the point either has a real coordinate, or the user has
  // confirmed it through the editor (sourceType=MANUAL). Auto temp points that
  // have never been touched still need a coordinate to count.
  return hasUsableCoordinate(point) || point.sourceType === 'MANUAL';
}

function pointsInTimeWindow(points: TripPoint[], start: string, end: string, excludedIds: string[]) {
  const parsedStart = start ? new Date(start).getTime() : Number.NaN;
  const parsedEnd = end ? new Date(end).getTime() : Number.NaN;
  const startTime = Number.isFinite(parsedStart) ? parsedStart : Number.NEGATIVE_INFINITY;
  const endTime = Number.isFinite(parsedEnd) ? parsedEnd + 59999 : Number.POSITIVE_INFINITY;
  const excluded = new Set(excludedIds);

  return points
    .filter(isPublishablePoint)
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
  return null;
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

async function getCurrentCoordinate(options?: { fast?: boolean }) {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return null;
    }

    // First: take whatever the OS already has cached. No accuracy filter — even
    // a 10-minute-old, 1km-accurate fix is still "where you are" for an instant
    // record. The user can correct it later in 完善点位.
    const cached = await Location.getLastKnownPositionAsync({ maxAge: 600_000 });
    if (cached) {
      return { latitude: cached.coords.latitude, longitude: cached.coords.longitude };
    }

    // Cold-start with no cache: ask the OS for a fresh fix. Balanced accuracy
    // uses WiFi + cell towers without waiting for GPS satellites, so this
    // usually returns within a few seconds. We give it 20s before giving up
    // (was 9s — too tight for cold-start indoors / weak signal).
    const location = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), options?.fast ? 20000 : 25000)),
    ]);

    if (!location) return null;

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

  // Java API exposes the upload endpoint at /v1/uploads under the /api context path.
  const response = await fetch(`${API_BASE_URL}/uploads`, {
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
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });
  const [sessionUserId, setSessionUserId] = useState<string | null>(DEFAULT_USER_ID);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const tokenRef = useRef<{ access: string | null; refresh: string | null }>({
    access: null,
    refresh: null,
  });
  useEffect(() => {
    tokenRef.current = { access: accessToken, refresh: refreshToken };
  }, [accessToken, refreshToken]);
  const apiRef = useRef<ReturnType<typeof createApiClient> | null>(null);
  const refreshingRef = useRef(false);
  const api = useMemo(() => {
    const client = createApiClient({
      baseUrl: API_BASE_URL,
      userId: sessionUserId ?? DEFAULT_USER_ID,
      getAuthToken: () => tokenRef.current.access,
      onUnauthorized: async () => {
        // Recursion guard: while a refresh is already in flight, additional 401s wait it out
        // (returning null means the original request gives up rather than retrying).
        if (refreshingRef.current) return null;
        const currentRefresh = tokenRef.current.refresh;
        const client = apiRef.current;
        if (!currentRefresh || !client) return null;
        refreshingRef.current = true;
        try {
          const result = await client.refreshTokens(currentRefresh);
          const newAccess = result.accessToken ?? null;
          const newRefresh = result.refreshToken ?? null;
          if (newAccess && newRefresh) {
            tokenRef.current = { access: newAccess, refresh: newRefresh };
            setAccessToken(newAccess);
            setRefreshToken(newRefresh);
            saveAuth({
              userId: result.user.id,
              accessToken: newAccess,
              refreshToken: newRefresh,
              accessExpiresAt: result.accessExpiresAt ?? null,
              refreshExpiresAt: result.refreshExpiresAt ?? null,
            });
            return newAccess;
          }
          return null;
        } catch {
          // Refresh itself failed (e.g. refresh expired or revoked) — drop the session.
          tokenRef.current = { access: null, refresh: null };
          setAccessToken(null);
          setRefreshToken(null);
          setSessionUserId(null);
          clearAuth();
          return null;
        } finally {
          refreshingRef.current = false;
        }
      },
    });
    apiRef.current = client;
    return client;
  }, [sessionUserId]);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [studioVisited, setStudioVisited] = useState(false);
  useEffect(() => {
    if (activeTab === 'studio' && !studioVisited) setStudioVisited(true);
  }, [activeTab, studioVisited]);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthForm>(initialAuthForm);
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [postDetails, setPostDetails] = useState<Record<string, PostDetail>>({});
  const [feedCommentTexts, setFeedCommentTexts] = useState<Record<string, string>>({});
  const [savedItems, setSavedItems] = useState<FeedItem[]>([]);
  const [publishedItems, setPublishedItems] = useState<FeedItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [draftTrip, setDraftTrip] = useState<Trip | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState('');
  const [mePanel, setMePanel] = useState<MePanel>('overview');
  const [studioPanel, setStudioPanel] = useState<StudioPanel>('overview');
  const [authorProfile, setAuthorProfile] = useState<AuthorProfileState | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: '', username: '', bio: '' });
  const [form, setForm] = useState<DraftForm>(initialForm);
  const [pickedImages, setPickedImages] = useState<LocalImage[]>([]);
  const [recordImages, setRecordImages] = useState<LocalImage[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<TripPoint | null>(null);
  const [pointEditForm, setPointEditForm] = useState<PointEditForm>(initialPointEditForm);
  const [pointEditCoordinate, setPointEditCoordinate] = useState<Coordinate | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinate | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStart, setPublishStart] = useState('');
  const [publishEnd, setPublishEnd] = useState('');
  const [excludedPublishPointIds, setExcludedPublishPointIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    LogBox.ignoreAllLogs(true);
    // Pre-warm location: as soon as the app launches, ask the OS for a fix in
    // the background. By the time the user taps "即时记录" the OS usually has
    // a cached position ready, so getLastKnownPositionAsync returns instantly.
    void Location.requestForegroundPermissionsAsync()
      .then((permission) => {
        if (!permission.granted) return;
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAuth().then((stored) => {
      if (cancelled || !stored) return;
      tokenRef.current = { access: stored.accessToken, refresh: stored.refreshToken };
      setAccessToken(stored.accessToken);
      setRefreshToken(stored.refreshToken);
      setSessionUserId(stored.userId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionUserId) {
      void refreshAll();
    } else {
      clearUserData();
      setLoading(false);
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!message) return undefined;

    // Longer messages (failure explanations like "20 秒内没拿到位置...") need
    // more time to read. Scale roughly 60ms/char, clamp to 3-8s.
    const ms = Math.min(8000, Math.max(3200, message.length * 60));
    const timeout = setTimeout(() => {
      setMessage('');
    }, ms);

    return () => clearTimeout(timeout);
  }, [message]);

  const backNavRef = useRef({
    publishOpen,
    recordOpen,
    editingPoint,
    selectedPost,
    mePanel,
    activeTab,
  });
  backNavRef.current = { publishOpen, recordOpen, editingPoint, selectedPost, mePanel, activeTab };

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const s = backNavRef.current;
      if (s.publishOpen) {
        setPublishOpen(false);
        return true;
      }
      if (s.recordOpen) {
        setRecordOpen(false);
        return true;
      }
      if (s.editingPoint) {
        setEditingPoint(null);
        setPointEditForm(initialPointEditForm);
        setPointEditCoordinate(null);
        return true;
      }
      if (s.selectedPost) {
        setSelectedPost(null);
        return true;
      }
      if (s.mePanel !== 'overview') {
        setMePanel('overview');
        return true;
      }
      if (s.activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, []);

  function goHome() {
    setSelectedPost(null);
    setMePanel('overview');
    setStudioPanel('overview');
    setAuthorProfile(null);
    setActiveTab('home');
  }

  function handleOpenAuthor(author: UserSummary) {
    if (currentUser && author.id === currentUser.id) {
      setSelectedPost(null);
      setAuthorProfile(null);
      setMePanel('overview');
      setActiveTab('me');
      return;
    }
    setAuthorProfile({ user: author, posts: [], loading: true });
    runTask(async () => {
      try {
        const [user, posts] = await Promise.all([
          api.getUser(author.id).catch(() => author),
          api.getUserPosts(author.id).catch(() => [] as FeedItem[]),
        ]);
        setAuthorProfile({ user, posts, loading: false });
      } catch (error) {
        setAuthorProfile({ user: author, posts: [], loading: false });
        setMessage(error instanceof Error ? error.message : '加载作者信息失败。');
      }
    });
  }

  function closeAuthorProfile() {
    setAuthorProfile(null);
  }

  function clearUserData() {
    setCurrentUser(null);
    setFeedItems([]);
    setPostDetails({});
    setFeedCommentTexts({});
    setSavedItems([]);
    setPublishedItems([]);
    setTrips([]);
    setDraftTrip(null);
    setSelectedPost(null);
    setExpandedComments({});
    setCommentText('');
    setMePanel('overview');
    setPickedImages([]);
    setRecordImages([]);
    setRecordOpen(false);
    setPublishOpen(false);
    setExcludedPublishPointIds([]);
    setStudioPanel('overview');
    setAuthorProfile(null);
    setActiveTab('home');
  }

  function handleLogout() {
    const currentRefresh = tokenRef.current.refresh;
    if (currentRefresh) {
      // Best-effort server-side revocation. Don't await — UI shouldn't wait on the network.
      void api.logout(currentRefresh).catch(() => undefined);
    }
    tokenRef.current = { access: null, refresh: null };
    setAccessToken(null);
    setRefreshToken(null);
    clearAuth();
    setSessionUserId(null);
    setAuthMode('login');
    setAuthForm((current) => ({
      ...initialAuthForm,
      identifier: current.identifier || current.username || DEFAULT_USER_ID,
    }));
    setMessage('已退出账号，可以登录其他账号测试。');
  }

  function applyAuthResult(result: AuthResponse) {
    setCurrentUser(result.user);
    if (result.accessToken && result.refreshToken) {
      tokenRef.current = { access: result.accessToken, refresh: result.refreshToken };
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      saveAuth({
        userId: result.user.id,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessExpiresAt: result.accessExpiresAt ?? null,
        refreshExpiresAt: result.refreshExpiresAt ?? null,
      });
    }
    setSessionUserId(result.sessionUserId);
  }

  function handleAuthSubmit() {
    const password = authForm.password.trim();
    if (!password) {
      setMessage('请输入密码。');
      return;
    }

    runTask(async () => {
      if (authMode === 'login') {
        const identifier = authForm.identifier.trim();
        if (!identifier) {
          setMessage('请输入用户名或邮箱。');
          return;
        }
        const result = await api.login({ identifier, password });
        applyAuthResult(result);
        setAuthForm((current) => ({ ...current, password: '' }));
        setMessage(`已登录：${result.user.displayName}`);
        return;
      }

      const username = authForm.username.trim();
      const displayName = authForm.displayName.trim();
      if (!username || !displayName) {
        setMessage('注册需要用户名和昵称。');
        return;
      }
      const result = await api.register({
        email: authForm.email.trim() || undefined,
        username,
        displayName,
        password,
      });
      applyAuthResult(result);
      setAuthForm({ ...initialAuthForm, identifier: result.user.username || username });
      setMessage(`已注册并登录：${result.user.displayName}`);
    });
  }

  async function refreshAll(targetTripId?: string) {
    if (!sessionUserId) {
      setLoading(false);
      return;
    }

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
    return Promise.all(
      images.map(async (image) => {
        const uploaded = await uploadImageToWeb(image);
        const created = await api.createMediaAsset({
          originalName: uploaded.originalName,
          mimeType: uploaded.mimeType,
          bytes: uploaded.bytes,
          tripId: trip.id,
        });
        return (await api.markMediaReady(created.id, uploaded.storageKey)) as MediaAsset;
      }),
    );
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

  function handleSearchPlaces() {
    const keyword = placeSearchQuery.trim();
    if (!keyword) {
      setMessage('先输入要搜索的地点。');
      return;
    }
    setPlaceSearchLoading(true);
    runTask(async () => {
      try {
        const results = await api.searchPlaces({ keyword, limit: 10 });
        setPlaceSearchResults(results);
        if (!results.length) {
          setMessage('没找到匹配的地点，换个关键词试试。');
        }
      } catch (error) {
        setPlaceSearchResults([]);
        setMessage(error instanceof Error ? error.message : '搜索地点失败。');
      } finally {
        setPlaceSearchLoading(false);
      }
    });
  }

  function handleSelectPlaceFromSearch(place: PlaceSearchResult) {
    const lat = numericCoordinate(place.latitude);
    const lng = numericCoordinate(place.longitude);
    if (lat === null || lng === null) {
      setMessage('该地点缺少坐标，无法定位。');
      return;
    }
    setSelectedCoordinate({ latitude: lat, longitude: lng });
    setForm((current) => ({ ...current, pointLocation: place.name }));
    setPlaceSearchResults([]);
    setPlaceSearchQuery('');
    setMessage(`已定位到：${place.name}`);
  }

  function handleMapPress(payload: {
    latitude: number;
    longitude: number;
    address?: string;
    cityName?: string;
    districtName?: string;
    provinceName?: string;
  }) {
    const coordinate: Coordinate = {
      latitude: payload.latitude,
      longitude: payload.longitude,
    };
    setSelectedCoordinate(coordinate);

    // Build a friendly name from whatever the WebView's reverse-geocoder returned.
    // Order: full address > city+district > city > district > province > coords.
    const cityDistrict = [payload.cityName, payload.districtName]
      .filter((s) => Boolean(s && s.trim()))
      .join(' ');
    const fromWebView =
      (payload.address && payload.address.trim()) ||
      (cityDistrict.trim()) ||
      (payload.cityName && payload.cityName.trim()) ||
      (payload.districtName && payload.districtName.trim()) ||
      (payload.provinceName && payload.provinceName.trim()) ||
      '';

    if (fromWebView) {
      setForm((current) => ({ ...current, pointLocation: fromWebView }));
      setMessage(`已选中：${fromWebView}`);
      return;
    }

    // WebView didn't give us a name (no Geocoder plugin / failed). Try backend.
    setForm((current) => ({
      ...current,
      pointLocation: `定位中... (${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`,
    }));
    setMessage('已选中地图位置，正在查询地名…');
    runTask(async () => {
      try {
        const result = await api.reverseGeocode({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        });
        const fallbackCityDistrict = [result.cityName, result.districtName]
          .filter((s) => Boolean(s && s.trim()))
          .join(' ');
        const name =
          result.recommendedPlace?.name?.trim() ||
          result.formattedAddress?.trim() ||
          fallbackCityDistrict ||
          result.cityName?.trim() ||
          result.districtName?.trim() ||
          result.provinceName?.trim() ||
          `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;
        setForm((current) => ({ ...current, pointLocation: name }));
        setMessage(`已选中：${name}`);
      } catch {
        setForm((current) => ({
          ...current,
          pointLocation: `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`,
        }));
        setMessage('暂无法解析地名，已填入经纬度，可手动改写。');
      }
    });
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
        // Any save through the editor counts as "user-confirmed", which makes
        // the point eligible for publish even without a coordinate. This lets
        // the user finalize a temp point by just renaming or noting it.
        sourceType: 'MANUAL',
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
      if (!trip.points.some(isPublishablePoint)) {
        Alert.alert('还不能发布', '至少需要一个有坐标或已确认过的点位才能发布。');
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

  function handleToggleLike(postId: string) {
    const detail = postDetails[postId];
    const feedItem = feedItems.find((item) => item.id === postId);
    const liked = detail?.viewerState?.liked ?? feedItem?.viewerState?.liked ?? false;

    runTask(async () => {
      const result = liked ? await api.unlikePost(postId) : await api.likePost(postId);
      mergeInteractionState(postId, result.counts, result.viewerState);
    });
  }

  function handleToggleSave(postId: string) {
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

  function bumpCommentCount(postId: string, comment: { id: string; content: string; createdAt: string; user: UserSummary }) {
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
    const bump = (item: FeedItem) =>
      item.id === postId
        ? { ...item, _count: { ...item._count, comments: item._count.comments + 1 } }
        : item;
    setFeedItems((items) => items.map(bump));
    setSavedItems((items) => items.map(bump));
    setPublishedItems((items) => items.map(bump));
  }

  function handleCreateComment(postId: string) {
    const content = commentText.trim();
    if (!content) {
      setMessage('先输入评论内容。');
      return;
    }

    runTask(async () => {
      const comment = await api.createComment(postId, content);
      bumpCommentCount(postId, comment);
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

    runTask(async () => {
      const comment = await api.createComment(postId, content);
      bumpCommentCount(postId, comment);
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
    const images = recordImages;
    setRecordImages([]);
    setRecordOpen(false);
    runTask(async () => {
      // Step 1: explicit permission check, with a clear message if it's denied.
      // Avoid the silent "no location, save anyway" outcome when the underlying
      // problem is just the user never tapped Allow.
      setMessage('检查位置权限...');
      const permission = await Location.requestForegroundPermissionsAsync().catch(() => ({
        granted: false,
        canAskAgain: false,
      }));

      // Step 2: actually try to get a fix — wait long enough for cold-start GPS.
      // Cached first (instant), then fresh fix (up to 20s). The user clicked
      // a button labelled "获取位置并生成", so they expect us to try hard.
      let coordinate: Coordinate | null = null;
      let locationFailureReason: string | null = null;
      let locationSource: 'gps' | 'ip' | null = null;
      let locationLabelHuman: string | null = null;

      if (!permission.granted) {
        locationFailureReason = permission.canAskAgain
          ? '没有位置权限。到系统设置 → 应用 → Tripin → 权限里允许后再试。'
          : '位置权限被拒。系统设置 → 应用 → Tripin → 权限 → 位置 → 允许。';
      } else {
        setMessage('正在获取位置...');
        try {
          // Try OS cache first.
          const cached = await Location.getLastKnownPositionAsync({ maxAge: 600_000 });
          if (cached) {
            coordinate = { latitude: cached.coords.latitude, longitude: cached.coords.longitude };
            locationSource = 'gps';
          } else {
            // Cold-start: wait up to 20s for a real fix. We only fall back
            // to "no location" after this actually times out.
            const fresh = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000)),
            ]);
            if (fresh) {
              coordinate = { latitude: fresh.coords.latitude, longitude: fresh.coords.longitude };
              locationSource = 'gps';
            } else {
              locationFailureReason = '20 秒内没拿到位置（GPS 还没锁星）。';
            }
          }
        } catch (err) {
          // expo-location uses Google Play Services on Android. On Huawei /
          // HMS-only devices it throws "SERVICE_INVALID". Fall through to IP
          // geolocation so the user still gets at least a city-level point.
          locationFailureReason =
            err instanceof Error ? `系统定位不可用：${err.message}` : '系统定位不可用。';
        }

        // Fallback: if device-side location didn't work, ask the backend for an
        // IP-based fix. Accuracy is only city-level but it's better than nothing
        // and works on any device with internet (no GMS / HMS required).
        if (!coordinate) {
          setMessage('设备定位失败，使用 IP 定位中…');
          try {
            const ipResult = await api.getIpLocation();
            if (
              typeof ipResult.latitude === 'number' &&
              typeof ipResult.longitude === 'number'
            ) {
              coordinate = { latitude: ipResult.latitude, longitude: ipResult.longitude };
              locationSource = 'ip';
              locationLabelHuman = ipResult.formattedAddress || ipResult.cityName || '当前城市';
              locationFailureReason = null;
            }
          } catch {
            // keep the original failure reason
          }
        }
      }

      // Step 3: now do the actual server side (draft, media, point creation).
      setMessage(coordinate ? '保存点位中...' : '保存中（无位置）...');
      const trip = await ensureDraft();
      const medias = images.length ? await createMediaAssets(trip, images) : [];
      // For IP-based fallback, prefer the readable place name over raw coords.
      const locationLabel = coordinate
        ? (locationSource === 'ip' && locationLabelHuman
            ? locationLabelHuman
            : `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`)
        : undefined;
      const noteByPath =
        locationSource === 'gps'
          ? '临时点位，来自即时记录，请及时完善信息。'
          : locationSource === 'ip'
            ? '临时点位，来自即时记录（IP 粗略定位），请到完善点位里改成具体地点。'
            : '临时点位，来自即时记录，待补充位置。';
      const updated = await api.createTripPoint(trip.id, {
        title: `临时点位 ${trip.points.length + 1}`,
        customPlaceName: locationLabel,
        note: noteByPath,
        startedAt: new Date().toISOString(),
        latitude: coordinate?.latitude,
        longitude: coordinate?.longitude,
        sourceType: 'AUTO',
        mediaAssetIds: medias.map((media) => media.id),
      });
      setDraftTrip(updated);
      setTrips((current) => {
        const exists = current.some((t) => t.id === updated.id);
        return exists ? current.map((t) => (t.id === updated.id ? updated : t)) : [updated, ...current];
      });

      if (coordinate && locationSource === 'gps') {
        setMessage(`已记录位置 ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}。`);
      } else if (coordinate && locationSource === 'ip') {
        setMessage(`已用 IP 大致定位到 ${locationLabelHuman ?? '当前城市'}。精确位置可在"完善点位"里改。`);
      } else {
        setMessage(locationFailureReason ?? '已记录，位置稍后到点位管理里补充。');
      }
    });
  }

  function renderAuth() {
    const isLogin = authMode === 'login';
    return (
      <ScrollView contentContainerStyle={[styles.screenContent, styles.authScreen]} keyboardShouldPersistTaps="handled">
        <View style={styles.authHero}>
          <Text style={styles.authKicker}>TripIn 调试登录</Text>
          <Text style={styles.authTitle}>{isLogin ? '登录其他账号' : '注册新账号'}</Text>
          <Text style={styles.pageSubtitle}>
            登录后，首页、收藏、评论和工作台都会切换到对应用户，方便测试多用户效果。
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.authModeRow}>
            <Pressable
              style={[styles.authModeButton, isLogin ? styles.authModeButtonActive : null]}
              onPress={() => setAuthMode('login')}
            >
              <Text style={[styles.authModeText, isLogin ? styles.authModeTextActive : null]}>登录</Text>
            </Pressable>
            <Pressable
              style={[styles.authModeButton, !isLogin ? styles.authModeButtonActive : null]}
              onPress={() => setAuthMode('register')}
            >
              <Text style={[styles.authModeText, !isLogin ? styles.authModeTextActive : null]}>注册</Text>
            </Pressable>
          </View>

          {isLogin ? (
            <TextInput
              value={authForm.identifier}
              onChangeText={(identifier) => setAuthForm((current) => ({ ...current, identifier }))}
              placeholder="用户名或邮箱"
              autoCapitalize="none"
              style={styles.input}
            />
          ) : (
            <>
              <TextInput
                value={authForm.username}
                onChangeText={(username) => setAuthForm((current) => ({ ...current, username }))}
                placeholder="用户名，例如 user-a"
                autoCapitalize="none"
                style={styles.input}
              />
              <TextInput
                value={authForm.displayName}
                onChangeText={(displayName) => setAuthForm((current) => ({ ...current, displayName }))}
                placeholder="昵称，例如 用户A"
                style={styles.input}
              />
              <TextInput
                value={authForm.email}
                onChangeText={(email) => setAuthForm((current) => ({ ...current, email }))}
                placeholder="邮箱，可不填"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </>
          )}

          <TextInput
            value={authForm.password}
            onChangeText={(password) => setAuthForm((current) => ({ ...current, password }))}
            placeholder="密码"
            secureTextEntry
            style={styles.input}
          />

          <Pressable style={styles.primaryButtonWide} onPress={handleAuthSubmit}>
            <Text style={styles.primaryButtonText}>{isPending ? '处理中...' : isLogin ? '登录' : '注册并登录'}</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButtonWide}
            onPress={() => {
              tokenRef.current = { access: null, refresh: null };
              setAccessToken(null);
              setRefreshToken(null);
              clearAuth();
              setSessionUserId(DEFAULT_USER_ID);
              setAuthForm(initialAuthForm);
              setMessage('已切回 Demo User。');
            }}
          >
            <Text style={styles.secondaryButtonText}>使用 Demo User</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderHome() {
    if (selectedPost) {
      return (
        <View style={styles.flex1}>
          <ScrollView
            contentContainerStyle={[styles.screenContent, styles.screenContentWithFloating]}
            keyboardShouldPersistTaps="handled"
          >
            <PostDetailView
              post={selectedPost}
              detail={postDetails[selectedPost.id]}
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
              onOpenAuthor={handleOpenAuthor}
            />
          </ScrollView>
          <BackButton label="返回首页" onPress={() => setSelectedPost(null)} />
        </View>
      );
    }

    if (authorProfile) {
      return (
        <View style={styles.flex1}>
          <ScrollView
            contentContainerStyle={[styles.screenContent, styles.screenContentWithFloating]}
            keyboardShouldPersistTaps="handled"
          >
            <AuthorProfileView
              state={authorProfile}
              onOpenPost={(post) => {
                setSelectedPost(post);
                setAuthorProfile(null);
              }}
            />
          </ScrollView>
          <BackButton label="返回首页" onPress={closeAuthorProfile} />
        </View>
      );
    }

    return (
      <View style={styles.feedRoot}>
        <FeedTopBar />
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedScrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refreshAll()}
              tintColor={TINT}
              colors={[TINT]}
            />
          }
        >
          {feedItems.length ? (
            feedItems.map((item, index) => (
              <PostCard
                key={item.id}
                post={item}
                detail={postDetails[item.id]}
                commentText={feedCommentTexts[item.id] ?? ''}
                isFirst={index === 0}
                onOpen={() => setSelectedPost(item)}
                onToggleLike={() => handleToggleLike(item.id)}
                onToggleSave={() => handleToggleSave(item.id)}
                onChangeCommentText={(value) =>
                  setFeedCommentTexts((current) => ({ ...current, [item.id]: value }))
                }
                onCreateComment={() => handleCreateFeedComment(item.id)}
                onOpenAuthor={handleOpenAuthor}
              />
            ))
          ) : (
            <View style={styles.feedEmpty}>
              <Text style={styles.feedEmptyTitle}>还没有路线</Text>
              <Text style={styles.feedEmptyBody}>
                发布第一条路线，这里就会出现你和朋友的真实出行轨迹。
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  function renderStudio() {
    const points = draftTrip?.points ?? [];
    const usablePoints = points.filter(isPublishablePoint);
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

    if (studioPanel === 'overview') {
      return (
        <View style={styles.flex1}>
          <ScrollView
            contentContainerStyle={[styles.screenContent, styles.screenContentWithFloating]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>工作台</Text>
              <Text style={styles.pageSubtitle}>选择一个操作开始：先创建点位，再整理路线，最后发布作品。</Text>
            </View>

            <StudioEntryCard
              title="点位创建"
              description="在地图上选位、上传图片、生成新的点位。"
              meta={`已生成 ${points.length} 个点位${usablePoints.length ? `（${usablePoints.length} 个带坐标）` : ''}`}
              actionLabel="开始创建"
              onPress={() => setStudioPanel('create')}
            />
            <StudioEntryCard
              title="发布作品"
              description="选择时间段和点位，把当前路线发布到首页。"
              meta={
                usablePoints.length
                  ? `当前有 ${usablePoints.length} 个可发布点位`
                  : '至少需要 1 个带坐标的点位'
              }
              actionLabel="去发布"
              disabled={!usablePoints.length}
              onPress={() => {
                if (!usablePoints.length) {
                  setMessage('至少需要一个带位置的点位才能发布。');
                  return;
                }
                handlePublish();
              }}
            />
            <StudioEntryCard
              title="点位管理"
              description="查看、编辑或删除已生成的点位。"
              meta={`共 ${points.length} 个点位`}
              actionLabel="去管理"
              onPress={() => setStudioPanel('manage')}
            />
          </ScrollView>
          <BackButton label="返回首页" onPress={goHome} />
        </View>
      );
    }

    if (studioPanel === 'create') {
      return (
        <View style={styles.flex1}>
          <ScrollView
            contentContainerStyle={[styles.screenContent, styles.screenContentWithFloating]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>点位创建</Text>
              <Text style={styles.pageSubtitle}>在地图上选位，填写信息，生成新的点位。</Text>
            </View>

            <View style={styles.mapPanel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelTitle}>地图</Text>
                  <Text style={styles.hintText}>生成点位后会在这里形成路线</Text>
                </View>
                <Text style={styles.mapBadge}>{mapMarkers.length} 点</Text>
              </View>

              <View style={styles.placeSearchRow}>
                <TextInput
                  value={placeSearchQuery}
                  onChangeText={setPlaceSearchQuery}
                  placeholder="搜索地点（POI、景点、地址…）"
                  style={[styles.input, styles.placeSearchInput]}
                  onSubmitEditing={handleSearchPlaces}
                  returnKeyType="search"
                />
                <Pressable
                  style={styles.placeSearchButton}
                  onPress={handleSearchPlaces}
                  accessibilityRole="button"
                >
                  <Text style={styles.placeSearchButtonText}>
                    {placeSearchLoading ? '搜索中…' : '搜索'}
                  </Text>
                </Pressable>
              </View>

              {placeSearchResults.length ? (
                <View style={styles.placeSearchList}>
                  {placeSearchResults.map((place, index) => {
                    const key = `${place.provider}-${place.providerId ?? place.id ?? place.name}-${index}`;
                    return (
                      <Pressable
                        key={key}
                        style={styles.placeSearchItem}
                        onPress={() => handleSelectPlaceFromSearch(place)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.placeSearchItemTitle} numberOfLines={1}>
                          {place.name}
                        </Text>
                        <Text style={styles.placeSearchItemMeta} numberOfLines={2}>
                          {place.formattedAddress
                            || [place.cityName, place.districtName].filter(Boolean).join(' ')
                            || '无地址信息'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.mapFrame}>
                <TripinMapView
                  style={styles.nativeMap}
                  markers={mapMarkers}
                  polylines={mapPolylines}
                  onMapPress={handleMapPress}
                />
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>生成点位</Text>
              <TextInput
                value={form.pointLocation}
                onChangeText={(pointLocation) => {
                  setForm((current) => ({ ...current, pointLocation }));
                  // If the user clears the field, drop any map-tap coordinate too.
                  // If they type lat/lng, parse and use it.
                  // Otherwise keep the existing selectedCoordinate (e.g. from a map tap).
                  if (!pointLocation.trim()) {
                    setSelectedCoordinate(null);
                  } else {
                    const fromText = coordinateFromText(pointLocation);
                    if (fromText) {
                      setSelectedCoordinate(fromText);
                    }
                  }
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
          </ScrollView>
          <BackButton label="返回工作台" onPress={() => setStudioPanel('overview')} />
        </View>
      );
    }

    return (
      <View style={styles.flex1}>
        <ScrollView
          contentContainerStyle={[styles.screenContent, styles.screenContentWithFloating]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>点位管理</Text>
            <Text style={styles.pageSubtitle}>查看、编辑或删除已生成的点位。</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>全部点位</Text>
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
              <EmptyMessage
                title="还没有点位"
                description="先去『点位创建』生成点位，或从『即时记录』添加临时点位。"
              />
            )}
          </View>
        </ScrollView>
        <BackButton label="返回工作台" onPress={() => setStudioPanel('overview')} />
      </View>
    );
  }

  function renderMe() {
    const draftCount = trips.filter((trip) => trip.status === 'DRAFT').length;
    const publishedCount = trips.filter((trip) => trip.status === 'PUBLISHED').length;
    const displayUser = currentUser ?? {
      id: sessionUserId ?? DEFAULT_USER_ID,
      displayName: 'Demo User',
      username: 'demo-user',
      bio: '',
    };

    if (mePanel !== 'overview') {
      return (
        <View style={styles.flex1}>
          <ScrollView
            contentContainerStyle={[styles.screenContent, styles.screenContentWithFloating]}
            keyboardShouldPersistTaps="handled"
          >
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
              setStudioPanel('overview');
              setActiveTab('studio');
            }}
            onRefresh={() => void refreshAll()}
          />
          </ScrollView>
          <BackButton label="返回个人信息" onPress={() => setMePanel('overview')} />
        </View>
      );
    }

    return (
      <View style={styles.flex1}>
        <ScrollView
          contentContainerStyle={[styles.screenContent, styles.screenContentWithFloating]}
          keyboardShouldPersistTaps="handled"
        >
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
          <AccountRow title="个人信息" meta="编辑资料" icon="person-outline" onPress={() => setMePanel('profile')} />
          <AccountRow title="我的路线" meta={`${trips.length} 条`} icon="git-network-outline" onPress={() => setMePanel('routes')} />
          <AccountRow title="我的发布" meta={`${publishedItems.length} 条`} icon="map-outline" onPress={() => setMePanel('posts')} />
          <AccountRow title="收藏" meta={`${savedItems.length} 条`} icon="bookmark-outline" onPress={() => setMePanel('favorites')} />
          <AccountRow
            title="退出账号"
            meta="切换到登录页"
            icon="log-out-outline"
            danger
            onPress={handleLogout}
          />
        </View>

        </ScrollView>
        <BackButton label="返回首页" onPress={goHome} />
      </View>
    );
  }

  const publishWindowPoints = pointsInTimeWindow(draftTrip?.points ?? [], publishStart, publishEnd, []);
  const publishPreviewPoints = pointsInTimeWindow(
    draftTrip?.points ?? [],
    publishStart,
    publishEnd,
    excludedPublishPointIds,
  );

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.app, { backgroundColor: PAPER }]}>
        <StatusBar style="dark" />
        <View style={styles.centerState}>
          <ActivityIndicator color={TINT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      {!sessionUserId ? (
        renderAuth()
      ) : loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator />
          <Text style={styles.hintText}>正在连接本地服务...</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {activeTab === 'home' ? renderHome() : null}
          {studioVisited ? (
            <View style={activeTab === 'studio' ? styles.tabPaneActive : styles.tabPaneHidden}>
              {renderStudio()}
            </View>
          ) : null}
          {activeTab === 'me' ? renderMe() : null}
        </View>
      )}

      {message ? <Text style={styles.toast}>{message}</Text> : null}

      {sessionUserId ? <View style={styles.bottomBar}>
        <TabButton label="即时记录" active={activeTab === 'record'} onPress={() => setRecordOpen(true)} />
        <Pressable
          style={[styles.plusButton, activeTab === 'studio' ? styles.homeButton : null]}
          hitSlop={18}
          onPressIn={() => {
            if (activeTab === 'studio') {
              goHome();
            } else {
              setSelectedPost(null);
              setMePanel('overview');
              setStudioPanel('overview');
              setAuthorProfile(null);
              setActiveTab('studio');
            }
          }}
        >
          <Text style={[styles.plusText, activeTab === 'studio' ? styles.homeButtonText : null]}>
            {activeTab === 'studio' ? '首页' : '＋'}
          </Text>
        </Pressable>
        <TabButton label="个人信息" active={activeTab === 'me'} onPress={() => setActiveTab('me')} />
      </View> : null}
      </KeyboardAvoidingView>

      <Modal visible={publishOpen} animationType="slide" onRequestClose={() => setPublishOpen(false)}>
        <SafeAreaView style={styles.app}>
          <ScrollView
            contentContainerStyle={[styles.publishPage, styles.publishPageWithFloating]}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text style={styles.panelTitle}>发布作品</Text>
              <Text style={styles.hintText}>填写作品信息，选择时间段，确认本次要发布的路线。</Text>
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
              <DateTimePickerField label="开始" value={publishStart} onChange={setPublishStart} />
              <DateTimePickerField label="结束" value={publishEnd} onChange={setPublishEnd} />
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
          <BackButton label="关闭发布" onPress={() => setPublishOpen(false)} />
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
            <Pressable style={styles.primaryButton} onPress={handleSavePointEdit}>
              <Text style={styles.primaryButtonText}>{isPending ? '保存中...' : '保存点位'}</Text>
            </Pressable>
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

function BackButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      style={styles.backButtonFloating}
      onPress={onPress}
      hitSlop={12}
    >
      <Ionicons name="chevron-back" size={22} color="#101828" />
    </Pressable>
  );
}

function AppCover() {
  return (
    <View style={styles.appCover}>
      <View style={styles.coverMapLine}>
        <View style={[styles.coverDot, styles.coverDotStart]}>
          <Text style={styles.coverDotText}>起</Text>
        </View>
        <View style={[styles.coverDot, styles.coverDotMid]}>
          <Text style={styles.coverDotText}>2</Text>
        </View>
        <View style={[styles.coverDot, styles.coverDotEnd]}>
          <Text style={styles.coverDotText}>终</Text>
        </View>
      </View>
      <View style={styles.coverCopy}>
        <Text style={styles.coverKicker}>TripIn Route Journal</Text>
        <Text style={styles.coverTitle}>把路上的点，连成一段可分享的生活路线。</Text>
      </View>
    </View>
  );
}

function GeneratedRouteCover({ title, cityName }: { title: string; cityName?: string | null }) {
  return (
    <View style={styles.generatedCover}>
      <View style={styles.generatedCoverLine} />
      <View style={[styles.generatedCoverPin, styles.generatedCoverPinStart]}>
        <Text style={styles.generatedCoverPinText}>1</Text>
      </View>
      <View style={[styles.generatedCoverPin, styles.generatedCoverPinEnd]}>
        <Text style={styles.generatedCoverPinText}>终</Text>
      </View>
      <Text style={styles.generatedCoverKicker}>{cityName || 'TripIn 路线封面'}</Text>
      <Text style={styles.generatedCoverTitle}>{title || '未命名路线'}</Text>
    </View>
  );
}

function mercatorY(latitude: number) {
  const lat = Math.max(-85, Math.min(85, latitude));
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

type RouteBbox = { minLat: number; maxLat: number; minLng: number; maxLng: number };

function computeBbox(route: NonNullable<Trip['routePreview']>): RouteBbox {
  const lats = route.map((p) => p.latitude);
  const lngs = route.map((p) => p.longitude);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

// Independent X/Y normalization — points fill both axes regardless of real aspect
function projectBboxFill(latitude: number, longitude: number, bbox: RouteBbox, width: number, height: number) {
  const padX = width * 0.12;
  const padY = height * 0.18;
  const usableW = width - 2 * padX;
  const usableH = height - 2 * padY;
  const lngRange = bbox.maxLng - bbox.minLng;
  const latRange = bbox.maxLat - bbox.minLat;
  const xRatio = lngRange > 1e-6 ? (longitude - bbox.minLng) / lngRange : 0.5;
  const yRatio = latRange > 1e-6 ? 1 - (latitude - bbox.minLat) / latRange : 0.5;
  return { x: padX + xRatio * usableW, y: padY + yRatio * usableH };
}

function buildStaticMapUrl(route: NonNullable<Trip['routePreview']>) {
  if (route.length < 2) return null;
  const bbox = computeBbox(route);
  const centerLng = (bbox.minLng + bbox.maxLng) / 2;
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  // Pick zoom that keeps bbox inside a 720x360 web-mercator view; the rendered <Image>
  // will then be `stretch`'d to whatever container aspect we want.
  const lngSpan = Math.max(0.0005, bbox.maxLng - bbox.minLng);
  const mercSpan = Math.max(0.0005, Math.abs(mercatorY(bbox.maxLat) - mercatorY(bbox.minLat)));
  const zoomLng = Math.log2((720 * 0.85 * 360) / (256 * lngSpan));
  const zoomLat = Math.log2((360 * 0.85 * 2 * Math.PI) / (256 * mercSpan));
  const zoom = Math.max(3, Math.min(17, Math.floor(Math.min(zoomLng, zoomLat))));
  const params = new URLSearchParams({
    provider: 'stadia',
    style: 'watercolor',
    v: '3',
    width: '720',
    height: '360',
    centerLng: centerLng.toFixed(6),
    centerLat: centerLat.toFixed(6),
    zoom: String(zoom),
  });
  return `${API_BASE_URL}/places/static-map?${params.toString()}`;
}

function RouteMediaViewer({
  trip,
  route,
  title,
  cityName,
  edgeToEdge = false,
}: {
  trip?: Trip | null;
  route: NonNullable<Trip['routePreview']>;
  title: string;
  cityName?: string | null;
  edgeToEdge?: boolean;
}) {
  const imageEntries = collectTripImageEntries(trip);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const safeImageIndex = imageEntries.length ? Math.min(activeImageIndex, imageEntries.length - 1) : 0;
  const activeImage = imageEntries[safeImageIndex];
  const activePointId = selectedPointId ?? activeImage?.pointId ?? route[0]?.pointId ?? null;

  function showImage(nextIndex: number) {
    if (!imageEntries.length) return;
    const normalizedIndex = (nextIndex + imageEntries.length) % imageEntries.length;
    const nextImage = imageEntries[normalizedIndex];
    setActiveImageIndex(normalizedIndex);
    setSelectedPointId(nextImage.pointId);
  }

  function handlePointPress(pointId: string) {
    setSelectedPointId(pointId);
    const firstImageIndex = imageEntries.findIndex((entry) => entry.pointId === pointId);
    if (firstImageIndex >= 0) {
      setActiveImageIndex(firstImageIndex);
    }
  }

  const imageFrameStyle = edgeToEdge ? styles.viewerImageFrameFlat : styles.viewerImageFrame;
  const routeFrameStyle = edgeToEdge ? styles.routeMapEdge : styles.routeMapInset;
  const staticMapUrl = useMemo(() => buildStaticMapUrl(route), [route]);
  const bbox = useMemo(() => (route.length >= 2 ? computeBbox(route) : null), [route]);
  const [staticMapFailed, setStaticMapFailed] = useState(false);
  const [renderedSize, setRenderedSize] = useState({ width: 360, height: 150 });
  useEffect(() => {
    setStaticMapFailed(false);
  }, [staticMapUrl]);

  return (
    <View style={styles.routeMediaViewer}>
      {activeImage ? (
        <View style={imageFrameStyle}>
          <Image source={{ uri: activeImage.uri }} style={styles.viewerImage} resizeMode="cover" />
          {imageEntries.length > 1 ? (
            <>
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                style={[styles.carouselButton, styles.carouselButtonLeft]}
                onPress={() => showImage(safeImageIndex - 1)}
              >
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                style={[styles.carouselButton, styles.carouselButtonRight]}
                onPress={() => showImage(safeImageIndex + 1)}
              >
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
              <View style={styles.imageCounterBadge}>
                <Text style={styles.imageCounterText}>
                  {safeImageIndex + 1}/{imageEntries.length}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <GeneratedRouteCover title={title} cityName={cityName} />
      )}
      {route.length ? (
        <View style={routeFrameStyle}>
          {staticMapUrl && !staticMapFailed && bbox ? (
            <View
              style={[styles.staticRouteMap, edgeToEdge ? styles.staticRouteMapEdge : null]}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0) {
                  setRenderedSize({ width, height });
                }
              }}
            >
              <Image
                source={{ uri: staticMapUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="stretch"
                onError={() => setStaticMapFailed(true)}
              />
              {(() => {
                const activeIdx = Math.max(0, route.findIndex((p) => p.pointId === activePointId));
                return route.map((p, index) => {
                  if (index === route.length - 1) return null;
                  const a = projectBboxFill(p.latitude, p.longitude, bbox, renderedSize.width, renderedSize.height);
                  const next = route[index + 1];
                  const b = projectBboxFill(next.latitude, next.longitude, bbox, renderedSize.width, renderedSize.height);
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const traveled = index < activeIdx;

                  if (traveled) {
                    const angle = Math.atan2(dy, dx);
                    const transform = [{ rotate: `${angle}rad` }];
                    const baseLeft = a.x + dx / 2 - length / 2;
                    const cy = a.y + dy / 2;
                    return (
                      <Fragment key={`line-${p.pointId}-${next.pointId}`}>
                        <View pointerEvents="none" style={[styles.mapOverlayLineHalo, { left: baseLeft, top: cy - 5, width: length, transform }]} />
                        <View pointerEvents="none" style={[styles.mapOverlayLineTraveled, { left: baseLeft, top: cy - 2.5, width: length, transform }]} />
                      </Fragment>
                    );
                  }

                  const dotSize = 5;
                  const stride = 18;
                  const count = Math.max(2, Math.min(20, Math.floor(length / stride)));
                  const dots = [];
                  for (let i = 0; i < count; i++) {
                    const t = (i + 0.5) / count;
                    const x = a.x + dx * t;
                    const y = a.y + dy * t;
                    dots.push(
                      <View
                        key={`dot-${p.pointId}-${next.pointId}-${i}`}
                        pointerEvents="none"
                        style={[styles.mapOverlayDot, { left: x - dotSize / 2, top: y - dotSize / 2 }]}
                      />,
                    );
                  }
                  return <Fragment key={`upcoming-${p.pointId}-${next.pointId}`}>{dots}</Fragment>;
                });
              })()}
              {route.map((p, index) => {
                const { x, y } = projectBboxFill(p.latitude, p.longitude, bbox, renderedSize.width, renderedSize.height);
                const isStart = index === 0;
                const isEnd = index === route.length - 1;
                const isSelected = activePointId === p.pointId;
                const label = isStart ? 'S' : isEnd ? 'E' : String(index + 1);
                return (
                  <Pressable
                    key={p.pointId}
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={() => handlePointPress(p.pointId)}
                    style={[
                      styles.mapOverlayPoint,
                      isStart ? styles.mapOverlayPointStart : isEnd ? styles.mapOverlayPointEnd : null,
                      isSelected ? styles.mapOverlayPointSelected : null,
                      { left: x - 14, top: y - 14 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mapOverlayPointLabel,
                        isStart ? styles.mapOverlayPointLabelLight : null,
                        isEnd ? styles.mapOverlayPointLabelDark : null,
                        isSelected ? styles.mapOverlayPointLabelSelected : null,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <RoutePreview
              points={route}
              height={edgeToEdge ? 110 : 120}
              selectedPointId={activePointId}
              onPointPress={handlePointPress}
              flat={edgeToEdge}
            />
          )}
        </View>
      ) : null}
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
  onOpenAuthor,
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
  onOpenAuthor?: (author: UserSummary) => void;
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
        <Pressable
          style={styles.authorRow}
          onPress={() => onOpenAuthor?.(post.author)}
          accessibilityRole="button"
          accessibilityLabel={`查看作者 ${post.author.displayName} 的主页`}
        >
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>{post.author.displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.authorCopy}>
            <Text style={styles.authorName}>{post.author.displayName}</Text>
            <Text style={styles.hintText}>{formatDate(post.publishedAt)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </Pressable>
        <Text style={styles.postTitle}>{detail?.title ?? post.title}</Text>
        {detail?.summary || post.summary ? (
          <Text style={styles.postSummary}>{detail?.summary ?? post.summary}</Text>
        ) : null}
        <RouteMediaViewer
          trip={detail?.trip}
          route={route}
          title={detail?.title ?? post.title}
          cityName={detail?.cityName ?? post.cityName}
        />
        <View style={styles.iconActionRow}>
          <Pressable style={styles.iconAction} onPress={onToggleLike} hitSlop={8}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? PRIMARY : '#475467'}
            />
            <Text style={[styles.iconActionCount, liked ? styles.iconActionCountActive : null]}>
              {counts.likes}
            </Text>
          </Pressable>
          <Pressable style={styles.iconAction} hitSlop={8} onPress={onToggleComments}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#475467" />
            <Text style={styles.iconActionCount}>{counts.comments}</Text>
          </Pressable>
          <Pressable style={styles.iconAction} onPress={onToggleSave} hitSlop={8}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={saved ? PRIMARY : '#475467'}
            />
            <Text style={[styles.iconActionCount, saved ? styles.iconActionCountActive : null]}>
              {counts.saves}
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

function FeedTopBar() {
  return (
    <View style={styles.feedTopBar}>
      <View style={styles.feedTopBarBrandRow}>
        <Text style={styles.feedTopBarBrand}>tripin</Text>
        <View style={styles.feedTopBarBrandDot} />
      </View>
    </View>
  );
}

function formatRelativeTime(value?: string | null) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek} 周前`;
  return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function PostCard({
  post,
  detail,
  expanded = false,
  commentText = '',
  isFirst = false,
  onOpen,
  onToggleLike,
  onToggleSave,
  onChangeCommentText,
  onCreateComment,
  onOpenAuthor,
}: {
  post: FeedItem;
  detail?: PostDetail;
  expanded?: boolean;
  commentText?: string;
  isFirst?: boolean;
  onOpen?: () => void;
  onToggleLike?: () => void;
  onToggleSave?: () => void;
  onChangeCommentText?: (value: string) => void;
  onCreateComment?: () => void;
  onOpenAuthor?: (author: UserSummary) => void;
}) {
  const points = detail?.trip.routePreview ?? post.trip.routePreview ?? [];
  const counts = detail?.counts ?? post._count;
  const liked = detail?.viewerState?.liked ?? post.viewerState?.liked ?? false;
  const saved = detail?.viewerState?.saved ?? post.viewerState?.saved ?? false;
  const initials = post.author.displayName.slice(0, 1).toUpperCase();
  const cityLabel = post.cityName?.trim() || '未知城市';
  const timeLabel = formatRelativeTime(post.publishedAt);

  return (
    <View style={[styles.post, isFirst && styles.postFirst]}>
      <Pressable
        style={styles.postHeader}
        onPress={() => onOpenAuthor?.(post.author)}
        accessibilityRole="button"
        accessibilityLabel={`查看作者 ${post.author.displayName} 的主页`}
      >
        <View style={styles.postAuthorRing}>
          <View style={styles.postAuthor}>
            <Text style={styles.postAuthorInitials}>{initials}</Text>
          </View>
        </View>
        <View style={styles.postHeaderCopy}>
          <Text style={styles.postAuthorName} numberOfLines={1}>
            {post.author.displayName}
          </Text>
          <Text style={styles.postAuthorMeta} numberOfLines={1}>
            {cityLabel}
            {timeLabel ? ` · ${timeLabel}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      </Pressable>

      <Pressable onPress={onOpen} style={styles.postHero}>
        <RouteMediaViewer
          trip={detail?.trip}
          route={points}
          title={post.title}
          cityName={post.cityName}
          edgeToEdge
        />
      </Pressable>

      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <Pressable onPress={onToggleLike} hitSlop={8} style={styles.postActionBtn}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={26}
              color={liked ? TINT : INK}
            />
          </Pressable>
          <Pressable onPress={onOpen} hitSlop={8} style={styles.postActionBtn}>
            <Ionicons name="chatbubble-outline" size={24} color={INK} />
          </Pressable>
        </View>
        <Pressable onPress={onToggleSave} hitSlop={8} style={styles.postActionBtn}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={INK} />
        </Pressable>
      </View>

      {counts.likes > 0 ? (
        <Text style={styles.postLikeCount}>
          {counts.likes.toLocaleString('zh-CN')} 个赞
        </Text>
      ) : null}

      <View style={styles.postCaption}>
        <Pressable onPress={onOpen}>
          <Text style={styles.postCaptionTitle}>{post.title}</Text>
        </Pressable>
        {post.summary ? (
          <Text style={styles.postCaptionBody} numberOfLines={2}>
            <Text style={styles.postCaptionAuthorInline}>{post.author.displayName}  </Text>
            {post.summary}
          </Text>
        ) : null}
      </View>

      {counts.comments > 0 ? (
        <Pressable onPress={onOpen} hitSlop={6}>
          <Text style={styles.postViewComments}>查看全部 {counts.comments} 条评论</Text>
        </Pressable>
      ) : null}

      <View style={styles.postComposer}>
        <TextInput
          value={commentText}
          onChangeText={onChangeCommentText}
          placeholder="留下一句评论…"
          placeholderTextColor={MUTED}
          style={styles.postComposerInput}
        />
        {commentText.trim() ? (
          <Pressable onPress={onCreateComment} hitSlop={6}>
            <Text style={styles.postComposerSend}>发布</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function StudioEntryCard({
  title,
  description,
  meta,
  actionLabel,
  disabled = false,
  onPress,
}: {
  title: string;
  description: string;
  meta?: string;
  actionLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.studioEntryCard, disabled ? styles.studioEntryCardDisabled : null]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.studioEntryHeader}>
        <Text style={styles.studioEntryTitle}>{title}</Text>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </View>
      <Text style={styles.studioEntryDescription}>{description}</Text>
      {meta ? <Text style={styles.studioEntryMeta}>{meta}</Text> : null}
      <View style={[styles.studioEntryAction, disabled ? styles.studioEntryActionDisabled : null]}>
        <Text style={styles.studioEntryActionText}>{actionLabel}</Text>
      </View>
    </Pressable>
  );
}

function AuthorProfileView({
  state,
  onOpenPost,
}: {
  state: AuthorProfileState;
  onOpenPost: (post: FeedItem) => void;
}) {
  const { user, posts, loading } = state;
  const totalLikes = posts.reduce((sum, post) => sum + (post._count?.likes ?? 0), 0);
  const cityCount = new Set(posts.map((post) => post.cityName).filter(Boolean)).size;

  return (
    <View style={styles.detailStack}>
      <View style={styles.profileBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.displayName.slice(0, 1).toUpperCase() || '人'}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user.displayName}</Text>
          <Text style={styles.pageSubtitle}>{user.username ? `@${user.username}` : user.id}</Text>
        </View>
      </View>
      {user.bio ? <Text style={styles.postSummary}>{user.bio}</Text> : null}
      <View style={styles.statsRow}>
        <Stat value={String(posts.length)} label="作品" />
        <Stat value={String(totalLikes)} label="累计点赞" />
        <Stat value={String(cityCount)} label="去过城市" />
      </View>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>作品列表</Text>
          <Text style={styles.hintText}>{loading ? '加载中…' : `${posts.length} 条`}</Text>
        </View>
        {loading ? (
          <EmptyMessage title="加载中" description="正在获取该作者的发布作品。" />
        ) : posts.length ? (
          posts.map((item) => (
            <Pressable key={item.id} style={styles.compactPostRow} onPress={() => onOpenPost(item)}>
              <Text style={styles.tripTitle}>{item.title}</Text>
              <Text style={styles.hintText}>
                {item.cityName ? `${item.cityName} · ` : ''}
                {item.pointCount} 点位 · {item._count.likes} 赞 · {item._count.comments} 评论
              </Text>
            </Pressable>
          ))
        ) : (
          <EmptyMessage title="暂无公开作品" description="该作者还没有发布过路线。" />
        )}
      </View>
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
  icon: React.ComponentProps<typeof Ionicons>['name'];
  danger?: boolean;
  onPress: () => void;
}) {
  const iconColor = danger ? '#dc2626' : PRIMARY;
  return (
    <Pressable style={styles.accountRow} onPress={onPress}>
      <View style={[styles.accountIcon, danger ? styles.accountIconDanger : null]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.accountRowTitle, danger ? styles.accountRowDangerText : null]}>{title}</Text>
      {meta ? <Text style={styles.accountRowMeta}>{meta}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
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
    backgroundColor: '#f6f7f9',
  },
  body: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  tabPaneActive: {
    flex: 1,
  },
  tabPaneHidden: {
    flex: 1,
    display: 'none',
  },
  screenContent: {
    padding: 18,
    paddingBottom: 118,
    gap: 16,
  },
  authScreen: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 36,
  },
  authHero: {
    gap: 8,
    paddingVertical: 10,
  },
  authKicker: {
    color: '#1F4FE0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  authTitle: {
    color: '#101828',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  authModeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#f2f4f7',
  },
  authModeButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  authModeButtonActive: {
    backgroundColor: '#111827',
  },
  authModeText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '900',
  },
  authModeTextActive: {
    color: '#fff',
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
  appCover: {
    minHeight: 190,
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: '#101828',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  coverMapLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 26,
    height: 92,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#172033',
  },
  coverDot: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#101828',
  },
  coverDotStart: {
    left: 22,
    top: 26,
    backgroundColor: '#fbbf24',
  },
  coverDotMid: {
    left: '48%',
    top: 16,
    backgroundColor: '#60a5fa',
  },
  coverDotEnd: {
    right: 26,
    top: 38,
    backgroundColor: '#34d399',
  },
  coverDotText: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '900',
  },
  coverCopy: {
    marginTop: 112,
    gap: 6,
    padding: 18,
  },
  coverKicker: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  coverTitle: {
    color: '#fff',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '900',
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
  placeSearchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  placeSearchInput: {
    flex: 1,
  },
  placeSearchButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  placeSearchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  placeSearchList: {
    gap: 6,
    maxHeight: 220,
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  placeSearchItem: {
    gap: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eef1f5',
  },
  placeSearchItemTitle: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '800',
  },
  placeSearchItemMeta: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 16,
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
    backgroundColor: PRIMARY,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButtonWide: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: PRIMARY,
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
  secondaryButtonWide: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#eef1f5',
  },
  publishButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#1F4FE0',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  postCard: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  cardOpenArea: {
    gap: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  smallAvatarText: {
    color: '#fff',
    fontWeight: '800',
  },
  authorCopy: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  postTitle: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '900',
  },
  postSummary: {
    color: '#475467',
    fontSize: 15,
    lineHeight: 22,
  },
  routeMediaViewer: {
    gap: 0,
  },
  viewerImageFrame: {
    height: 330,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#eef1f5',
    borderWidth: 1,
    borderColor: '#e4e7ec',
    position: 'relative',
  },
  viewerImageFrameFlat: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  routeMapInset: {
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 18,
  },
  routeMapEdge: {
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 0,
    backgroundColor: PAPER,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
  },
  staticRouteMap: {
    width: '100%',
    height: 150,
    backgroundColor: '#eef3f7',
    position: 'relative',
    overflow: 'hidden',
  },
  staticRouteMapEdge: {
    height: 140,
  },
  mapOverlayLineHalo: {
    position: 'absolute',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    elevation: 1,
  },
  mapOverlayLineTraveled: {
    position: 'absolute',
    height: 5,
    borderRadius: 999,
    backgroundColor: TINT,
    elevation: 2,
    shadowColor: TINT,
    shadowOpacity: 0.4,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
  },
  mapOverlayDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: TINT,
    opacity: 0.85,
  },
  mapOverlayPoint: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffaf1',
    borderWidth: 2.5,
    borderColor: '#11443f',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  mapOverlayPointStart: {
    backgroundColor: '#173f39',
  },
  mapOverlayPointEnd: {
    backgroundColor: '#d9b67d',
    borderColor: '#8d5f1f',
  },
  mapOverlayPointSelected: {
    width: 34,
    height: 34,
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
    borderWidth: 3,
  },
  mapOverlayPointLabel: {
    color: '#173430',
    fontSize: 12,
    fontWeight: '900',
  },
  mapOverlayPointLabelLight: {
    color: '#fff9f0',
  },
  mapOverlayPointLabelDark: {
    color: '#5a3a12',
  },
  mapOverlayPointLabelSelected: {
    color: '#fff',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  carouselButton: {
    position: 'absolute',
    top: '46%',
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  carouselButtonLeft: {
    left: 8,
  },
  carouselButtonRight: {
    right: 8,
  },
  carouselButtonText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  imageCounterBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    minHeight: 132,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    gap: 6,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  generatedCoverLine: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#0f766e',
    transform: [{ rotate: '-7deg' }],
  },
  generatedCoverPin: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#e0f2fe',
  },
  generatedCoverPinStart: {
    left: 28,
    top: 28,
    backgroundColor: '#f59e0b',
  },
  generatedCoverPinEnd: {
    right: 34,
    top: 56,
    backgroundColor: '#14b8a6',
  },
  generatedCoverPinText: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '900',
  },
  generatedCoverKicker: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '900',
  },
  generatedCoverTitle: {
    color: '#0f172a',
    fontSize: 20,
    lineHeight: 26,
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
  iconActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 4,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  iconActionCount: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '700',
  },
  iconActionCountActive: {
    color: PRIMARY,
  },
  iconActionSpacer: {
    flex: 1,
  },
  iconActionMeta: {
    color: '#98a2b3',
    fontSize: 12,
    fontWeight: '600',
  },
  commentComposer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
  },
  commentSendButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: PRIMARY,
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
    color: '#1F4FE0',
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
    color: '#1F4FE0',
    fontSize: 15,
    fontWeight: '800',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    elevation: 4,
    zIndex: 20,
  },
  backButtonText: {
    color: '#1F4FE0',
    fontSize: 16,
    fontWeight: '900',
  },
  backButtonFloating: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 14,
    left: 14,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 50,
  },
  screenContentWithFloating: {
    paddingTop: Platform.OS === 'android' ? 100 : 70,
  },
  publishPageWithFloating: {
    paddingTop: Platform.OS === 'android' ? 100 : 70,
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#e6e9ee',
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
    backgroundColor: '#f2f4f7',
  },
  navButtonText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '800',
  },
  navButtonTextActive: {
    color: '#101828',
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
  },
  plusText: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
  },
  homeButton: {
    backgroundColor: '#1F4FE0',
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
    color: '#1F4FE0',
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

  // ───────── Instagram-style feed redesign ─────────
  feedRoot: {
    flex: 1,
    backgroundColor: PAPER,
  },
  feedScroll: {
    flex: 1,
  },
  feedScrollContent: {
    paddingBottom: 130,
  },
  feedTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: PAPER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
  },
  feedTopBarBrandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  feedTopBarBrand: {
    fontFamily: FONT_DISPLAY,
    color: INK,
    fontSize: 30,
    letterSpacing: -1.4,
    lineHeight: 32,
    includeFontPadding: false,
  },
  feedTopBarBrandDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: TINT,
    marginBottom: 6,
  },
  feedTopBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  feedTopBarIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedEmpty: {
    paddingHorizontal: 24,
    paddingTop: 64,
    gap: 10,
    alignItems: 'flex-start',
  },
  feedEmptyTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 28,
    color: INK,
    letterSpacing: -0.6,
  },
  feedEmptyBody: {
    fontFamily: FONT_BODY,
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
  },

  post: {
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: PAPER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
  },
  postFirst: {
    paddingTop: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 12,
  },
  postAuthorRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: TINT,
  },
  postAuthor: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAuthorInitials: {
    fontFamily: FONT_BODY_BOLD,
    color: PAPER,
    fontSize: 14,
    includeFontPadding: false,
  },
  postHeaderCopy: {
    flex: 1,
    gap: 1,
  },
  postAuthorName: {
    fontFamily: FONT_BODY_BOLD,
    color: INK,
    fontSize: 14,
    includeFontPadding: false,
  },
  postAuthorMeta: {
    fontFamily: FONT_BODY,
    color: MUTED,
    fontSize: 12,
    includeFontPadding: false,
  },
  postHeaderMore: {
    paddingHorizontal: 4,
  },
  postHero: {
    width: '100%',
    backgroundColor: PAPER,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  postActionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postLikeCount: {
    fontFamily: FONT_BODY_BOLD,
    color: INK,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 2,
    includeFontPadding: false,
  },
  postCaption: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  postCaptionTitle: {
    fontFamily: FONT_DISPLAY,
    color: INK,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
    includeFontPadding: false,
  },
  postCaptionAuthorInline: {
    fontFamily: FONT_BODY_BOLD,
    color: INK,
  },
  postCaptionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  postCaptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: TINT_SOFT,
  },
  postCaptionChipText: {
    fontFamily: FONT_BODY_BOLD,
    color: TINT,
    fontSize: 11,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  postCaptionMetaText: {
    fontFamily: FONT_BODY,
    color: MUTED,
    fontSize: 12,
  },
  postCaptionBody: {
    fontFamily: FONT_BODY,
    color: INK_SOFT,
    fontSize: 14,
    lineHeight: 20,
  },
  postViewComments: {
    fontFamily: FONT_BODY,
    color: MUTED,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  postComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  postComposerInput: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: FONT_BODY,
    color: INK,
    fontSize: 14,
  },
  postComposerSend: {
    fontFamily: FONT_BODY_BOLD,
    color: TINT,
    fontSize: 14,
  },
  studioEntryCard: {
    gap: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  studioEntryCardDisabled: {
    opacity: 0.55,
  },
  studioEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studioEntryTitle: {
    color: '#101828',
    fontSize: 18,
    fontWeight: '900',
  },
  studioEntryDescription: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 20,
  },
  studioEntryMeta: {
    color: '#98a2b3',
    fontSize: 12,
    fontWeight: '800',
  },
  studioEntryAction: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  studioEntryActionDisabled: {
    backgroundColor: '#cbd5e1',
  },
  studioEntryActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
});
