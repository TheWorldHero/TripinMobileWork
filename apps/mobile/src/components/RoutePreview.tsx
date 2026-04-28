import { memo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoutePreviewPoint } from '../types';

interface RoutePreviewProps {
  points?: RoutePreviewPoint[] | null;
  height?: number;
  selectedPointId?: string | null;
  onPointPress?: (pointId: string) => void;
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
    <View style={[styles.board, { height }]} onLayout={handleLayout}>
      <View style={styles.gridBackground} />
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />
      <View style={styles.gridVerticalA} />
      <View style={styles.gridVerticalB} />
      <View style={styles.gridHorizontalA} />
      <View style={styles.gridHorizontalB} />

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

        return (
          <View
            key={`line-${point.sequence}-${nextPoint.sequence}`}
            style={[
              styles.routeLine,
              {
                left: point.x + deltaX / 2 - length / 2,
                top: point.y + deltaY / 2 - 1.5,
                width: length,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
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
            left: point.x - 13,
            top: point.y - 13,
          },
        ];
        const labelStyle = [
          styles.routePointLabel,
          isStart ? styles.routePointLabelLight : isEnd ? styles.routePointLabelDark : null,
          isSelected ? styles.routePointLabelSelected : null,
        ];
        const label = isStart ? 'S' : isEnd ? 'E' : point.sequence;

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
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ede4d4',
    borderWidth: 1,
    borderColor: '#e0d2bf',
    position: 'relative',
  },
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.94,
    backgroundColor: '#f1e8da',
  },
  glowTopRight: {
    position: 'absolute',
    right: -30,
    top: -18,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: '#f6d6a3',
    opacity: 0.45,
  },
  glowBottomLeft: {
    position: 'absolute',
    left: -18,
    bottom: -20,
    width: 136,
    height: 110,
    borderRadius: 999,
    backgroundColor: '#c8d8d0',
    opacity: 0.5,
  },
  gridVerticalA: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '24%',
    width: 1,
    backgroundColor: '#ddcfb9',
  },
  gridVerticalB: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '70%',
    width: 1,
    backgroundColor: '#ddcfb9',
  },
  gridHorizontalA: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '34%',
    height: 1,
    backgroundColor: '#ddcfb9',
  },
  gridHorizontalB: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '68%',
    height: 1,
    backgroundColor: '#ddcfb9',
  },
  routeLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#11443f',
    borderRadius: 999,
  },
  routePoint: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#fffaf1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#11443f',
  },
  routePointStart: {
    backgroundColor: '#173f39',
  },
  routePointEnd: {
    backgroundColor: '#d9b67d',
    borderColor: '#8d5f1f',
  },
  routePointSelected: {
    width: 32,
    height: 32,
    borderWidth: 4,
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  routePointLabel: {
    color: '#173430',
    fontSize: 11,
    fontWeight: '800',
  },
  routePointLabelLight: {
    color: '#fff9f0',
  },
  routePointLabelDark: {
    color: '#5a3a12',
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
    backgroundColor: '#fffaf1',
    borderWidth: 2,
    borderColor: '#c0af97',
  },
  placeholderLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#d4c4ae',
    borderRadius: 999,
  },
  placeholderLabel: {
    marginTop: 8,
    color: '#7a857f',
    fontSize: 13,
    fontWeight: '600',
  },
});
