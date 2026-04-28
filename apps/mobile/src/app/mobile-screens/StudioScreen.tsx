import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RoutePreview } from '../../components/RoutePreview';
import {
  Badge,
  Button,
  EmptyState,
  HeroCard,
  MetricPill,
  SectionCard,
  uiStyles,
} from '../../components/MobileUi';
import { formatCoordinates, formatDateRange } from '../../lib/display';
import {
  createBlankMediaDraft,
  createDemoMediaDrafts,
  type DraftMediaItem,
  type ManualPointForm,
} from '../studio-state';
import type { PlaceSearchResult, Trip } from '../../types';

interface StudioScreenProps {
  amapConfigured: boolean;
  tripTitle: string;
  tripSummary: string;
  tripCity: string;
  onChangeTripTitle: (value: string) => void;
  onChangeTripSummary: (value: string) => void;
  onChangeTripCity: (value: string) => void;
  onCreateDraftTrip: () => void | Promise<void>;
  onQuickBuild: () => void | Promise<void>;
  draftMedia: DraftMediaItem[];
  onChangeDraftMedia: (updater: (items: DraftMediaItem[]) => DraftMediaItem[]) => void;
  onUploadDraftMedia: () => void | Promise<void>;
  onAutoAssemble: () => void | Promise<void>;
  placeQuery: string;
  onChangePlaceQuery: (value: string) => void;
  onSearchPlaces: () => void | Promise<void>;
  placeResults: PlaceSearchResult[];
  selectedPlace: PlaceSearchResult | null;
  onSelectPlace: (place: PlaceSearchResult) => void;
  onClearSelectedPlace: () => void;
  selectedPlaceMapPreviewUrl: string | null;
  manualPoint: ManualPointForm;
  onChangeManualPoint: (updater: (prev: ManualPointForm) => ManualPointForm) => void;
  onAddManualPoint: () => void | Promise<void>;
  onPublishTrip: () => void | Promise<void>;
  routeMapPreviewUrl: string | null;
  studioTrip: Trip | null;
}

