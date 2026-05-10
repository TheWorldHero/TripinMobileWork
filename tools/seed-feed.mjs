// One-shot seeder: creates 4 demo trips with Unsplash images and publishes them.
// Usage: node tools/seed-feed.mjs

const API = 'http://localhost:3001/api/v1';

const TRIPS = [
  {
    author: 'creator-li',
    title: '京都·古寺漫步',
    summary: '一日穿越清水寺到伏见稻荷，秋晴里的红叶与鸟居。',
    cityName: '京都',
    countryCode: 'JP',
    points: [
      { title: '清水寺', lat: 34.9949, lng: 135.7850, note: '舞台上俯瞰京都全景，朝阳里的清水台。', startedAt: '2026-04-12T08:30:00Z', img: 'https://images.unsplash.com/photo-1578469645742-46cae010e5d4?w=1200&q=80&auto=format&fit=crop' },
      { title: '八坂神社', lat: 35.0036, lng: 135.7785, note: '红色楼门和悬挂的灯笼，途中买了一支抹茶冰。', startedAt: '2026-04-12T11:00:00Z', img: 'https://images.unsplash.com/photo-1665706896821-319040b81753?w=1200&q=80&auto=format&fit=crop' },
      { title: '祇园·花见小路', lat: 35.0036, lng: 135.7755, note: '青石板小巷里偶遇舞伎，老木屋安安静静。', startedAt: '2026-04-12T13:00:00Z', img: 'https://images.unsplash.com/photo-1697473690859-2c01f13e2858?w=1200&q=80&auto=format&fit=crop' },
      { title: '伏见稻荷大社', lat: 34.9671, lng: 135.7727, note: '千本鸟居的尽头，黄昏时拍到一张完美的红色长廊。', startedAt: '2026-04-12T16:30:00Z', img: 'https://images.unsplash.com/photo-1542648284-01cca5c1052e?w=1200&q=80&auto=format&fit=crop' },
    ],
  },
  {
    author: 'demo-user',
    title: '重庆·8D 山城夜游',
    summary: '从解放碑爬到洪崖洞，一边走一边吃，最后坐索道过江。',
    cityName: '重庆',
    countryCode: 'CN',
    points: [
      { title: '解放碑', lat: 29.5560, lng: 106.5784, note: '夜里的霓虹灯亮得人睁不开眼，街边一碗小面。', startedAt: '2026-04-25T18:30:00Z', img: 'https://images.unsplash.com/photo-1687352796618-44f14cc7580d?w=1200&q=80&auto=format&fit=crop' },
      { title: '洪崖洞', lat: 29.5641, lng: 106.5821, note: '11 层吊脚楼，灯火映在嘉陵江上像千与千寻。', startedAt: '2026-04-25T20:00:00Z', img: 'https://images.unsplash.com/photo-1613149290339-6b1372ea193a?w=1200&q=80&auto=format&fit=crop' },
      { title: '千厮门大桥', lat: 29.5644, lng: 106.5777, note: '桥上看洪崖洞最佳机位，风很大但景色绝美。', startedAt: '2026-04-25T21:15:00Z', img: 'https://images.unsplash.com/photo-1620321281938-2522ba59a1df?w=1200&q=80&auto=format&fit=crop' },
      { title: '长江索道', lat: 29.5577, lng: 106.5827, note: '怀旧的红色车厢慢慢飞过江面，一头扎进对岸夜色。', startedAt: '2026-04-25T22:00:00Z', img: 'https://images.unsplash.com/photo-1674038316487-00f02f2ab5b9?w=1200&q=80&auto=format&fit=crop' },
    ],
  },
  {
    author: 'creator-li',
    title: '杭州·西湖一日',
    summary: '断桥到雷峰塔，中间在苏堤上骑车，最后在湖心亭看夕阳。',
    cityName: '杭州',
    countryCode: 'CN',
    points: [
      { title: '断桥残雪', lat: 30.2576, lng: 120.1481, note: '柳枝低垂着扫过湖面，远处的孤山很安静。', startedAt: '2026-04-18T09:00:00Z', img: 'https://images.unsplash.com/photo-1731152603302-60bf370dd1f9?w=1200&q=80&auto=format&fit=crop' },
      { title: '苏堤春晓', lat: 30.2497, lng: 120.1346, note: '租了一辆共享单车，沿着堤一路骑到南屏。', startedAt: '2026-04-18T11:00:00Z', img: 'https://images.unsplash.com/photo-1588252910189-9c9f5535646b?w=1200&q=80&auto=format&fit=crop' },
      { title: '雷峰塔', lat: 30.2331, lng: 120.1454, note: '塔上俯瞰全湖，能看到三潭印月的小石塔。', startedAt: '2026-04-18T14:00:00Z', img: 'https://images.unsplash.com/photo-1567975789927-dfaf473ca06e?w=1200&q=80&auto=format&fit=crop' },
      { title: '湖心亭看夕阳', lat: 30.2495, lng: 120.1431, note: '坐手摇船到湖心亭，夕阳把水面染成金色。', startedAt: '2026-04-18T17:30:00Z', img: 'https://images.unsplash.com/photo-1697553263713-80724aea6630?w=1200&q=80&auto=format&fit=crop' },
    ],
  },
  {
    author: 'user-82ef199a950f47e1ae0755e4417a2ce3',
    title: '东京·涩谷到原宿',
    summary: '从涩谷十字路口走到代代木公园，路上吃了三家面包店。',
    cityName: '东京',
    countryCode: 'JP',
    points: [
      { title: '涩谷十字路口', lat: 35.6595, lng: 139.7004, note: '世界最忙的十字，上方天桥拍人潮汹涌。', startedAt: '2026-04-21T10:00:00Z', img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80&auto=format&fit=crop' },
      { title: '表参道', lat: 35.6655, lng: 139.7128, note: '榉树夹道的精品街，安藤忠雄那栋小楼真的很漂亮。', startedAt: '2026-04-21T12:30:00Z', img: 'https://images.unsplash.com/photo-1549693578-d683be217e58?w=1200&q=80&auto=format&fit=crop' },
      { title: '原宿·竹下通', lat: 35.6702, lng: 139.7027, note: '彩虹奶酪三明治，奇怪但是好拍。', startedAt: '2026-04-21T14:00:00Z', img: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=80&auto=format&fit=crop' },
      { title: '代代木公园', lat: 35.6716, lng: 139.6948, note: '坐在草地上看人遛狗、吹萨克斯，下午就这样过完。', startedAt: '2026-04-21T16:00:00Z', img: 'https://images.unsplash.com/photo-1547448526-5e9d57fa28f7?w=1200&q=80&auto=format&fit=crop' },
    ],
  },
];

async function call(method, path, body, userId) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`);
  }
  return json;
}

async function createOnePost(spec) {
  const author = spec.author;
  console.log(`\n=== ${spec.title} (author: ${author}) ===`);

  const trip = await call('POST', '/trips', {
    title: spec.title,
    summary: spec.summary,
    cityName: spec.cityName,
    countryCode: spec.countryCode,
    kind: 'TRAVEL',
    visibility: 'PUBLIC',
    startedAt: spec.points[0].startedAt,
    endedAt: spec.points[spec.points.length - 1].startedAt,
  }, author);
  console.log(`  trip ${trip.id}`);

  for (let i = 0; i < spec.points.length; i++) {
    const p = spec.points[i];

    const media = await call('POST', '/media/assets', {
      originalName: `${trip.id}-${i + 1}.jpg`,
      mimeType: 'image/jpeg',
      bytes: 1,
      tripId: trip.id,
    }, author);
    await call('POST', `/media/assets/${media.id}/mark-ready`, { storageKey: p.img }, author);

    await call('POST', `/trips/${trip.id}/points`, {
      title: p.title,
      note: p.note,
      startedAt: p.startedAt,
      latitude: p.lat,
      longitude: p.lng,
      sourceType: 'MANUAL',
      sequence: i + 1,
      mediaAssetIds: [media.id],
    }, author);
    console.log(`  point ${i + 1}: ${p.title}`);
  }

  const published = await call('POST', `/trips/${trip.id}/publish`, {
    title: spec.title,
    summary: spec.summary,
    visibility: 'PUBLIC',
  }, author);
  console.log(`  published as post`);
  return published;
}

async function main() {
  for (const spec of TRIPS) {
    try {
      await createOnePost(spec);
    } catch (err) {
      console.error(`FAILED ${spec.title}:`, err.message);
      throw err;
    }
  }
  console.log('\nAll 4 posts created.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
