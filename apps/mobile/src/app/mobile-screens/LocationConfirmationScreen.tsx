import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Badge,
  Button,
  EmptyState,
  HeroCard,
  SectionCard,
  uiStyles,
} from '../../components/MobileUi';
import { RoutePreview } from '../../components/RoutePreview';
import { TripinMapView } from '../../native/TripinMapView';
import type { DraftPoint, PlaceSearchResult } from '../../types';

type Coordinate = {
  latitude: number;
  longitude: number;
};

interface LocationConfirmationScreenProps {
  amapConfigured: boolean;
  draftPoint: DraftPoint;
  selectedCoordinate: Coordinate | null;
  placeQuery: string;
  suggestions: PlaceSearchResult[];
  selectedPlace: PlaceSearchResult | null;
  onBack: () => void;
  onChangePlaceQuery: (value: string) => void;
  onSearchPlaces: () => void | Promise<void>;
  onSelectPlace: (place: PlaceSearchResult) => void;
  onUseCurrentLocation: () => void | Promise<void>;
  onConfirm: () => void | Promise<void>;
}

export function LocationConfirmationScreen({
  amapConfigured,
  draftPoint,
  selectedCoordinate,
  placeQuery,
  suggestions,
  selectedPlace,
  onBack,
  onChangePlaceQuery,
  onSearchPlaces,
  onSelectPlace,
  onUseCurrentLocation,
  onConfirm,
}: LocationConfirmationScreenProps) {
  const mapMarker =
    selectedCoordinate == null
      ? []
      : [
          {
            id: draftPoint.id,
            latitude: selectedCoordinate.latitude,
            longitude: selectedCoordinate.longitude,
            title: (selectedPlace?.name ?? draftPoint.title) || '待确认位置',
          },
        ];

  const previewPoints =
    selectedCoordinate == null
      ? []
      : [
          {
            pointId: draftPoint.id,
            sequence: 1,
            latitude: selectedCoordinate.latitude,
            longitude: selectedCoordinate.longitude,
          },
        ];

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <Button label="返回社区" variant="ghost" onPress={onBack} />

      <HeroCard
        eyebrow="位置确认"
        title="先确认这个点落在哪里"
        subtitle="地图只在这个任务页出现。首页仍然保持内容流，记录动作被压缩成一个明确步骤。"
        aside={<Badge label={draftPoint.status} tone="accent" />}
      />

      <SectionCard
        title="地图定位"
        subtitle="优先接住草稿点，再用当前位置、搜索或推荐地点把它补成可入线的真实地点。"
      >
        <View style={styles.mapFrame}>
          {amapConfigured ? (
            <TripinMapView style={styles.mapView} markers={mapMarker} />
          ) : (
            <RoutePreview points={previewPoints} height={280} />
          )}
        </View>
        <View style={uiStyles.rowWrap}>
          <Badge label={`${draftPoint.mediaCount} 张图片`} />
          <Badge label={selectedPlace?.name ?? '待选地点'} tone="dark" />
          <Badge
            label={selectedCoordinate ? '已锁定坐标' : '等待选点'}
            tone={selectedCoordinate ? 'accent' : 'default'}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="地点搜索"
        subtitle="可以直接用推荐地点，也可以手动搜索一个更具体的 POI。"
        action={<Button label="搜索地点" variant="secondary" onPress={onSearchPlaces} />}
      >
        <TextInput
          value={placeQuery}
          onChangeText={onChangePlaceQuery}
          placeholder="搜索故宫、长城、咖啡馆..."
          placeholderTextColor="#8a938f"
          autoCorrect={false}
          autoCapitalize="none"
          style={uiStyles.textInput}
        />
        <Button label="使用当前位置" variant="ghost" onPress={onUseCurrentLocation} />
      </SectionCard>

      <SectionCard
        title="位置建议"
        subtitle="先给附近真实地点，再让你一键确认。没有 key 时也保留流程骨架，不会把主链路卡死。"
      >
        {suggestions.length ? (
          <View style={styles.suggestionList}>
            {suggestions.map((place) => {
              const active = selectedPlace?.name === place.name;
              return (
                <View key={`${place.provider}-${place.providerId ?? place.name}`} style={styles.suggestionCard}>
                  <View style={styles.suggestionCopy}>
                    <Text style={styles.suggestionTitle}>{place.name}</Text>
                    <Text style={uiStyles.metaText}>
                      {place.formattedAddress || [place.cityName, place.districtName].filter(Boolean).join(' · ') || '未提供地址'}
                    </Text>
                  </View>
                  <Button
                    label={active ? '已选中' : '选择'}
                    variant={active ? 'secondary' : 'ghost'}
                    onPress={() => onSelectPlace(place)}
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            title="还没有地点建议"
            description="先搜索地点，或者用当前位置给这个点补上一个可用的真实坐标。"
          />
        )}
      </SectionCard>

      <SectionCard
        title="完成这个点"
        subtitle="确认后会根据当前是否存在编辑中的线路，轻量询问它是加入当前线还是先放入收集箱。"
      >
        <Button label="确认地点并继续" stretch onPress={onConfirm} />
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mapFrame: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5d7c2',
    backgroundColor: '#f3eadc',
  },
  mapView: {
    height: 280,
    width: '100%',
  },
  suggestionList: {
    gap: 10,
  },
  suggestionCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
    gap: 12,
  },
  suggestionCopy: {
    gap: 4,
  },
  suggestionTitle: {
    color: '#143430',
    fontSize: 17,
    fontWeight: '800',
  },
});
