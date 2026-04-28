import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RoutePreview } from '../components/RoutePreview';
import { Badge, Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../components/Ui';
import { formatDateRange } from '../lib/format';
import type { FeedItem } from '../types';

interface FeedScreenProps {
  apiBaseUrl: string;
  onChangeApiBaseUrl: (value: string) => void;
  onSeedDemo: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onOpenPost: (postId: string) => void | Promise<void>;
  items: FeedItem[];
}

export function FeedScreen({
  apiBaseUrl,
  onChangeApiBaseUrl,
  onSeedDemo,
  onRefresh,
  onOpenPost,
  items,
}: FeedScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="地图优先的生活轨迹"
        subtitle="把旅行、探店和日常出门整理成一条可回看的路线，而不是一组散照片。"
      />

      <SectionCard
        title="本地联调"
        subtitle="如果信息流为空，可以一键写入演示数据。"
        action={<Button label="写入演示数据" variant="secondary" onPress={onSeedDemo} />}
      >
        <Text style={uiStyles.metaText}>
          API Base URL 直接可改，方便你在本机、模拟器或局域网设备之间切换。
        </Text>
        <TextInput
          value={apiBaseUrl}
          onChangeText={onChangeApiBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={uiStyles.textInput}
        />
      </SectionCard>

      <SectionCard
        title="首页轨迹流"
        subtitle="卡片强调一段路线而不是单张图片。"
        action={<Button label="刷新" variant="ghost" onPress={onRefresh} />}
      >
        {items.length ? (
          items.map((item) => (
            <Pressable key={item.id} style={styles.feedCard} onPress={() => void onOpenPost(item.id)}>
              <RoutePreview points={item.trip.routePreview} height={150} />
              <View style={styles.feedCardBody}>
                <Text style={uiStyles.cardTitle}>{item.title}</Text>
                <Text style={uiStyles.cardBodyText}>{item.summary || '这条轨迹还没有摘要。'}</Text>
                <View style={uiStyles.rowWrap}>
                  <Badge label={item.cityName || '未命名城市'} />
                  <Badge label={`${item.pointCount} 个地点`} />
                  <Badge label={`${item.mediaCount} 张照片`} />
                </View>
                <Text style={uiStyles.metaText}>
                  {item.author.displayName} · {formatDateRange(item.trip.startedAt, item.trip.endedAt)}
                </Text>
                <Text style={uiStyles.metaText}>
                  {item._count.likes} 赞 · {item._count.saves} 收藏 · {item._count.comments} 评论
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="信息流还没有内容"
            description="先点上面的“写入演示数据”，或者到创建页生成你自己的第一条轨迹。"
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e6dbcc',
  },
  feedCardBody: {
    padding: 16,
    gap: 10,
  },
});

