import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoutePreview } from '../components/RoutePreview';
import { Badge, Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../components/Ui';
import { formatCoordinates, formatDateRange, formatDateTime } from '../lib/format';
import type { PostDetail } from '../types';

interface PostDetailScreenProps {
  post: PostDetail;
  onBack: () => void;
}

export function PostDetailScreen({ post, onBack }: PostDetailScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <Button label="返回首页" variant="ghost" onPress={onBack} />
      <HeroCard title={post.title} subtitle={post.summary || '这条轨迹还没有摘要。'} />

      <SectionCard
        title="轨迹总览"
        subtitle={`${post.author.displayName} · ${formatDateRange(
          post.trip.startedAt,
          post.trip.endedAt,
        )}`}
      >
        <RoutePreview points={post.trip.routePreview} height={220} />
        <View style={uiStyles.rowWrap}>
          <Badge label={post.cityName || '未命名城市'} />
          <Badge label={`${post.pointCount} 个地点`} />
          <Badge label={`${post.counts.likes} 赞`} />
          <Badge label={`${post.counts.saves} 收藏`} />
        </View>
      </SectionCard>

      <SectionCard title="时间线" subtitle="地图优先，时间线承担叙事细节。">
        {post.trip.points.map((point) => (
          <View key={point.id} style={styles.detailPointCard}>
            <Text style={styles.timelineTitle}>
              {point.title || point.customPlaceName || point.place?.name || '未命名地点'}
            </Text>
            <Text style={uiStyles.metaText}>{formatDateRange(point.startedAt, point.endedAt)}</Text>
            <Text style={uiStyles.metaText}>
              {formatCoordinates(point.latitude, point.longitude)}
            </Text>
            <Text style={uiStyles.cardBodyText}>{point.note || '还没有补充描述。'}</Text>
            <View style={styles.mediaGrid}>
              {point.mediaAssets.length ? (
                point.mediaAssets.map((asset) => (
                  <View key={asset.id} style={styles.mediaPlaceholder}>
                    <Text style={styles.mediaPlaceholderTitle}>{asset.originalName}</Text>
                    <Text style={styles.mediaPlaceholderBody}>
                      {asset.caption || '还没有图片文案'}
                    </Text>
                    <Text style={uiStyles.metaText}>{formatDateTime(asset.takenAt)}</Text>
                  </View>
                ))
              ) : (
                <Text style={uiStyles.metaText}>这个地点还没有关联素材。</Text>
              )}
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="评论" subtitle="本地 MVP 保留了最小评论能力。">
        {post.comments.length ? (
          post.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Text style={styles.timelineTitle}>{comment.user.displayName}</Text>
              <Text style={uiStyles.cardBodyText}>{comment.content}</Text>
              <Text style={uiStyles.metaText}>{formatDateTime(comment.createdAt)}</Text>
            </View>
          ))
        ) : (
          <EmptyState title="还没有评论" description="你可以继续扩展评论输入。" />
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  detailPointCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#e6dbcc',
    gap: 8,
  },
  timelineTitle: {
    color: '#173430',
    fontWeight: '800',
    fontSize: 16,
  },
  mediaGrid: {
    gap: 10,
  },
  mediaPlaceholder: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#efe6d8',
    gap: 6,
  },
  mediaPlaceholderTitle: {
    color: '#203734',
    fontWeight: '700',
  },
  mediaPlaceholderBody: {
    color: '#51615d',
    lineHeight: 19,
  },
  commentCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#e6dbcc',
    gap: 6,
  },
});
