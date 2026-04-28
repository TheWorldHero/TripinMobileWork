import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoutePreview } from '../../components/RoutePreview';
import { Badge, Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../../components/Ui';
import { formatCoordinates, formatDateRange, formatDateTime } from '../../lib/format';
import type { PostDetail } from '../../types';

interface PostDetailScreenProps {
  post: PostDetail;
  onBack: () => void;
}

export function PostDetailScreen({ post, onBack }: PostDetailScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <Button label="Back to feed" variant="ghost" onPress={onBack} />
      <HeroCard title={post.title} subtitle={post.summary || 'No summary yet.'} />

      <SectionCard
        title="Route overview"
        subtitle={`${post.author.displayName} · ${formatDateRange(
          post.trip.startedAt,
          post.trip.endedAt,
        )}`}
      >
        <RoutePreview points={post.trip.routePreview} height={220} />
        <View style={uiStyles.rowWrap}>
          <Badge label={post.cityName || 'Unknown city'} />
          <Badge label={`${post.pointCount} stops`} />
          <Badge label={`${post.counts.likes} likes`} />
          <Badge label={`${post.counts.saves} saves`} />
        </View>
      </SectionCard>

      <SectionCard title="Timeline" subtitle="The map leads, and the timeline carries the narrative detail.">
        {post.trip.points.map((point) => (
          <View key={point.id} style={styles.detailPointCard}>
            <Text style={styles.timelineTitle}>
              {point.title || point.customPlaceName || point.place?.name || 'Untitled stop'}
            </Text>
            <Text style={uiStyles.metaText}>{formatDateRange(point.startedAt, point.endedAt)}</Text>
            <Text style={uiStyles.metaText}>
              {formatCoordinates(point.latitude, point.longitude)}
            </Text>
            <Text style={uiStyles.cardBodyText}>{point.note || 'No note for this stop yet.'}</Text>
            <View style={styles.mediaGrid}>
              {point.mediaAssets.length ? (
                point.mediaAssets.map((asset) => (
                  <View key={asset.id} style={styles.mediaPlaceholder}>
                    <Text style={styles.mediaPlaceholderTitle}>{asset.originalName}</Text>
                    <Text style={styles.mediaPlaceholderBody}>
                      {asset.caption || 'No media caption yet.'}
                    </Text>
                    <Text style={uiStyles.metaText}>{formatDateTime(asset.takenAt)}</Text>
                  </View>
                ))
              ) : (
                <Text style={uiStyles.metaText}>No media is attached to this stop yet.</Text>
              )}
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Comments" subtitle="The MVP keeps a minimal discussion surface.">
        {post.comments.length ? (
          post.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Text style={styles.timelineTitle}>{comment.user.displayName}</Text>
              <Text style={uiStyles.cardBodyText}>{comment.content}</Text>
              <Text style={uiStyles.metaText}>{formatDateTime(comment.createdAt)}</Text>
            </View>
          ))
        ) : (
          <EmptyState title="No comments" description="You can extend this screen with a comment composer later." />
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

