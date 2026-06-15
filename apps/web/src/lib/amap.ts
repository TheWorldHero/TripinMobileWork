import { AMAP_JS_KEY, AMAP_JS_SECURITY_CODE, API_BASE_URL } from './config';

// 高德地图 JS API 没有官方类型，这里用宽松类型描述用到的部分。
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

let amapPromise: Promise<any | null> | null = null;

export function isAmapConfigured(): boolean {
  // 仅同步判断 env 是否提供；真正能否用（含后端下发）以 loadAmap() 的结果为准。
  return Boolean(AMAP_JS_KEY);
}

/**
 * 解析高德 Web JS Key + 安全码：
 * - 优先用构建时注入的 NEXT_PUBLIC_AMAP_JS_KEY（本地想用自己的 key 时）；
 * - 否则从后端 /config/web 拉取（Key 只存服务器，克隆者本地无需持有，连上服务器即可拿到）。
 */
async function resolveKey(): Promise<{ key: string; security: string } | null> {
  if (AMAP_JS_KEY) {
    return { key: AMAP_JS_KEY, security: AMAP_JS_SECURITY_CODE };
  }
  try {
    const response = await fetch(`${API_BASE_URL}/config/web`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as { amapJsKey?: string; amapJsSecurityCode?: string };
    if (data?.amapJsKey) {
      return { key: data.amapJsKey, security: data.amapJsSecurityCode ?? '' };
    }
  } catch {
    // 后端不可达 / 未配置 key：返回 null，地图回退为路线示意图。
  }
  return null;
}

/**
 * 按需加载高德地图 JS API（带安全密钥与常用插件）。
 * 未拿到 Key（env 与后端都没有）或在服务端：返回 null，调用方回退到路线示意图。
 * 结果缓存，重复调用复用同一次加载。
 */
export function loadAmap(): Promise<any | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (amapPromise) {
    return amapPromise;
  }

  amapPromise = (async () => {
    const config = await resolveKey();
    if (!config) {
      amapPromise = null;
      return null;
    }
    return new Promise<any | null>((resolve) => {
      if (config.security) {
        window._AMapSecurityConfig = { securityJsCode: config.security };
      }
      const script = document.createElement('script');
      const plugins = 'AMap.PlaceSearch,AMap.AutoComplete,AMap.Geocoder';
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}&plugin=${plugins}`;
      script.async = true;
      script.onload = () => resolve(window.AMap ?? null);
      script.onerror = () => {
        amapPromise = null;
        resolve(null);
      };
      document.head.appendChild(script);
    });
  })();

  return amapPromise;
}
