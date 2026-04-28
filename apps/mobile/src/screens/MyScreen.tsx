import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { RoutePreview } from '../components/RoutePreview';
import { Badge, EmptyState, HeroCard, SectionCard, uiStyles } from '../components/Ui';
import { formatDateRange } from '../lib/format';
import type { Trip } from '../types';

interface MyScreenProps {
  trips: Trip[];
  onOpenTrip: (tripId: string) => void | Promise<void>;
}

export function MyScreen({ trips, onOpenTrip }: MyScreenProps) {
  return (
    <ScrollView contentContainerStyle={uiStyles.scrollContent}>
      <HeroCard
        title="我的轨迹"
        subtitle="这里聚合你的草稿和已发布内容，适合后续接草稿箱、已发布和收藏。"
      />

      <SectionCard title="我的内容" subtitle="当前登录身份固定为 demo-user。">
        {trips.length ? (
          trips.map((trip) => (
            <Pressable key={trip.id} style={styles.myTripCard} onPress={() => void onOpenTrip(trip.id)}>
              <RoutePreview points={trip.routePreview} height={120} />
              <Text style={uiStyles.cardTitle}>{trip.title}</Text>
              <Text style={uiStyles.metaText}>{formatDateRange(trip.startedAt, trip.endedAt)}</Text>
              <Text style={uiStyles.cardBodyText}>{trip.summary || '还没有摘要。'}</Text>
              <View style={uiStyles.rowWrap}>
                <Badge label={trip.status} />
                <Badge label={`${trip.pointCount} 个点`} />
                <Badge label={trip.visibility} />
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="当前账号还没有轨迹"
            description="到创建页生成自己的第一条轨迹，或者先写入演示数据看效果。"
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

