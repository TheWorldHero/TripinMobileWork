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
import type { FeedItem } from '../../types';

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
  const featuredItem = items[0];
  const secondaryItems = items.length > 1 ? items.slice(1) : [];
  const uniqueCities = new Set(items.map((item) => item.cityName).filter(Boolean)).size;

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        eyebrow="Community stream"
        title="Replay places, not just photos"
        subtitle="This feed component now acts as a reusable community stream, not the app's creation-first landing page."
        aside={<MetricPill value={items.length} label="live routes" />}
      />

      <View style={styles.metricRow}>
        <MetricPill value={items.reduce((count, item) => count + item.pointCount, 0)} label="stops shown" />
        <MetricPill value={uniqueCities || 0} label="cities" />
        <MetricPill value={items.reduce((count, item) => count + item.mediaCount, 0)} label="photos mapped" />
      </View>

      <SectionCard
        title="Featured route"
        subtitle="This is the primary mobile card pattern: map first, storyteller and route stats always visible."
        action={<Button label="Refresh" variant="ghost" onPress={onRefresh} />}
      >
        {featuredItem ? (
          <Pressable style={styles.featuredCard} onPress={() => void onOpenPost(featuredItem.id)}>
            <RoutePreview points={featuredItem.trip.routePreview} height={220} />
            <View style={styles.featuredBody}>
              <View style={styles.featuredHeader}>
                <View style={styles.authorRow}>
                  <MonogramAvatar name={featuredItem.author.displayName} size={42} />
                  <View style={styles.authorText}>
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
            title="No routes in the feed yet"
            description="Seed demo data, then come back here to inspect the mobile feed layout."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Latest routes"
        subtitle="Compact cards keep the storyteller, time range, and stop count readable on a phone."
      >
        {secondaryItems.length ? (
          secondaryItems.map((item) => (
            <Pressable key={item.id} style={styles.feedCard} onPress={() => void onOpenPost(item.id)}>
              <RoutePreview points={item.trip.routePreview} height={132} />
              <View style={styles.feedCardBody}>
                <View style={styles.compactHeader}>
                  <View style={styles.authorRow}>
                    <MonogramAvatar name={item.author.displayName} size={34} />
                    <View style={styles.authorText}>
                      <Text style={styles.compactAuthor}>{item.author.displayName}</Text>
                      <Text style={uiStyles.metaText}>
                        {item.cityName || 'Unknown city'} · {formatDateRange(item.trip.startedAt, item.trip.endedAt)}
                      </Text>
                    </View>
                  </View>
                  <Badge label={`${item.pointCount} stops`} />
                </View>

                <Text style={uiStyles.cardTitle}>{item.title}</Text>
                <Text style={uiStyles.cardBodyText}>{item.summary || 'No summary yet.'}</Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaMetric}>{item._count.likes} likes</Text>
                  <Text style={styles.metaMetric}>{item._count.saves} saves</Text>
                  <Text style={styles.metaMetric}>{item.mediaCount} photos</Text>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="Only one route so far"
            description="Create another route from the capture tab to see the stacked feed pattern."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Local preview tools"
        subtitle="Keep the API and seed controls available for local development, but they should sit below the community content."
        action={<Button label="Seed demo" variant="secondary" onPress={onSeedDemo} />}
      >
        <TextInput
          value={apiBaseUrl}
          onChangeText={onChangeApiBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={uiStyles.textInput}
        />
        <Text style={uiStyles.metaText}>
          Android emulator usually uses `http://10.0.2.2:3000/api/v1`. A physical device should use the host machine IP instead of localhost.
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
  authorText: {
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
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  compactAuthor: {
    color: '#173430',
    fontWeight: '800',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaMetric: {
    color: '#6c7b77',
    fontSize: 13,
    fontWeight: '600',
  },
});
