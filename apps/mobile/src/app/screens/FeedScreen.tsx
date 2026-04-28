import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RoutePreview } from '../../components/RoutePreview';
import { Badge, Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../../components/Ui';
import { formatDateRange } from '../../lib/format';
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
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="Map-first life timeline"
        subtitle="Turn trips, city walks, and daily movement into a route you can revisit."
      />

      <SectionCard
        title="Local setup"
        subtitle="If the feed is empty, seed the local database with demo content."
        action={<Button label="Seed demo data" variant="secondary" onPress={onSeedDemo} />}
      >
        <Text style={uiStyles.metaText}>
          The API base URL is editable so you can switch between localhost, emulator, and LAN URLs.
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
        title="Home feed"
        subtitle="Each card represents a whole route, not just a loose image gallery."
        action={<Button label="Refresh" variant="ghost" onPress={onRefresh} />}
      >
        {items.length ? (
          items.map((item) => (
            <Pressable key={item.id} style={styles.feedCard} onPress={() => void onOpenPost(item.id)}>
              <RoutePreview points={item.trip.routePreview} height={150} />
              <View style={styles.feedCardBody}>
                <Text style={uiStyles.cardTitle}>{item.title}</Text>
                <Text style={uiStyles.cardBodyText}>{item.summary || 'No summary yet.'}</Text>
                <View style={uiStyles.rowWrap}>
                  <Badge label={item.cityName || 'Unknown city'} />
                  <Badge label={`${item.pointCount} stops`} />
                  <Badge label={`${item.mediaCount} photos`} />
                </View>
                <Text style={uiStyles.metaText}>
                  {item.author.displayName} · {formatDateRange(item.trip.startedAt, item.trip.endedAt)}
                </Text>
                <Text style={uiStyles.metaText}>
                  {item._count.likes} likes · {item._count.saves} saves · {item._count.comments} comments
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="No feed items yet"
            description="Seed demo data above, or create and publish your first route from the studio tab."
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