export function StudioScreen({
  amapConfigured,
  tripTitle,
  tripSummary,
  tripCity,
  onChangeTripTitle,
  onChangeTripSummary,
  onChangeTripCity,
  onCreateDraftTrip,
  onQuickBuild,
  draftMedia,
  onChangeDraftMedia,
  onUploadDraftMedia,
  onAutoAssemble,
  placeQuery,
  onChangePlaceQuery,
  onSearchPlaces,
  placeResults,
  selectedPlace,
  onSelectPlace,
  onClearSelectedPlace,
  selectedPlaceMapPreviewUrl,
  manualPoint,
  onChangeManualPoint,
  onAddManualPoint,
  onPublishTrip,
  routeMapPreviewUrl,
  studioTrip,
}: StudioScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="Build a route on the go"
        subtitle="This mobile creator flow moves from trip identity to media strip, then grouping actions, then live route preview."
        aside={<MetricPill value={studioTrip?.pointCount ?? 0} label="stops now" />}
      />

      <View style={styles.metricRow}>
        <MetricPill value={draftMedia.length} label="media drafts" />
        <MetricPill value={studioTrip?.pointCount ?? 0} label="route stops" />
        <MetricPill value={studioTrip?.status ?? 'none'} label="status" />
      </View>

      <SectionCard
        title="Trip identity"
        subtitle="Start with the essentials: title, summary, and city. Create the draft before syncing media."
        action={<Button label="Create draft" variant="secondary" onPress={onCreateDraftTrip} />}
      >
        <TextInput
          value={tripTitle}
          onChangeText={onChangeTripTitle}
          style={uiStyles.textInput}
          placeholder="Route title"
        />
        <TextInput
          value={tripSummary}
          onChangeText={onChangeTripSummary}
          style={[uiStyles.textInput, uiStyles.multilineInput]}
          multiline
          placeholder="What does this route feel like?"
        />
        <TextInput
          value={tripCity}
          onChangeText={onChangeTripCity}
          style={uiStyles.textInput}
          placeholder="City"
        />
        <Button label="Quick-build sample route" stretch onPress={onQuickBuild} />
      </SectionCard>

      <SectionCard
        title="Memory strip"
        subtitle="Use the sample set or add your own metadata. This later becomes image picking and EXIF parsing."
      >
        <View style={styles.actionRow}>
          <Button
            label="Use sample set"
            variant="ghost"
            onPress={() => onChangeDraftMedia(() => createDemoMediaDrafts())}
          />
          <Button
            label="Add blank item"
            variant="ghost"
            onPress={() => onChangeDraftMedia((prev) => [...prev, createBlankMediaDraft()])}
          />
          <Button label="Sync media" variant="secondary" onPress={onUploadDraftMedia} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaStrip}
        >
          {draftMedia.map((item, index) => (
            <View key={item.localId} style={styles.mediaCard}>
              <View style={styles.mediaCardHeader}>
                <Text style={styles.mediaCardStep}>Media {index + 1}</Text>
                <Badge label={item.uploadedMediaId ? 'synced' : 'draft'} tone={item.uploadedMediaId ? 'dark' : 'accent'} />
              </View>

              <TextInput
                value={item.originalName}
                onChangeText={(value) =>
                  onChangeDraftMedia((prev) =>
                    prev.map((draft) =>
                      draft.localId === item.localId ? { ...draft, originalName: value } : draft,
                    ),
                  )
                }
                style={uiStyles.textInput}
                placeholder="Photo file name"
              />
              <TextInput
                value={item.caption}
                onChangeText={(value) =>
                  onChangeDraftMedia((prev) =>
                    prev.map((draft) =>
                      draft.localId === item.localId ? { ...draft, caption: value } : draft,
                    ),
                  )
                }
                style={[uiStyles.textInput, uiStyles.multilineInput]}
                multiline
                placeholder="Short memory note"
              />
              <TextInput
                value={item.takenAt}
                onChangeText={(value) =>
                  onChangeDraftMedia((prev) =>
                    prev.map((draft) =>
                      draft.localId === item.localId ? { ...draft, takenAt: value } : draft,
                    ),
                  )
                }
                style={uiStyles.textInput}
                placeholder="2026-04-07T13:10"
              />
              <View style={uiStyles.inlineInputs}>
                <TextInput
                  value={item.latitude}
                  onChangeText={(value) =>
                    onChangeDraftMedia((prev) =>
                      prev.map((draft) =>
                        draft.localId === item.localId ? { ...draft, latitude: value } : draft,
                      ),
                    )
                  }
                  style={[uiStyles.textInput, uiStyles.halfInput]}
                  placeholder="Latitude"
                />
                <TextInput
                  value={item.longitude}
                  onChangeText={(value) =>
                    onChangeDraftMedia((prev) =>
                      prev.map((draft) =>
                        draft.localId === item.localId ? { ...draft, longitude: value } : draft,
                      ),
                    )
                  }
                  style={[uiStyles.textInput, uiStyles.halfInput]}
                  placeholder="Longitude"
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </SectionCard>

      <SectionCard
        title="Route actions"
        subtitle="These actions mirror the creator workflow: group the media into stops, then publish the route."
      >
        <View style={styles.actionRow}>
          <Button label="Auto-group route" variant="secondary" onPress={onAutoAssemble} />
          <Button label="Publish route" onPress={onPublishTrip} />
        </View>
      </SectionCard>

      <SectionCard
        title="AMap place finder"
        subtitle="Search a real POI, review the map preview, then inject it into the next manual stop."
      >
        <TextInput
          value={placeQuery}
          onChangeText={onChangePlaceQuery}
          style={uiStyles.textInput}
          placeholder="Search a POI, district, or landmark"
        />
        <View style={styles.actionRow}>
          <Button label="Search AMap" variant="secondary" onPress={onSearchPlaces} />
          {selectedPlace ? (
            <Button label="Clear selected place" variant="ghost" onPress={onClearSelectedPlace} />
          ) : null}
        </View>
        <Text style={styles.helperText}>
          {amapConfigured
            ? 'AMap is active. Search results come from AMap first, with local places merged in.'
            : 'AMap is not configured yet. Set AMAP_WEB_SERVICE_KEY in the backend environment to enable live POI search and static map previews.'}
        </Text>

        {selectedPlace ? (
          <View style={styles.selectedPlaceCard}>
            <View style={styles.mediaCardHeader}>
              <Text style={styles.mediaCardStep}>Selected place</Text>
              <Badge label={selectedPlace.source} tone={selectedPlace.source === 'amap' ? 'dark' : 'accent'} />
            </View>
            <Text style={uiStyles.cardTitle}>{selectedPlace.name}</Text>
            <Text style={uiStyles.cardBodyText}>
              {selectedPlace.formattedAddress || 'No address details returned yet.'}
            </Text>
            <Text style={uiStyles.metaText}>
              {formatCoordinates(selectedPlace.latitude, selectedPlace.longitude)}
            </Text>
            {selectedPlaceMapPreviewUrl ? (
              <Image
                source={{ uri: selectedPlaceMapPreviewUrl }}
                style={styles.staticMapImage}
                resizeMode="cover"
              />
            ) : null}
          </View>
        ) : null}

        {placeResults.length ? (
          <View style={styles.placeResultList}>
            {placeResults.map((place) => {
              const isSelected =
                selectedPlace?.provider === place.provider &&
                selectedPlace?.providerId === place.providerId &&
                selectedPlace?.name === place.name;

              return (
                <Pressable
                  key={`${place.provider}-${place.providerId ?? place.name}-${place.latitude ?? 'na'}`}
                  style={[styles.placeResultCard, isSelected ? styles.placeResultCardSelected : null]}
                  onPress={() => onSelectPlace(place)}
                >
                  <View style={styles.mediaCardHeader}>
                    <Text style={styles.placeResultTitle}>{place.name}</Text>
                    <Badge label={place.source} tone={place.source === 'amap' ? 'dark' : 'accent'} />
                  </View>
                  <Text style={uiStyles.cardBodyText}>
                    {place.formattedAddress || `${place.cityName || ''} ${place.districtName || ''}`.trim() || 'No address'}
                  </Text>
                  <Text style={uiStyles.metaText}>
                    {formatCoordinates(place.latitude, place.longitude)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Add a manual stop"
        subtitle="This is the fallback interaction when the user wants to correct or add a place by hand."
        action={<Button label="Add stop" variant="ghost" onPress={onAddManualPoint} />}
      >
        <TextInput
          value={manualPoint.title}
          onChangeText={(value) => onChangeManualPoint((prev) => ({ ...prev, title: value }))}
          style={uiStyles.textInput}
          placeholder="Stop title"
        />
        <TextInput
          value={manualPoint.customPlaceName}
          onChangeText={(value) =>
            onChangeManualPoint((prev) => ({ ...prev, customPlaceName: value }))
          }
          style={uiStyles.textInput}
          placeholder="Manual place name"
        />
        <TextInput
          value={manualPoint.note}
          onChangeText={(value) => onChangeManualPoint((prev) => ({ ...prev, note: value }))}
          style={[uiStyles.textInput, uiStyles.multilineInput]}
          multiline
          placeholder="Short note"
        />
        <TextInput
          value={manualPoint.startedAt}
          onChangeText={(value) =>
            onChangeManualPoint((prev) => ({ ...prev, startedAt: value }))
          }
          style={uiStyles.textInput}
          placeholder="2026-04-07T20:00"
        />
        <View style={uiStyles.inlineInputs}>
          <TextInput
            value={manualPoint.latitude}
            onChangeText={(value) => onChangeManualPoint((prev) => ({ ...prev, latitude: value }))}
            style={[uiStyles.textInput, uiStyles.halfInput]}
            placeholder="Latitude"
          />
          <TextInput
            value={manualPoint.longitude}
            onChangeText={(value) => onChangeManualPoint((prev) => ({ ...prev, longitude: value }))}
            style={[uiStyles.textInput, uiStyles.halfInput]}
            placeholder="Longitude"
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Live route preview"
        subtitle="The creator always sees the route shape and stop order updating below the editing controls."
      >
        {studioTrip ? (
          <>
            {routeMapPreviewUrl ? (
              <Image
                source={{ uri: routeMapPreviewUrl }}
                style={styles.routeMapImage}
                resizeMode="cover"
              />
            ) : (
              <RoutePreview points={studioTrip.routePreview} height={210} />
            )}
            <Text style={uiStyles.cardTitle}>{studioTrip.title}</Text>
            <Text style={uiStyles.cardBodyText}>{studioTrip.summary || 'No summary yet.'}</Text>
            <View style={uiStyles.rowWrap}>
              <Badge label={studioTrip.cityName || 'Unknown city'} />
              <Badge label={studioTrip.status} tone={studioTrip.status === 'PUBLISHED' ? 'dark' : 'accent'} />
              <Badge label={`${studioTrip.pointCount} stops`} />
            </View>
            {studioTrip.points.map((point) => (
              <View key={point.id} style={styles.timelinePoint}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {point.title || point.customPlaceName || point.place?.name || 'Untitled stop'}
                  </Text>
                  <Text style={uiStyles.metaText}>
                    {formatDateRange(point.startedAt, point.endedAt)} ·{' '}
                    {formatCoordinates(point.latitude, point.longitude)}
                  </Text>
                  <Text style={uiStyles.cardBodyText}>{point.note || 'No note for this stop yet.'}</Text>
                  <Text style={uiStyles.metaText}>
                    {point.mediaAssets.length || point.mediaCount} media · {point.sourceType}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <EmptyState
            title="No draft route yet"
            description="Create a route draft, sync media, then auto-group the route to see this creator view come alive."
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaStrip: {
    gap: 12,
    paddingRight: 6,
  },
  mediaCard: {
    width: 292,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
    gap: 10,
  },
  mediaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  mediaCardStep: {
    color: '#79572c',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timelinePoint: {
    flexDirection: 'row',
    gap: 12,
  },
  helperText: {
    color: '#6f6a62',
    fontSize: 12,
    lineHeight: 18,
  },
  selectedPlaceCard: {
    gap: 8,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#fff7ec',
    borderWidth: 1,
    borderColor: '#ead8bf',
  },
  placeResultList: {
    gap: 10,
  },
  placeResultCard: {
    gap: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fffef7',
    borderWidth: 1,
    borderColor: '#eadfcd',
  },
  placeResultCardSelected: {
    borderColor: '#153f39',
    backgroundColor: '#f3f8f6',
  },
  placeResultTitle: {
    flex: 1,
    color: '#143430',
    fontWeight: '800',
    fontSize: 15,
  },
  staticMapImage: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    backgroundColor: '#e7e1d6',
  },
  routeMapImage: {
    width: '100%',
    height: 210,
    borderRadius: 24,
    backgroundColor: '#e7e1d6',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#153f39',
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eadfcd',
  },
  timelineTitle: {
    color: '#143430',
    fontWeight: '800',
    fontSize: 16,
  },
});
