import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RoutePreview } from '../../components/RoutePreview';
import { Badge, Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../../components/Ui';
import { formatCoordinates, formatDateRange } from '../../lib/format';
import {
  createBlankMediaDraft,
  createDemoMediaDrafts,
  type DraftMediaItem,
  type ManualPointForm,
} from '../studio-state';
import type { Trip } from '../../types';

interface StudioScreenProps {
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
  manualPoint: ManualPointForm;
  onChangeManualPoint: (updater: (prev: ManualPointForm) => ManualPointForm) => void;
  onAddManualPoint: () => void | Promise<void>;
  onPublishTrip: () => void | Promise<void>;
  studioTrip: Trip | null;
}

export function StudioScreen({
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
  manualPoint,
  onChangeManualPoint,
  onAddManualPoint,
  onPublishTrip,
  studioTrip,
}: StudioScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="Route studio"
        subtitle="Create a draft first, then decide whether to keep it private or publish it."
      />

      <SectionCard
        title="1. Basic info"
        subtitle="This becomes the route title and summary."
        action={<Button label="Create draft" variant="secondary" onPress={onCreateDraftTrip} />}
      >
        <TextInput value={tripTitle} onChangeText={onChangeTripTitle} style={uiStyles.textInput} />
        <TextInput
          value={tripSummary}
          onChangeText={onChangeTripSummary}
          style={[uiStyles.textInput, uiStyles.multilineInput]}
          multiline
        />
        <TextInput value={tripCity} onChangeText={onChangeTripCity} style={uiStyles.textInput} />
        <Button label="Quick-build and publish a sample route" onPress={onQuickBuild} />
      </SectionCard>

      <SectionCard
        title="2. Media time and coordinates"
        subtitle="Sync the photo metadata first, then let the backend group it into route points."
        action={<Button label="Sync media" variant="secondary" onPress={onUploadDraftMedia} />}
      >
        <View style={uiStyles.rowWrap}>
          <Button
            label="Use Beijing sample set"
            variant="ghost"
            onPress={() => onChangeDraftMedia(() => createDemoMediaDrafts())}
          />
          <Button
            label="Add blank item"
            variant="ghost"
            onPress={() => onChangeDraftMedia((prev) => [...prev, createBlankMediaDraft()])}
          />
        </View>

        {draftMedia.map((item, index) => (
          <View key={item.localId} style={styles.mediaDraftCard}>
            <Text style={styles.mediaDraftTitle}>Media item {index + 1}</Text>
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
            <Text style={uiStyles.metaText}>
              {item.uploadedMediaId ? `Synced: ${item.uploadedMediaId}` : 'Not synced yet'}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard
        title="3. Auto-group and manual fixes"
        subtitle="The backend groups points; the user confirms and tweaks them."
        action={<Button label="Auto group" variant="secondary" onPress={onAutoAssemble} />}
      >
        <Text style={uiStyles.metaText}>
          Auto-grouping uses time gaps and coordinate changes to build the timeline.
        </Text>

        <View style={styles.manualPointCard}>
          <Text style={uiStyles.cardTitle}>Add one manual stop</Text>
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
            placeholder="Custom place name"
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
          />
          <View style={uiStyles.inlineInputs}>
            <TextInput
              value={manualPoint.latitude}
              onChangeText={(value) =>
                onChangeManualPoint((prev) => ({ ...prev, latitude: value }))
              }
              style={[uiStyles.textInput, uiStyles.halfInput]}
              placeholder="Latitude"
            />
            <TextInput
              value={manualPoint.longitude}
              onChangeText={(value) =>
                onChangeManualPoint((prev) => ({ ...prev, longitude: value }))
              }
              style={[uiStyles.textInput, uiStyles.halfInput]}
              placeholder="Longitude"
            />
          </View>
          <Button label="Add manual stop" variant="ghost" onPress={onAddManualPoint} />
        </View>
      </SectionCard>

      <SectionCard
        title="4. Current route preview"
        subtitle="This is the first draft of the map-first detail experience."
        action={<Button label="Publish to feed" onPress={onPublishTrip} />}
      >
        {studioTrip ? (
          <>
            <RoutePreview points={studioTrip.routePreview} height={180} />
            <Text style={uiStyles.cardTitle}>{studioTrip.title}</Text>
            <Text style={uiStyles.cardBodyText}>{studioTrip.summary || 'No summary yet.'}</Text>
            <View style={uiStyles.rowWrap}>
              <Badge label={studioTrip.cityName || 'Unknown city'} />
              <Badge label={studioTrip.status} />
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
            description="Create a draft, sync media, then auto-group it into route points."
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mediaDraftCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5d7c7',
    backgroundColor: '#fffdf8',
    gap: 10,
  },
  mediaDraftTitle: {
    color: '#71542f',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  manualPointCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5d7c7',
    backgroundColor: '#fffdf8',
    gap: 10,
  },
  timelinePoint: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#143f3a',
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ece2d4',
  },
  timelineTitle: {
    color: '#173430',
    fontWeight: '800',
    fontSize: 16,
  },
});

