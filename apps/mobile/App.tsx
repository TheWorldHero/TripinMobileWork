import { StatusBar } from 'expo-status-bar';
import { startTransition, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Banner, BusyRow, StatusPill, TabButton } from './src/components/Ui';
import { createApiClient } from './src/lib/api';
import {
  createBlankManualPoint,
  createDemoMediaDrafts,
  type DraftMediaItem,
  type ManualPointForm,
} from './src/local-types';
import { FeedScreen } from './src/screens/FeedScreen';
import { MyScreen } from './src/screens/MyScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import { StudioScreen } from './src/screens/StudioScreen';
import type { FeedItem, PostDetail, Trip } from './src/types';

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';
const DEMO_USER_ID = 'demo-user';

type TabKey = 'feed' | 'studio' | 'mine';

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [tab, setTab] = useState<TabKey>('feed');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostDetail | null>(null);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [studioTrip, setStudioTrip] = useState<Trip | null>(null);
  const [tripTitle, setTripTitle] = useState('北京周末生活轨迹');
  const [tripSummary, setTripSummary] = useState(
    '用时间线把一段周末行程整理成可以回看的生活轨迹。',
  );
  const [tripCity, setTripCity] = useState('北京');
  const [draftMedia, setDraftMedia] = useState<DraftMediaItem[]>(createDemoMediaDrafts());
  const [manualPoint, setManualPoint] = useState<ManualPointForm>(createBlankManualPoint());

  const api = createApiClient({
    baseUrl: apiBaseUrl,
    userId: DEMO_USER_ID,
  });

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setBusyLabel('连接本地服务');
        const [health, feed, trips] = await Promise.all([
          api.getHealth(),
          api.getFeed(),
          api.getTrips(),
        ]);

        if (!active) {
          return;
        }

        startTransition(() => {
          setBackendOk(Boolean(health.ok));
          setFeedItems(feed.items);
          setMyTrips(trips.items);
          setStudioTrip(trips.items.find((trip) => trip.status === 'DRAFT') ?? null);
        });
        setMessage(null);
      } catch (error) {
        if (!active) {
          return;
        }

        setBackendOk(false);
        setMessage(
          error instanceof Error
            ? error.message
            : '暂时连不上后端，请确认 API 已经启动。',
        );
      } finally {
        if (active) {
          setBusyLabel(null);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  async function refreshCollections(currentTripId?: string | null) {
    const [feed, trips] = await Promise.all([api.getFeed(), api.getTrips()]);
    startTransition(() => {
      setFeedItems(feed.items);
      setMyTrips(trips.items);
      const targetTripId = currentTripId ?? studioTrip?.id;
      if (targetTripId) {
        setStudioTrip(trips.items.find((trip) => trip.id === targetTripId) ?? null);
      }
    });
  }

  async function handleSeedDemo() {
    try {
      setBusyLabel('写入演示数据');
      const result = await api.seedDemo(true);
      await refreshCollections();
      setMessage(`已重置本地演示数据，生成 ${result.posts} 条示例内容。`);
      setTab('feed');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '演示数据初始化失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleRefresh() {
    try {
      setBusyLabel('刷新列表');
      await refreshCollections();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '刷新失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleOpenPost(postId: string) {
    try {
      setBusyLabel('加载轨迹详情');
      const post = await api.getPost(postId);
      setSelectedPost(post);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '详情加载失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleOpenTrip(tripId: string) {
    try {
      setBusyLabel('刷新我的轨迹');
      const trip = await api.getTrip(tripId);
      setStudioTrip(trip);
      setTab('studio');
      setSelectedPost(null);
      setMessage('已切换到这条轨迹的编辑视图。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '轨迹加载失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function ensureStudioTrip() {
    if (studioTrip) {
      return studioTrip;
    }

    const created = await api.createTrip({
      title: tripTitle,
      summary: tripSummary,
      cityName: tripCity,
      provinceName: '北京市',
      kind: 'MIXED',
      visibility: 'PRIVATE',
    });

    setStudioTrip(created);
    await refreshCollections(created.id);
    setMessage('轨迹草稿已创建，现在可以继续补照片和地点。');
    return created;
  }

  async function handleCreateDraftTrip() {
    try {
      setBusyLabel('创建轨迹草稿');
      await ensureStudioTrip();
      setTab('studio');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '创建草稿失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleUploadDraftMedia() {
    try {
      setBusyLabel('同步照片元数据');
      const trip = await ensureStudioTrip();
      const updatedDrafts: DraftMediaItem[] = [];

      for (const item of draftMedia) {
        if (item.uploadedMediaId) {
          updatedDrafts.push(item);
          continue;
        }

        const created = await api.createMediaAsset({
          originalName: item.originalName,
          mimeType: 'image/jpeg',
          bytes: 2400000,
          width: 1440,
          height: 1080,
          caption: item.caption,
          takenAt: new Date(item.takenAt).toISOString(),
          exifLatitude: item.latitude ? Number(item.latitude) : undefined,
          exifLongitude: item.longitude ? Number(item.longitude) : undefined,
          tripId: trip.id,
        });

        await api.markMediaReady(created.id);
        updatedDrafts.push({
          ...item,
          uploadedMediaId: created.id,
        });
      }

      setDraftMedia(updatedDrafts);
      const refreshedTrip = await api.getTrip(trip.id);
      setStudioTrip(refreshedTrip);
      await refreshCollections(trip.id);
      setMessage('照片时间和坐标已经同步到后端，可以开始自动聚合轨迹点。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '同步照片失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleAutoAssemble() {
    if (!studioTrip) {
      setMessage('请先创建轨迹草稿。');
      return;
    }

    const mediaAssetIds = draftMedia
      .map((item) => item.uploadedMediaId)
      .filter((value): value is string => Boolean(value));

    if (!mediaAssetIds.length) {
      setMessage('请先把照片同步到后端。');
      return;
    }

    try {
      setBusyLabel('根据时间和坐标生成轨迹');
      const trip = await api.autoAssembleTrip(studioTrip.id, mediaAssetIds);
      setStudioTrip(trip);
      await refreshCollections(trip.id);
      setMessage('系统已经按照片时间和坐标聚好了轨迹点。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '自动聚合失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleAddManualPoint() {
    if (!studioTrip) {
      setMessage('请先创建轨迹草稿。');
      return;
    }

    try {
      setBusyLabel('添加手动地点');
      const trip = await api.createTripPoint(studioTrip.id, {
        title: manualPoint.title || undefined,
        customPlaceName: manualPoint.customPlaceName || undefined,
        note: manualPoint.note || undefined,
        startedAt: new Date(manualPoint.startedAt).toISOString(),
        latitude: manualPoint.latitude ? Number(manualPoint.latitude) : undefined,
        longitude: manualPoint.longitude ? Number(manualPoint.longitude) : undefined,
        sourceType: 'MANUAL',
      });

      setStudioTrip(trip);
      setManualPoint(createBlankManualPoint());
      await refreshCollections(trip.id);
      setMessage('手动地点已经补进轨迹里。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '手动补点失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handlePublishTrip() {
    if (!studioTrip) {
      setMessage('还没有可以发布的轨迹。');
      return;
    }

    try {
      setBusyLabel('发布到信息流');
      const trip = await api.publishTrip(studioTrip.id, {
        title: tripTitle,
        summary: tripSummary,
        visibility: 'PUBLIC',
      });

      setStudioTrip(trip);
      await refreshCollections(trip.id);
      setTab('feed');
      setMessage('轨迹已经发布到首页信息流。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发布失败');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleQuickBuild() {
    try {
      await handleCreateDraftTrip();
      await handleUploadDraftMedia();
      await handleAutoAssemble();
      await handlePublishTrip();
    } catch {
      // Each step already handles its own error feedback.
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.appShell}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.appTitle}>TripIn</Text>
            <Text style={styles.appSubtitle}>Map-first life timeline MVP</Text>
          </View>
          <StatusPill ok={backendOk} />
        </View>

        {message ? <Banner text={message} onClose={() => setMessage(null)} /> : null}
        {busyLabel ? <BusyRow label={busyLabel} /> : null}

        <View style={styles.contentArea}>
          {selectedPost ? (
            <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />
          ) : tab === 'feed' ? (
            <FeedScreen
              apiBaseUrl={apiBaseUrl}
              onChangeApiBaseUrl={setApiBaseUrl}
              onSeedDemo={handleSeedDemo}
              onRefresh={handleRefresh}
              onOpenPost={handleOpenPost}
              items={feedItems}
            />
          ) : tab === 'studio' ? (
            <StudioScreen
              tripTitle={tripTitle}
              tripSummary={tripSummary}
              tripCity={tripCity}
              onChangeTripTitle={setTripTitle}
              onChangeTripSummary={setTripSummary}
              onChangeTripCity={setTripCity}
              onCreateDraftTrip={handleCreateDraftTrip}
              onQuickBuild={handleQuickBuild}
              draftMedia={draftMedia}
              onChangeDraftMedia={(updater) => setDraftMedia((prev) => updater(prev))}
              onUploadDraftMedia={handleUploadDraftMedia}
              onAutoAssemble={handleAutoAssemble}
              manualPoint={manualPoint}
              onChangeManualPoint={(updater) => setManualPoint((prev) => updater(prev))}
              onAddManualPoint={handleAddManualPoint}
              onPublishTrip={handlePublishTrip}
              studioTrip={studioTrip}
            />
          ) : (
            <MyScreen trips={myTrips} onOpenTrip={handleOpenTrip} />
          )}
        </View>

        {!selectedPost ? (
          <View style={styles.tabBar}>
            <TabButton label="首页" active={tab === 'feed'} onPress={() => setTab('feed')} />
            <TabButton label="创建" active={tab === 'studio'} onPress={() => setTab('studio')} />
            <TabButton label="我的" active={tab === 'mine'} onPress={() => setTab('mine')} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#102726',
  },
  appShell: {
    flex: 1,
    backgroundColor: '#102726',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    color: '#f7f1e7',
    fontSize: 28,
    fontWeight: '800',
  },
  appSubtitle: {
    marginTop: 4,
    color: '#c4d0cd',
    fontSize: 13,
  },
  contentArea: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#183531',
    borderRadius: 999,
    padding: 6,
    flexDirection: 'row',
    gap: 8,
  },
});
