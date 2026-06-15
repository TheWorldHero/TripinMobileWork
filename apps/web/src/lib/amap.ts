import { AMAP_JS_KEY, AMAP_JS_SECURITY_CODE } from './config';

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
  return Boolean(AMAP_JS_KEY);
}

/**
 * 按需加载高德地图 JS API（带安全密钥与常用插件）。
 * - 未配置 Key 或在服务端：返回 null（调用方回退到路线示意图）。
 * - 加载失败：返回 null，不抛错。
 * 结果缓存，重复调用复用同一次加载。
 */
export function loadAmap(): Promise<any | null> {
  if (typeof window === 'undefined' || !AMAP_JS_KEY) {
    return Promise.resolve(null);
  }
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (amapPromise) {
    return amapPromise;
  }

  amapPromise = new Promise((resolve) => {
    if (AMAP_JS_SECURITY_CODE) {
      window._AMapSecurityConfig = { securityJsCode: AMAP_JS_SECURITY_CODE };
    }
    const script = document.createElement('script');
    const plugins = 'AMap.PlaceSearch,AMap.AutoComplete,AMap.Geocoder';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(AMAP_JS_KEY)}&plugin=${plugins}`;
    script.async = true;
    script.onload = () => resolve(window.AMap ?? null);
    script.onerror = () => {
      amapPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return amapPromise;
}
