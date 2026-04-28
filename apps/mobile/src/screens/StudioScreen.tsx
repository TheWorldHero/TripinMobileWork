import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RoutePreview } from '../components/RoutePreview';
import { Badge, Button, EmptyState, HeroCard, SectionCard, uiStyles } from '../components/Ui';
import { formatCoordinates, formatDateRange } from '../lib/format';
import type { DraftMediaItem, ManualPointForm } from '../local-types';
import { createBlankMediaDraft, createDemoMediaDrafts } from '../local-types';
import type { Trip } from '../types';

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
        title="轨迹工作台"
        subtitle="先整理草稿，再决定是私密保存还是发布到信息流。"
      />

      <SectionCard
        title="1. 基本信息"
        subtitle="这部分会成为轨迹的标题和摘要。"
        action={<Button label="创建草稿" variant="secondary" onPress={onCreateDraftTrip} />}
      >
        <TextInput value={tripTitle} onChangeText={onChangeTripTitle} style={uiStyles.textInput} />
        <TextInput
          value={tripSummary}
          onChangeText={onChangeTripSummary}
          style={[uiStyles.textInput, uiStyles.multilineInput]}
          multiline
        />
        <TextInput value={tripCity} onChangeText={onChangeTripCity} style={uiStyles.textInput} />
        <Button label="一键生成并发布样例轨迹" onPress={onQuickBuild} />
      </SectionCard>

      <SectionCard
        title="2. 照片时间和坐标"
        subtitle="先把照片当成素材同步到后端，再让系统按时间和位置自动聚合。"
        action={<Button label="同步照片" variant="secondary" onPress={onUploadDraftMedia} />}
      >
        <View style={uiStyles.rowWrap}>
          <Button
            label="使用北京示例素材"
            variant="ghost"
            onPress={() => onChangeDraftMedia(() => createDemoMediaDrafts())}
          />
          <Button
            label="添加一张空白素材"
            variant="ghost"
            onPress={() => onChangeDraftMedia((prev) => [...prev, createBlankMediaDraft()])}
          />
        </View>

        {draftMedia.map((item, index) => (
          <View key={item.localId} style={styles.mediaDraftCard}>
            <Text style={styles.mediaDraftTitle}>素材 {index + 1}</Text>
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
                placeholder="纬度"
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
                placeholder="经度"
              />
            </View>
            <Text style={uiStyles.metaText}>
              {item.uploadedMediaId ? `已同步：${item.uploadedMediaId}` : '还未同步到后端'}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard
        title="3. 自动聚合与手动补点"
        subtitle="系统负责聚类，用户负责确认和微调。"
        action={<Button label="自动聚合" variant="secondary" onPress={onAutoAssemble} />}
      >
        <Text style={uiStyles.metaText}>
          自动聚合会按照照片时间间隔和坐标变化生成轨迹点。
        </Text>

        <View style={styles.manualPointCard}>
          <Text style={uiStyles.cardTitle}>手动补一个地点</Text>
          <TextInput
            value={manualPoint.title}
            onChangeText={(value) => onChangeManualPoint((prev) => ({ ...prev, title: value }))}
            style={uiStyles.textInput}
            placeholder="地点标题"
          />
          <TextInput
            value={manualPoint.customPlaceName}
            onChangeText={(value) =>
              onChangeManualPoint((prev) => ({ ...prev, customPlaceName: value }))
            }
            style={uiStyles.textInput}
            placeholder="自定义地点名"
          />
          <TextInput
            value={manualPoint.note}
            onChangeText={(value) => onChangeManualPoint((prev) => ({ ...prev, note: value }))}
            style={[uiStyles.textInput, uiStyles.multilineInput]}
            multiline
            placeholder="一句描述"
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
              placeholder="纬度"
            />
            <TextInput
              value={manualPoint.longitude}
              onChangeText={(value) =>
                onChangeManualPoint((prev) => ({ ...prev, longitude: value }))
              }
              style={[uiStyles.textInput, uiStyles.halfInput]}
              placeholder="经度"
            />
          </View>
          <Button label="补一个手动地点" variant="ghost" onPress={onAddManualPoint} />
        </View>
      </SectionCard>

      <SectionCard
        title="4. 当前轨迹预览"
        subtitle="这部分就是地图优先、时间线辅助的详情页雏形。"
        action={<Button label="发布到信息流" onPress={onPublishTrip} />}
      >
        {studioTrip ? (
          <>
            <RoutePreview points={studioTrip.routePreview} height={180} />
            <Text style={uiStyles.cardTitle}>{studioTrip.title}</Text>
            <Text style={uiStyles.cardBodyText}>{studioTrip.summary || '还没有摘要'}</Text>
            <View style={uiStyles.rowWrap}>
              <Badge label={studioTrip.cityName || '未命名城市'} />
              <Badge label={studioTrip.status} />
              <Badge label={`${studioTrip.pointCount} 个点`} />
            </View>
            {studioTrip.points.map((point) => (
              <View key={point.id} style={styles.timelinePoint}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {point.title || point.customPlaceName || point.place?.name || '未命名地点'}
                  </Text>
                  <Text style={uiStyles.metaText}>
                    {formatDateRange(point.startedAt, point.endedAt)} ·{' '}
                    {formatCoordinates(point.latitude, point.longitude)}
                  </Text>
                  <Text style={uiStyles.cardBodyText}>{point.note || '还没有补充描述。'}</Text>
                  <Text style={uiStyles.metaText}>
                    {point.mediaAssets.length || point.mediaCount} 张素材 · {point.sourceType}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <EmptyState
            title="还没有轨迹草稿"
            description="先创建草稿，再同步照片并自动聚合。"
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
