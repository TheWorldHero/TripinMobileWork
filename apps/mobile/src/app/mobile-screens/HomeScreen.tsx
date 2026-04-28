import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RoutePreview } from '../../components/RoutePreview';
import {
  Badge,
  Button,
  EmptyState,
  HeroCard,
  MetricPill,
  MonogramAvatar,
  SectionCard,
  uiStyles,
} from '../../components/MobileUi';
import { formatDateRange } from '../../lib/display';
import { CREATION_ACTIONS } from '../creation-sheet';
import type { DraftPoint, FeedItem } from '../../types';

interface HomeScreenProps {
  apiBaseUrl: string;
  draftPoint?: DraftPoint | null;
  onChangeApiBaseUrl: (value: string) => void;
  onOpenComposer: () => void;
  onOpenPost: (postId: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onSeedDemo: () => void | Promise<void>;
  items: FeedItem[];
}

export function HomeScreen({
  apiBaseUrl,
  draftPoint,
  onChangeApiBaseUrl,
  onOpenComposer,
  onOpenPost,
  onRefresh,
  onSeedDemo,
  items,
}: HomeScreenProps) {
  const featuredItem = items[0];
  const secondaryItems = items.slice(1, 4);
  const uniqueCities = new Set(items.map((item) => item.cityName).filter(Boolean)).size;
  const totalStops = items.reduce((count, item) => count + item.pointCount, 0);
  const totalPhotos = items.reduce((count, item) => count + item.mediaCount, 0);

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        eyebrow="Community first"
        title="先逛路线，再决定要不要记录"
        subtitle="TripIn 先把你带到真实内容里，记录入口藏在底部主按钮后面，地图只在任务页出现。"
        aside={<MetricPill value={items.length} label="routes live" />}
      />

      <View style={styles.metricRow}>
        <MetricPill value={totalStops} label="stops replayed" />
        <MetricPill value={uniqueCities || 0} label="cities" />
        <MetricPill value={totalPhotos} label="photos" />
      </View>

      <SectionCard
        title="记录入口"
        subtitle="中间主按钮应该像一个明确仪式，而不是普通工具入口。"
        action={<Button label="打开记录面板" variant="secondary" onPress={onOpenComposer} />}
      >
        <View style={styles.creationLeadCard}>
          <View style={styles.creationLeadCopy}>
            <Text style={styles.creationLeadTitle}>先接住内容，再开始整理生活轨迹</Text>
            <Text style={uiStyles.cardBodyText}>
              首页优先保持推荐和关注混合流，真正需要选点和编辑线路时，地图才会以任务页面的方式出现。
            </Text>
          </View>
          <View style={styles.creationBadgeStack}>
            <Badge label="社区首页" tone="dark" />
            <Badge label="底部主按钮" />
            <Badge label="地图按任务出现" tone="accent" />
          </View>
          <View style={styles.creationActionRow}>
            {CREATION_ACTIONS.map((action) => (
              <Badge key={action.key} label={action.label} />
            ))}
          </View>
        </View>
      </SectionCard>

      {draftPoint ? (
        <SectionCard
          title="待补完的草稿点"
          subtitle="草稿先被保存下来，下一步只需要补位置，不会把用户直接扔进地图首页。"
        >
          <View style={styles.pendingDraftCard}>
            <View style={styles.pendingDraftHeader}>
              <Text style={styles.pendingDraftTitle}>这个点还在等你确认位置</Text>
              <Badge label={draftPoint.status} tone="accent" />
            </View>
            <Text style={uiStyles.cardBodyText}>
              一张图片已经先被接住了。接下来进入位置确认页时，再决定它落在哪个真实地点。
            </Text>
            <Text style={uiStyles.metaText}>{draftPoint.createdAt}</Text>
          </View>
        </SectionCard>
      ) : null}

      <SectionCard
        title="今日推荐"
        subtitle="第一张卡承担完整情绪：作者、路线形状、地点氛围和社交反馈都要在一屏内成立。"
        action={<Button label="刷新" variant="ghost" onPress={onRefresh} />}
      >
        {featuredItem ? (
          <Pressable style={styles.featuredCard} onPress={() => void onOpenPost(featuredItem.id)}>
            <RoutePreview points={featuredItem.trip.routePreview} height={220} />
            <View style={styles.featuredBody}>
              <View style={styles.featuredHeader}>
                <View style={styles.authorRow}>
                  <MonogramAvatar name={featuredItem.author.displayName} size={44} />
                  <View style={styles.authorCopy}>
                    <Text style={styles.authorName}>{featuredItem.author.displayName}</Text>
                    <Text style={uiStyles.metaText}>
                      {featuredItem.cityName || 'Unknown city'} ·{' '}
                      {formatDateRange(featuredItem.trip.startedAt, featuredItem.trip.endedAt)}
                    </Text>
                  </View>
                </View>
                <Badge label={`${featuredItem._count.likes} likes`} tone="dark" />
              </View>

              <Text style={styles.featuredTitle}>{featuredItem.title}</Text>
              <Text style={uiStyles.cardBodyText}>
                {featuredItem.summary || 'No summary yet.'}
              </Text>

              <View style={uiStyles.rowWrap}>
                <Badge label={`${featuredItem.pointCount} stops`} />
                <Badge label={`${featuredItem.mediaCount} photos`} />
                <Badge label={`${featuredItem._count.comments} comments`} tone="accent" />
              </View>
            </View>
          </Pressable>
        ) : (
          <EmptyState
            title="社区流还没有内容"
            description="先 seed 一组 demo route，再回来验证首页节奏和路线卡片的视觉表达。"
          />
        )}
      </SectionCard>

      <SectionCard
        title="继续浏览"
        subtitle="次级卡片更紧凑，但依然要保留路线轮廓、作者身份和点数密度。"
      >
        {secondaryItems.length ? (
          secondaryItems.map((item) => (
            <Pressable key={item.id} style={styles.feedCard} onPress={() => void onOpenPost(item.id)}>
              <RoutePreview points={item.trip.routePreview} height={138} />
              <View style={styles.feedCardBody}>
                <View style={styles.authorRow}>
                  <MonogramAvatar name={item.author.displayName} size={36} />
                  <View style={styles.authorCopy}>
                    <Text style={styles.compactAuthor}>{item.author.displayName}</Text>
                    <Text style={uiStyles.metaText}>
                      {item.cityName || 'Unknown city'} ·{' '}
                      {formatDateRange(item.trip.startedAt, item.trip.endedAt)}
                    </Text>
                  </View>
                  <Badge label={`${item.pointCount} stops`} />
                </View>
                <Text style={uiStyles.cardTitle}>{item.title}</Text>
                <Text style={uiStyles.cardBodyText}>{item.summary || 'No summary yet.'}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="更多路线还没出现"
            description="发布更多内容后，这里会形成连续的社区卡片流。"
          />
        )}
      </SectionCard>

      <SectionCard
        title="Local preview tools"
        subtitle="调试控件保留，但应该被压到页面底部，不再定义产品本身。"
        action={<Button label="Seed demo" variant="ghost" onPress={onSeedDemo} />}
      >
        <TextInput
          value={apiBaseUrl}
          onChangeText={onChangeApiBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={uiStyles.textInput}
        />
        <Text style={uiStyles.metaText}>
          Android 模拟器通常使用 `http://10.0.2.2:3000/api/v1`。真机需要把这里改成开发机的局域网 IP。
        </Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  creationLeadCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#fff8ec',
    borderWidth: 1,
    borderColor: '#e8dbc7',
    gap: 16,
  },
  creationLeadCopy: {
    gap: 8,
  },
  creationLeadTitle: {
    color: '#12312d',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  creationBadgeStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  creationActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingDraftCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#fff9f0',
    borderWidth: 1,
    borderColor: '#eadcc6',
    gap: 10,
  },
  pendingDraftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  pendingDraftTitle: {
    flex: 1,
    color: '#14312e',
    fontSize: 18,
    fontWeight: '800',
  },
  featuredCard: {
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
  },
  featuredBody: {
    padding: 16,
    gap: 12,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  authorCopy: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    color: '#12312d',
    fontSize: 16,
    fontWeight: '800',
  },
  featuredTitle: {
    color: '#0f2d2a',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  feedCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eadcca',
  },
  feedCardBody: {
    padding: 16,
    gap: 10,
  },
  compactAuthor: {
    color: '#173430',
    fontWeight: '800',
    fontSize: 14,
  },
});
