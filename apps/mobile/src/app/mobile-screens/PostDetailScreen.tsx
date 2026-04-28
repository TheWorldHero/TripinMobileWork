import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { formatCoordinates, formatDateRange, formatDateTime } from '../../lib/display';
import type { PostDetail } from '../../types';

interface PostDetailScreenProps {
  post: PostDetail;
  onBack: () => void;
}

export function PostDetailScreen({ post, onBack }: PostDetailScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <Button label="Back to feed" variant="ghost" onPress={onBack} />

      <HeroCard
        title={post.title}
        subtitle={post.summary || 'No summary yet.'}
        eyebrow="Route detail"
        aside={<MetricPill value={post.pointCount} label="stops" />}
      />

      <SectionCard
        title="Route overview"
        subtitle="详情页负责回看和分享；真正的地图编辑留在线路任务页里完成。"
      >
        <RoutePreview points={post.trip.routePreview} height={250} />
        <View style={styles.authorStrip}>
          <View style={styles.authorRow}>
            <MonogramAvatar name={post.author.displayName} size={44} />
            <View style={styles.authorCopy}>
              <Text style={styles.authorName}>{post.author.displayName}</Text>
              <Text style={uiStyles.metaText}>
                {post.cityName || 'Unknown city'} · {formatDateRange(post.trip.startedAt, post.trip.endedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.metricMiniRow}>
            <MetricPill value={post.counts.likes} label="likes" />
            <MetricPill value={post.mediaCount} label="photos" />
          </View>
        </View>
        <View style={uiStyles.rowWrap}>
          <Badge label={`${post.pointCount} stops`} />
          <Badge label={`${post.counts.saves} saves`} />
          <Badge label={`${post.counts.comments} comments`} tone="accent" />
        </View>
      </SectionCard>

      <SectionCard
        title="Timeline"
        subtitle="Each stop keeps the same mobile pattern: title, time, coordinates, note, and linked media."
      >
        {post.trip.points.map((point, index) => (
          <View key={point.id} style={styles.pointCard}>
            <View style={styles.pointRail}>
              <View style={styles.pointNumber}>
                <Text style={styles.pointNumberLabel}>{index + 1}</Text>
              </View>
              {index < post.trip.points.length - 1 ? <View style={styles.pointRailLine} /> : null}
            </View>

            <View style={styles.pointBody}>
              <Text style={styles.pointTitle}>
                {point.title || point.customPlaceName || point.place?.name || 'Untitled stop'}
              </Text>
              <Text style={uiStyles.metaText}>{formatDateRange(point.startedAt, point.endedAt)}</Text>
              <Text style={uiStyles.metaText}>{formatCoordinates(point.latitude, point.longitude)}</Text>
              <Text style={uiStyles.cardBodyText}>{point.note || 'No note for this stop yet.'}</Text>

              <View style={styles.mediaRow}>
                {point.mediaAssets.length ? (
                  point.mediaAssets.map((asset) => (
                    <View key={asset.id} style={styles.mediaCard}>
                      <Text style={styles.mediaCardTitle}>{asset.originalName}</Text>
                      <Text style={styles.mediaCardBody}>{asset.caption || 'No caption yet.'}</Text>
                      <Text style={uiStyles.metaText}>{formatDateTime(asset.takenAt)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={uiStyles.metaText}>No media attached to this stop yet.</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Comments" subtitle="A lightweight social layer sits below the route narrative.">
        {post.comments.length ? (
          post.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <MonogramAvatar name={comment.user.displayName} size={36} />
              <View style={styles.commentBody}>
                <Text style={styles.commentAuthor}>{comment.user.displayName}</Text>
                <Text style={uiStyles.cardBodyText}>{comment.content}</Text>
                <Text style={uiStyles.metaText}>{formatDateTime(comment.createdAt)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No comments yet"
            description="You can add the composer later after the core route layout is stable."
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authorStrip: {
    gap: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorCopy: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    color: '#143430',
    fontSize: 17,
    fontWeight: '800',
  },
  metricMiniRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pointCard: {
    flexDirection: 'row',
    gap: 14,
  },
  pointRail: {
    alignItems: 'center',
    width: 28,
  },
  pointNumber: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#153f39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointNumberLabel: {
    color: '#fff8ee',
    fontWeight: '800',
    fontSize: 12,
  },
  pointRailLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#d8cbba',
    marginTop: 8,
  },
  pointBody: {
    flex: 1,
    paddingBottom: 14,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eadfcd',
  },
  pointTitle: {
    color: '#143430',
    fontSize: 18,
    fontWeight: '800',
  },
  mediaRow: {
    gap: 10,
    paddingTop: 4,
  },
  mediaCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#efe6d8',
    gap: 6,
  },
  mediaCardTitle: {
    color: '#203734',
    fontWeight: '800',
  },
  mediaCardBody: {
    color: '#51615d',
    lineHeight: 19,
  },
  commentCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentAuthor: {
    color: '#143430',
    fontWeight: '800',
  },
});
