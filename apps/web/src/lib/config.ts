/**
 * 后端 API 基地址（前后端分离的唯一连接点）。
 *
 * 同一份代码，靠环境变量 NEXT_PUBLIC_API_BASE_URL 在本地 / 服务器之间切换，无需改代码：
 *   - 本地开发：   http://localhost:3001/api/v1
 *   - 连服务器后端：http://<公网IP或域名>:3001/api/v1
 *
 * 配置方式见 apps/web/.env.example。
 * 注意：NEXT_PUBLIC_* 变量是「构建时」注入浏览器端的——
 *   · next dev 下改了 .env.local 后重启 dev server 即可生效；
 *   · 要打包部署，请在设好该变量后再 `next build`（client 端的值在 build 时固定）。
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://101.132.146.92:3001/api/v1';

/**
 * 后端站点根（去掉末尾的 /api/v1），用于拼接后端静态资源地址，
 * 例如用户上传图片由后端在 `${API_ORIGIN}/api/uploads/*` 提供。
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

/**
 * 高德地图 Web 端（JS API）Key 与安全密钥，用于工作台的真实地图。
 * 留空时工作台地图自动回退为路线示意图，搜索/坐标加点仍可用。
 * 取值见 apps/web/.env.example（对应移动端的 EXPO_PUBLIC_AMAP_JS_KEY）。
 */
export const AMAP_JS_KEY = process.env.NEXT_PUBLIC_AMAP_JS_KEY?.trim() || '';
export const AMAP_JS_SECURITY_CODE = process.env.NEXT_PUBLIC_AMAP_JS_SECURITY_CODE?.trim() || '';
