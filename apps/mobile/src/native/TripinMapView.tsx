import { useMemo } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import TripinAmapView, {
  type TripinMapMarker,
  type TripinMapPolyline,
} from '../../modules/tripin-amap';

export type TripinMapViewProps = {
  style?: StyleProp<ViewStyle>;
  markers?: TripinMapMarker[];
  polylines?: TripinMapPolyline[];
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
};

const AMAP_JS_KEY = process.env.EXPO_PUBLIC_AMAP_JS_KEY ?? '';
const AMAP_SECURITY_CODE = process.env.EXPO_PUBLIC_AMAP_SECURITY_CODE ?? '';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildAmapHtml(markers: TripinMapMarker[], polylines: TripinMapPolyline[]) {
  const safeMarkers = JSON.stringify(markers);
  const safePolylines = JSON.stringify(polylines);
  const title = markers.length ? `${markers.length} points` : 'TripIn map';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; background: #eef3f7; }
      .amap-marker-label {
        border: 0 !important;
        background: transparent !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .tripin-map-label {
        padding: 4px 9px;
        border-radius: 999px;
        background: rgba(16, 24, 40, 0.92);
        color: #fff;
        font: 600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 8px 18px rgba(16, 24, 40, 0.22);
        white-space: nowrap;
      }
      .tripin-map-label.pending {
        background: #2563eb;
      }
      .fallback {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667085;
        font: 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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

      function getNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }

      function markerPosition(marker) {
        const latitude = getNumber(marker.latitude);
        const longitude = getNumber(marker.longitude);
        if (latitude === null || longitude === null) return null;
        return [longitude, latitude];
      }

      function renderFallback(message) {
        document.body.innerHTML = '<div class="fallback">' + message + '</div>';
      }

      function escapeText(value) {
        return String(value)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      if (!window.AMap) {
        renderFallback('地图加载中，请检查网络');
      } else {
        const positions = markers.map(markerPosition).filter(Boolean);
        const map = new AMap.Map('map', {
          viewMode: '2D',
          zoom: positions.length ? 13 : 12,
          center: positions[0] || defaultCenter,
          resizeEnable: true,
          mapStyle: 'amap://styles/normal'
        });

        map.on('click', (event) => {
          if (!window.ReactNativeWebView || !event.lnglat) return;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapPress',
            latitude: event.lnglat.getLat(),
            longitude: event.lnglat.getLng()
          }));
        });

        markers.forEach((marker, index) => {
          const position = markerPosition(marker);
          if (!position) return;
          new AMap.Marker({
            map,
            position,
            title: marker.title || 'Point ' + (index + 1),
            label: {
              direction: 'top',
              content: '<div class="tripin-map-label ' + (marker.id === 'selected-coordinate' ? 'pending' : '') + '">' +
                escapeText(marker.title || index + 1) +
                '</div>'
            }
          });
        });

        polylines.forEach((polyline) => {
          const path = (polyline.coordinates || [])
            .map((point) => {
              const latitude = getNumber(point.latitude);
              const longitude = getNumber(point.longitude);
              return latitude === null || longitude === null ? null : [longitude, latitude];
            })
            .filter(Boolean);
          if (path.length < 2) return;
          new AMap.Polyline({
            map,
            path,
            strokeColor: polyline.color || '#14443f',
            strokeWeight: polyline.width || 7,
            strokeOpacity: 0.95,
            lineJoin: 'round'
          });
          positions.push(...path);
        });

        if (positions.length > 1) {
          map.setFitView(null, false, [42, 42, 42, 42]);
        }
      }
    </script>
  </body>
</html>`;
}

export function TripinMapView({ style, markers = [], polylines = [], onMapPress }: TripinMapViewProps) {
  const html = useMemo(() => buildAmapHtml(markers, polylines), [markers, polylines]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        latitude?: number;
        longitude?: number;
      };
      if (
        payload.type === 'mapPress' &&
        typeof payload.latitude === 'number' &&
        typeof payload.longitude === 'number'
      ) {
        onMapPress?.({ latitude: payload.latitude, longitude: payload.longitude });
      }
    } catch {
      // Ignore messages that are not emitted by our map bridge.
    }
  }

  if (Platform.OS === 'web') {
    return <View style={style} />;
  }

  if (Platform.OS === 'android') {
    return (
      <WebView
        style={style}
        source={{ html, baseUrl: 'https://webapi.amap.com/' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        onMessage={handleMessage}
      />
    );
  }

  return <TripinAmapView style={style} markers={markers} polylines={polylines} />;
}
