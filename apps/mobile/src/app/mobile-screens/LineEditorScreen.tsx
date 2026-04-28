import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { canPublishLine } from '../line-editor-state';
import type { LineDetail, PointRecord } from '../../types';

type MoveDirection = 'up' | 'down';

interface LineEditorScreenProps {
  amapConfigured: boolean;
  line: LineDetail | null;
  inboxPoints: PointRecord[];
  onBack: () => void;
  onAddPoint: () => void | Promise<void>;
  onPublish: () => void | Promise<void>;
  onRefreshRoutes: () => void | Promise<void>;
  onAttachPoint: (pointId: string) => void | Promise<void>;
  onMovePoint: (pointId: string, direction: MoveDirection) => void | Promise<void>;
  onRemovePoint: (pointId: string) => void | Promise<void>;
}

function parsePolyline(polyline: string) {
  return polyline
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [longitude, latitude] = pair.split(',');
      const parsedLongitude = Number(longitude);
      const parsedLatitude = Number(latitude);

      if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
        return null;
      }

      return {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      };
    })
    .filter((point): point is { latitude: number; longitude: number } => point !== null);
}

export function LineEditorScreen({
  amapConfigured,
  line,
  inboxPoints,
  onBack,
  onAddPoint,
  onPublish,
  onRefreshRoutes,
  onAttachPoint,
  onMovePoint,
  onRemovePoint,
}: LineEditorScreenProps) {
  if (!line) {
    return (
      <ScrollView contentContainerStyle={uiStyles.scrollContent}>
        <Button label="返回" variant="ghost" onPress={onBack} />
        <EmptyState
          title="还没有可编辑的线路"
          description="先创建一条线路草稿，再把已补完位置的点拖进来。"
        />
      </ScrollView>
    );
  }

  const markers = line.points
    .filter(
      (point): point is typeof point & { latitude: number; longitude: number } =>
        typeof point.latitude === 'number' && typeof point.longitude === 'number',
    )
    .map((point) => ({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      title: point.title || `第 ${point.sequence + 1} 站`,
      subtitle: point.checkInAt || undefined,
    }));

  const polylines = line.routeSegments
    .map((segment) => ({
      id: segment.id,
      coordinates: parsePolyline(segment.polyline),
      color: segment.provider === 'FALLBACK' ? '#7f8c88' : '#14443f',
      width: segment.provider === 'FALLBACK' ? 4 : 6,
    }))
    .filter((segment) => segment.coordinates.length >= 2);

  const previewPoints = markers.map((marker, index) => ({
    pointId: marker.id,
    sequence: index + 1,
    latitude: marker.latitude,
    longitude: marker.longitude,
  }));

  const publishReady = canPublishLine(line.points);

  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <Button label="返回" variant="ghost" onPress={onBack} />

      <HeroCard
        eyebrow="线路编辑"
        title={line.title}
        subtitle={line.summary || '把点补齐、重排并刷新路径后，这条线才能稳定回看与发布。'}
        aside={<Badge label={publishReady ? '可发布' : '待补信息'} tone={publishReady ? 'accent' : 'dark'} />}
      />

      <SectionCard
        title="地图画布"
        subtitle="地图只在编辑任务里作为主视图出现，负责看点位关系、检查路径和刷新几何结果。"
        action={<Button label="刷新路径" variant="secondary" onPress={onRefreshRoutes} />}
      >
        <View style={styles.mapFrame}>
          {amapConfigured ? (
            <TripinMapView style={styles.mapView} markers={markers} polylines={polylines} />
          ) : (
            <RoutePreview points={previewPoints} height={300} />
          )}
        </View>
        <View style={uiStyles.rowWrap}>
          <Badge label={`${line.points.length} 个点`} />
          <Badge label={`${line.routeSegments.length} 段路径`} tone="accent" />
          <Badge label={publishReady ? '所有点已可入线' : '还有点待补信息'} tone="dark" />
        </View>
        <View style={styles.controlStack}>
          <Button label="补录一个点" stretch onPress={onAddPoint} />
          <Button
            label="发布线路"
            stretch
            variant="secondary"
            disabled={!publishReady}
            onPress={onPublish}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="线内点位"
        subtitle="顺序就是叙事节奏。每次调整后都会失效旧路径，等你重新刷新。"
      >
        {line.points.length ? (
          <View style={styles.pointList}>
            {line.points.map((point, index) => (
              <View key={point.id} style={styles.pointCard}>
                <View style={styles.pointHeader}>
                  <View style={styles.pointMeta}>
                    <Text style={styles.pointTitle}>{point.title || `第 ${index + 1} 站`}</Text>
                    <Text style={uiStyles.metaText}>
                      {point.checkInAt || point.capturedAt || '未补时间'}
                    </Text>
                  </View>
                  <Badge
                    label={point.state}
                    tone={point.state === 'READY_FOR_LINE' ? 'accent' : 'default'}
                  />
                </View>

                <View style={uiStyles.rowWrap}>
                  <Button label="上移" variant="ghost" onPress={() => onMovePoint(point.id, 'up')} />
                  <Button label="下移" variant="ghost" onPress={() => onMovePoint(point.id, 'down')} />
                  <Button label="移出" variant="secondary" onPress={() => onRemovePoint(point.id)} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="线路里还没有点"
            description="先从下方收集箱拉一个点进来，或者直接补录一个新点。"
          />
        )}
      </SectionCard>

      <SectionCard
        title="收集箱"
        subtitle="这里保留未入线的点。补好位置后可以随时拉进当前线路，不必离开这个上下文。"
      >
        {inboxPoints.length ? (
          <View style={styles.pointList}>
            {inboxPoints.map((point) => (
              <View key={point.id} style={styles.pointCard}>
                <View style={styles.pointHeader}>
                  <View style={styles.pointMeta}>
                    <Text style={styles.pointTitle}>{point.title || '未命名点位'}</Text>
                    <Text style={uiStyles.metaText}>
                      {point.checkInAt || point.capturedAt || '待补时间'}
                    </Text>
                  </View>
                  <Badge
                    label={point.state}
                    tone={point.state === 'READY_FOR_LINE' ? 'accent' : 'default'}
                  />
                </View>
                {point.state === 'READY_FOR_LINE' ? (
                  <Button label="加入当前线" variant="secondary" onPress={() => onAttachPoint(point.id)} />
                ) : (
                  <Text style={uiStyles.metaText}>这个点还不能入线，先去补位置或时间。</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="收集箱暂时空了"
            description="新增一个点后，它可以先留在收集箱，也可以立即加入当前线路。"
          />
        )}
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
    backgroundColor: '#f2eadc',
  },
  mapView: {
    width: '100%',
    height: 300,
  },
  controlStack: {
    gap: 10,
  },
  pointList: {
    gap: 12,
  },
  pointCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#eadcca',
    gap: 12,
  },
  pointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  pointMeta: {
    flex: 1,
    gap: 4,
  },
  pointTitle: {
    color: '#173430',
    fontSize: 18,
    fontWeight: '800',
  },
});
