import { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import TripinAmapView, {
  type TripinMapMarker,
  type TripinMapPolyline,
} from '../../modules/tripin-amap';
import { RoutePreview } from '../components/RoutePreview';

export type TripinMapPressPayload = {
  latitude: number;
  longitude: number;
  address?: string;
  cityName?: string;
  districtName?: string;
  provinceName?: string;
};

export type TripinMapViewProps = {
  style?: StyleProp<ViewStyle>;
  markers?: TripinMapMarker[];
  polylines?: TripinMapPolyline[];
  onMapPress?: (payload: TripinMapPressPayload) => void;
};

// Set to true once the dev client APK has been rebuilt with the fixed
// modules/tripin-amap Kotlin (FrameLayout.LayoutParams + privacy-init order).
// Until then, the Android native AMap view crashes on layout, so we use the
// WebView path (real AMap via JS API) instead of red-screening 点位创建.
const ANDROID_NATIVE_AMAP_READY = false;

const AMAP_JS_KEY = process.env.EXPO_PUBLIC_AMAP_JS_KEY ?? '';
const AMAP_SECURITY_CODE = process.env.EXPO_PUBLIC_AMAP_SECURITY_CODE ?? '';

export function TripinMapView({ style, markers = [], polylines = [], onMapPress }: TripinMapViewProps) {
  if (Platform.OS === 'web') {
    return <MapFallback style={style} markers={markers} onMapPress={onMapPress} />;
  }

  if (Platform.OS === 'android') {
    if (ANDROID_NATIVE_AMAP_READY) {
      return <TripinAmapView style={style} markers={markers} polylines={polylines} />;
    }
    if (AMAP_JS_KEY) {
      return (
        <AmapWebView
          style={style}
          markers={markers}
          polylines={polylines}
          onMapPress={onMapPress}
        />
      );
    }
    return <MapFallback style={style} markers={markers} onMapPress={onMapPress} />;
  }

  // iOS uses the native AMap module.
  return <TripinAmapView style={style} markers={markers} polylines={polylines} />;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildAmapHtml(markers: TripinMapMarker[], polylines: TripinMapPolyline[]) {
  const safeMarkers = JSON.stringify(markers ?? []);
  const safePolylines = JSON.stringify(polylines ?? []);
  const title = markers.length ? `${markers.length} points` : 'TripIn map';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; background: #eef3f7; }
      .amap-marker-label { border: 0 !important; background: transparent !important; padding: 0 !important; box-shadow: none !important; }
      .tripin-map-label {
        padding: 4px 9px; border-radius: 999px;
        background: rgba(16, 24, 40, 0.92); color: #fff;
        font: 600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 8px 18px rgba(16, 24, 40, 0.22); white-space: nowrap;
      }
      .tripin-map-label.pending { background: #2563eb; }
      .fallback {
        height: 100%; display: flex; align-items: center; justify-content: center;
        color: #667085; font: 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 20px; text-align: center;
      }
    </style>
    <script>
      window._AMapSecurityConfig = { securityJsCode: '${AMAP_SECURITY_CODE}' };
    </script>
    <script src="https://webapi.amap.com/maps?v=2.0&key=${AMAP_JS_KEY}"></script>
  </head>
  <body>
    <div id="map" aria-label="${escapeHtml(title)}"></div>
    <script>
      const markers = ${safeMarkers};
      const polylines = ${safePolylines};
      const defaultCenter = [114.3055, 30.5928];

      function getNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
      function pos(m) { const lat = getNumber(m.latitude), lng = getNumber(m.longitude); return (lat === null || lng === null) ? null : [lng, lat]; }
      function escapeText(v) { return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
      function fail(msg) { document.body.innerHTML = '<div class="fallback">' + msg + '</div>'; }

      if (!window.AMap) {
        fail('地图未加载：请检查网络，或到高德开放平台确认 Key 已开通"Web 端 (JS API)"服务。');
      } else {
        const positions = markers.map(pos).filter(Boolean);
        const map = new AMap.Map('map', {
          viewMode: '2D',
          zoom: positions.length ? 13 : 12,
          center: positions[0] || defaultCenter,
          resizeEnable: true,
          mapStyle: 'amap://styles/normal'
        });

        let geocoder = null;
        AMap.plugin(['AMap.Geocoder'], function () {
          try { geocoder = new AMap.Geocoder({ city: '全国', radius: 1000, extensions: 'base' }); }
          catch (err) { geocoder = null; }
        });

        function postMapPress(lat, lng, extras) {
          if (!window.ReactNativeWebView) return;
          const payload = Object.assign({ type: 'mapPress', latitude: lat, longitude: lng }, extras || {});
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }

        map.on('click', function (e) {
          if (!e.lnglat) return;
          const lat = e.lnglat.getLat();
          const lng = e.lnglat.getLng();
          if (!geocoder) {
            postMapPress(lat, lng);
            return;
          }
          // Run reverse geocoding; respond either with rich payload or coords-only on failure.
          geocoder.getAddress([lng, lat], function (status, result) {
            if (status === 'complete' && result && result.regeocode) {
              const re = result.regeocode;
              const ac = re.addressComponent || {};
              postMapPress(lat, lng, {
                address: re.formattedAddress || '',
                provinceName: ac.province || '',
                cityName: ac.city || ac.province || '',
                districtName: ac.district || ''
              });
            } else {
              postMapPress(lat, lng);
            }
          });
        });

        markers.forEach(function (m, i) {
          const p = pos(m);
          if (!p) return;
          new AMap.Marker({
            map: map, position: p,
            title: m.title || 'Point ' + (i + 1),
            label: {
              direction: 'top',
              content: '<div class="tripin-map-label ' + (m.id === 'selected-coordinate' ? 'pending' : '') + '">' + escapeText(m.title || (i + 1)) + '</div>'
            }
          });
        });

        polylines.forEach(function (poly) {
          const path = (poly.coordinates || []).map(function (c) {
            const lat = getNumber(c.latitude), lng = getNumber(c.longitude);
            return (lat === null || lng === null) ? null : [lng, lat];
          }).filter(Boolean);
          if (path.length < 2) return;
          new AMap.Polyline({
            map: map, path: path,
            strokeColor: poly.color || '#14443f',
            strokeWeight: poly.width || 7,
            strokeOpacity: 0.95,
            lineJoin: 'round'
          });
          positions.push.apply(positions, path);
        });

        if (positions.length > 1) {
          map.setFitView(null, false, [42, 42, 42, 42]);
        }
      }
    </script>
  </body>
</html>`;
}

function AmapWebView({
  style,
  markers,
  polylines,
  onMapPress,
}: TripinMapViewProps) {
  const html = useMemo(
    () => buildAmapHtml(markers ?? [], polylines ?? []),
    [markers, polylines],
  );

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        latitude?: number;
        longitude?: number;
        address?: string;
        cityName?: string;
        districtName?: string;
        provinceName?: string;
      };
      if (
        payload.type === 'mapPress' &&
        typeof payload.latitude === 'number' &&
        typeof payload.longitude === 'number'
      ) {
        onMapPress?.({
          latitude: payload.latitude,
          longitude: payload.longitude,
          address: payload.address || undefined,
          cityName: payload.cityName || undefined,
          districtName: payload.districtName || undefined,
          provinceName: payload.provinceName || undefined,
        });
      }
    } catch {
      // Ignore non-JSON messages.
    }
  }

  return (
    <WebView
      style={[webStyles.web, style]}
      source={{ html, baseUrl: 'https://webapi.amap.com/' }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      geolocationEnabled
      onMessage={handleMessage}
    />
  );
}

const webStyles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#eef3f7' },
});

function MapFallback({
  style,
  markers,
  onMapPress,
}: {
  style?: StyleProp<ViewStyle>;
  markers?: TripinMapMarker[];
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
}) {
  const previewPoints = useMemo(
    () =>
      (markers ?? []).map((marker, index) => ({
        pointId: marker.id,
        sequence: index + 1,
        latitude: marker.latitude,
        longitude: marker.longitude,
      })),
    [markers],
  );

  return (
    <View style={[fallbackStyles.container, style]}>
      {previewPoints.length ? (
        <RoutePreview points={previewPoints} height={220} />
      ) : (
        <View style={fallbackStyles.emptyState}>
          <Text style={fallbackStyles.title}>地图未配置</Text>
          <Text style={fallbackStyles.body}>
            还没配高德 Key 也能用：在下方"生成点位"里输入经纬度（例如 30.5928, 114.3055），点位会自动显示在路线骨架上。
          </Text>
        </View>
      )}
      {onMapPress ? (
        <Pressable
          style={fallbackStyles.tapTarget}
          onPress={() =>
            onMapPress({
              latitude: 30.5928 + Math.random() * 0.02 - 0.01,
              longitude: 114.3055 + Math.random() * 0.02 - 0.01,
            })
          }
        >
          <Text style={fallbackStyles.tapText}>模拟选位（演示）</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#eef3f7',
    overflow: 'hidden',
    padding: 12,
    gap: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  title: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '900',
  },
  body: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 18,
  },
  tapTarget: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  tapText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
