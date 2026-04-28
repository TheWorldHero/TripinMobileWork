import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoutePreview } from '../../components/RoutePreview';
import { Badge, EmptyState, HeroCard, SectionCard, uiStyles } from '../../components/Ui';
import { formatDateRange } from '../../lib/format';
import type { Trip } from '../../types';

interface MyScreenProps {
  trips: Trip[];
  onOpenTrip: (tripId: string) => void | Promise<void>;
}

export function MyScreen({ trips, onOpenTrip }: MyScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="My routes"
        subtitle="Drafts and published content live together here for the local MVP."
      />

      <SectionCard title="My content" subtitle="The local frontend uses the fixed user id demo-user.">
        {trips.length ? (
          trips.map((trip) => (
            <Pressable key={trip.id} style={styles.myTripCard} onPress={() => void onOpenTrip(trip.id)}>
              <RoutePreview points={trip.routePreview} height={120} />
              <Text style={uiStyles.cardTitle}>{trip.title}</Text>
              <Text style={uiStyles.metaText}>{formatDateRange(trip.startedAt, trip.endedAt)}</Text>
              <Text style={uiStyles.cardBodyText}>{trip.summary || 'No summary yet.'}</Text>
              <View style={uiStyles.rowWrap}>
                <Badge label={trip.status} />
                <Badge label={`${trip.pointCount} stops`} />
                <Badge label={trip.visibility} />
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="No routes yet"
            description="Create your first route in the studio tab, or seed demo data to inspect the UI."
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  myTripCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#e6dbcc',
    gap: 12,
  },
});
