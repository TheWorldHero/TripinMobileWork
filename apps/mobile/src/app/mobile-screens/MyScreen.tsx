import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import type { LineDetail, Trip } from '../../types';

interface MyScreenProps {
  activeLine?: LineDetail | null;
  trips: Trip[];
  onOpenLineEditor?: () => void | Promise<void>;
  onOpenTrip: (tripId: string) => void | Promise<void>;
}

export function MyScreen({ trips, activeLine, onOpenLineEditor, onOpenTrip }: MyScreenProps) {
  const draftTrips = trips.filter((trip) => trip.status === 'DRAFT');
  const publishedTrips = trips.filter((trip) => trip.status === 'PUBLISHED');
  const highlightedTrip = draftTrips[0] ?? publishedTrips[0] ?? null;

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="My route space"
        subtitle="Drafts and published tracks stay together so you can move from capture to sharing without leaving the app."
        aside={<MonogramAvatar name="Demo User" size={52} />}
      />

      <View style={styles.metricRow}>
        <MetricPill value={trips.length} label="routes" />
        <MetricPill value={draftTrips.length} label="drafts" />
        <MetricPill value={publishedTrips.length} label="published" />
      </View>

      {activeLine ? (
        <SectionCard
          title="Current line editor"
          subtitle="Map editing now lives in its own task screen, separate from the community homepage."
          action={
            onOpenLineEditor ? <Button label="Open line editor" onPress={onOpenLineEditor} /> : undefined
          }
        >
          <View style={styles.tripCard}>
            <View style={styles.tripCardTop}>
              <View style={styles.tripMeta}>
                <Text style={styles.tripTitle}>{activeLine.title}</Text>
                <Text style={uiStyles.metaText}>
                  {activeLine.points.length} points · {activeLine.routeSegments.length} route segments
                </Text>
              </View>
              <Badge label={activeLine.status || 'DRAFT'} tone="accent" />
            </View>
            <Text style={uiStyles.cardBodyText}>
              {activeLine.summary || 'Continue shaping the line on map and pull inbox points in when needed.'}
            </Text>
          </View>
        </SectionCard>
      ) : null}

      {highlightedTrip ? (
        <SectionCard
          title={highlightedTrip.status === 'DRAFT' ? 'Continue editing' : 'Latest published route'}
          subtitle="A full-width route card helps you jump straight back into the route editor."
          action={<Button label="Open route" onPress={() => void onOpenTrip(highlightedTrip.id)} />}
        >
          <Pressable style={styles.highlightCard} onPress={() => void onOpenTrip(highlightedTrip.id)}>
            <RoutePreview points={highlightedTrip.routePreview} height={180} />
            <View style={styles.highlightBody}>
              <Text style={uiStyles.cardTitle}>{highlightedTrip.title}</Text>
              <Text style={uiStyles.cardBodyText}>
                {highlightedTrip.summary || 'No summary yet.'}
              </Text>
              <View style={uiStyles.rowWrap}>
                <Badge label={highlightedTrip.status} tone={highlightedTrip.status === 'DRAFT' ? 'accent' : 'dark'} />
                <Badge label={`${highlightedTrip.pointCount} stops`} />
                <Badge label={highlightedTrip.visibility} />
              </View>
            </View>
          </Pressable>
        </SectionCard>
      ) : null}

      <SectionCard title="Drafts" subtitle="Private working copies stay here until you publish them.">
        {draftTrips.length ? (
          draftTrips.map((trip) => (
            <Pressable key={trip.id} style={styles.tripCard} onPress={() => void onOpenTrip(trip.id)}>
              <View style={styles.tripCardTop}>
                <View style={styles.tripMeta}>
                  <Text style={styles.tripTitle}>{trip.title}</Text>
                  <Text style={uiStyles.metaText}>{formatDateRange(trip.startedAt, trip.endedAt)}</Text>
                </View>
                <Badge label={`${trip.pointCount} stops`} tone="accent" />
              </View>
              <Text style={uiStyles.cardBodyText}>{trip.summary || 'No summary yet.'}</Text>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="No drafts yet"
            description="Start a new route from the capture tab and it will appear here."
          />
        )}
      </SectionCard>

      <SectionCard title="Published routes" subtitle="These are ready for the public feed.">
        {publishedTrips.length ? (
          publishedTrips.map((trip) => (
            <Pressable key={trip.id} style={styles.tripCard} onPress={() => void onOpenTrip(trip.id)}>
              <View style={styles.tripCardTop}>
                <View style={styles.tripMeta}>
                  <Text style={styles.tripTitle}>{trip.title}</Text>
                  <Text style={uiStyles.metaText}>{formatDateRange(trip.startedAt, trip.endedAt)}</Text>
                </View>
                <Badge label={`${trip.mediaCount} photos`} tone="dark" />
              </View>
              <Text style={uiStyles.cardBodyText}>{trip.summary || 'No summary yet.'}</Text>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="Nothing published yet"
            description="Publish your first route from the capture tab to populate this shelf."
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  highlightCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eadcca',
  },
  highlightBody: {
    padding: 16,
    gap: 10,
  },
  tripCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
    gap: 10,
  },
  tripCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  tripMeta: {
    flex: 1,
    gap: 4,
  },
  tripTitle: {
    color: '#173430',
    fontWeight: '800',
    fontSize: 18,
  },
});
