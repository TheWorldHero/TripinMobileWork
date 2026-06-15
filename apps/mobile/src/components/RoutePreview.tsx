import { memo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoutePreviewPoint } from '../types';

interface RoutePreviewProps {
  points?: RoutePreviewPoint[] | null;
  height?: number;
  selectedPointId?: string | null;
  onPointPress?: (pointId: string) => void;
  surface?: 'feed' | 'panel';
}

interface RenderPoint {
  x: number;
  y: number;
  pointId: string;
  sequence: number;
}

function normalizePoints(points: RoutePreviewPoint[], width: number, height: number): RenderPoint[] {
  if (points.length === 1) {
    return [
      {
        x: width / 2,
        y: height / 2,
        pointId: points[0].pointId,
        sequence: points[0].sequence,
      },
    ];
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const horizontalPadding = 20;
  const verticalPadding = 18;
  const usableWidth = width - horizontalPadding * 2;
  const usableHeight = height - verticalPadding * 2;

  return points.map((point) => {
    const lngRatio = maxLng === minLng ? 0.5 : (point.longitude - minLng) / (maxLng - minLng);
    const latRatio = maxLat === minLat ? 0.5 : (point.latitude - minLat) / (maxLat - minLat);

    return {
      x: horizontalPadding + usableWidth * lngRatio,
      y: verticalPadding + usableHeight * (1 - latRatio),
      pointId: point.pointId,
      sequence: point.sequence,
    };
  });
}

export const RoutePreview = memo(function RoutePreview({
  points,
  height = 180,
  selectedPointId,
  onPointPress,
  surface = 'panel',
}: RoutePreviewProps) {
  const [boardWidth, setBoardWidth] = useState(320);
  const routePoints = points ?? [];
  const renderPoints = normalizePoints(routePoints, boardWidth, height);

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.max(event.nativeEvent.layout.width, 220);
    if (Math.abs(nextWidth - boardWidth) > 1) {
      setBoardWidth(nextWidth);
    }
  }

  return (
    <View style={[styles.board, surface === 'feed' ? styles.boardFeed : styles.boardPanel, { height }]} onLayout={handleLayout}>
      <View style={styles.mapBase} />
      <View style={styles.mapWater} />
      <View style={styles.mapPark} />
      <View style={[styles.mapParcel, styles.mapParcelA]} />
      <View style={[styles.mapParcel, styles.mapParcelB]} />
      <View style={[styles.mapParcel, styles.mapParcelC]} />
      <View style={[styles.mapRoad, styles.mapRoadMain]} />
      <View style={[styles.mapRoad, styles.mapRoadCross]} />
      <View style={[styles.mapRoad, styles.mapRoadSoft]} />
      <View style={[styles.mapRoad, styles.mapRoadFineA]} />
      <View style={[styles.mapRoad, styles.mapRoadFineB]} />

      {!renderPoints.length ? (
        <View style={styles.placeholderWrap}>
          <View style={styles.placeholderRoute}>
            <View style={[styles.placeholderMarker, { left: 20, top: 22 }]} />
            <View style={[styles.placeholderLine, { width: 120, left: 30, top: 30, transform: [{ rotate: '16deg' }] }]} />
            <View style={[styles.placeholderMarker, { left: 142, top: 54 }]} />
            <View style={[styles.placeholderLine, { width: 90, left: 154, top: 72, transform: [{ rotate: '-18deg' }] }]} />
            <View style={[styles.placeholderMarker, { left: 238, top: 42 }]} />
          </View>
          <Text style={styles.placeholderLabel}>地图预览将在这里显示</Text>
        </View>
      ) : null}

      {renderPoints.map((point, index) => {
        const nextPoint = renderPoints[index + 1];

        if (!nextPoint) {
          return null;
        }

        const deltaX = nextPoint.x - point.x;
        const deltaY = nextPoint.y - point.y;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);

        const segmentStyle = {
          left: point.x + deltaX / 2 - length / 2,
          top: point.y + deltaY / 2 - 3,
          width: length,
          transform: [{ rotate: `${angle}rad` }],
        };

        return (
          <View key={`line-${point.sequence}-${nextPoint.sequence}`}>
            <View style={[styles.routeLineShadow, segmentStyle]} />
            <View style={[styles.routeLine, segmentStyle]} />
          </View>
        );
      })}

      {renderPoints.map((point, index) => {
        const isStart = index === 0;
        const isEnd = index === renderPoints.length - 1;
        const isSelected = selectedPointId === point.pointId;
        const nodeStyle = [
          styles.routePoint,
          isStart ? styles.routePointStart : isEnd ? styles.routePointEnd : null,
          isSelected ? styles.routePointSelected : null,
          {
            left: point.x - (isSelected ? 16 : 13),
            top: point.y - (isSelected ? 16 : 13),
          },
        ];
        const labelStyle = [
          styles.routePointLabel,
          isStart ? styles.routePointLabelLight : isEnd ? styles.routePointLabelDark : null,
          isSelected ? styles.routePointLabelSelected : null,
        ];
        const label = isStart ? '起' : isEnd ? '终' : point.sequence;

        if (onPointPress) {
          return (
            <Pressable
              key={`point-${point.pointId}`}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => onPointPress(point.pointId)}
              style={nodeStyle}
            >
              <Text style={labelStyle}>{label}</Text>
            </Pressable>
          );
        }

        return (
          <View key={`point-${point.pointId}`} style={nodeStyle}>
            <Text style={labelStyle}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  board: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#eef7ff',
    position: 'relative',
  },
  boardFeed: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#dbeafe',
  },
  boardPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7e6ff',
  },
  mapBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eef7ff',
  },
  mapWater: {
    position: 'absolute',
    left: '-10%',
    right: '-8%',
    top: '38%',
    height: 34,
    borderRadius: 999,
    backgroundColor: '#d6efff',
    transform: [{ rotate: '-7deg' }],
  },
  mapPark: {
    position: 'absolute',
    right: '-10%',
    bottom: '-14%',
    width: '46%',
    height: '52%',
    borderRadius: 80,
    backgroundColor: '#e7f6ed',
  },
  mapParcel: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.34)',
  },
  mapParcelA: {
    left: -24,
    top: 12,
    width: '45%',
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
  },
  mapParcelB: {
    right: -18,
    top: 18,
    width: '38%',
    height: '34%',
    backgroundColor: 'rgba(255, 255, 255, 0.44)',
  },
  mapParcelC: {
    left: '26%',
    bottom: -16,
    width: '52%',
    height: '36%',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  mapRoad: {
    position: 'absolute',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  mapRoadMain: {
    left: -20,
    right: -20,
    top: '50%',
    transform: [{ rotate: '-5deg' }],
  },
  mapRoadCross: {
    left: '18%',
    width: '78%',
    top: '28%',
    transform: [{ rotate: '16deg' }],
  },
  mapRoadSoft: {
    left: '-8%',
    width: '64%',
    top: '72%',
    opacity: 0.78,
    transform: [{ rotate: '9deg' }],
  },
  mapRoadFineA: {
    left: '36%',
    width: '72%',
    top: '61%',
    height: 4,
    opacity: 0.72,
    transform: [{ rotate: '-3deg' }],
  },
  mapRoadFineB: {
    left: '-14%',
    width: '58%',
    top: '18%',
    height: 4,
    opacity: 0.62,
    transform: [{ rotate: '19deg' }],
  },
  routeLineShadow: {
    position: 'absolute',
    height: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.18)',
    borderRadius: 999,
  },
  routeLine: {
    position: 'absolute',
    height: 7,
    backgroundColor: '#1d4ed8',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  routePoint: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1d4ed8',
    elevation: 2,
  },
  routePointStart: {
    backgroundColor: '#1d4ed8',
  },
  routePointEnd: {
    backgroundColor: '#0284c7',
    borderColor: '#0369a1',
  },
  routePointSelected: {
    width: 32,
    height: 32,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#1d4ed8',
    shadowColor: '#0284c7',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  routePointLabel: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800',
  },
  routePointLabelLight: {
    color: '#fff',
  },
  routePointLabelDark: {
    color: '#fff',
  },
  routePointLabelSelected: {
    color: '#fff',
  },
  placeholderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderRoute: {
    width: 280,
    height: 96,
    position: 'relative',
  },
  placeholderMarker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  placeholderLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#bfdbfe',
    borderRadius: 999,
  },
  placeholderLabel: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
