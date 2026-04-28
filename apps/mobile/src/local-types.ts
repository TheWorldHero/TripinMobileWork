export interface DraftMediaItem {
  localId: string;
  originalName: string;
  caption: string;
  takenAt: string;
  latitude: string;
  longitude: string;
  uploadedMediaId?: string;
}

export interface ManualPointForm {
  title: string;
  customPlaceName: string;
  note: string;
  startedAt: string;
  latitude: string;
  longitude: string;
}

export function createDemoMediaDrafts(): DraftMediaItem[] {
  return [
    {
      localId: 'draft-temple',
      originalName: 'temple-morning.jpg',
      caption: '天坛晨光和刚开始热起来的空气。',
      takenAt: '2026-04-07T07:18',
      latitude: '39.882245',
      longitude: '116.406605',
    },
    {
      localId: 'draft-qianmen',
      originalName: 'qianmen-noon.jpg',
      caption: '午后走到前门，吃完饭慢慢继续逛。',
      takenAt: '2026-04-07T13:10',
      latitude: '39.899051',
      longitude: '116.397942',
    },
    {
      localId: 'draft-shichahai',
      originalName: 'shichahai-evening.jpg',
      caption: '傍晚走到湖边，最适合把一天收住。',
      takenAt: '2026-04-07T18:35',
      latitude: '39.948698',
      longitude: '116.379151',
    },
  ];
}

export function createBlankMediaDraft(): DraftMediaItem {
  return {
    localId: `draft-${Date.now()}`,
    originalName: `memory-${Date.now()}.jpg`,
    caption: '',
    takenAt: '2026-04-07T09:00',
    latitude: '',
    longitude: '',
  };
}

export function createBlankManualPoint(): ManualPointForm {
  return {
    title: '',
    customPlaceName: '',
    note: '',
    startedAt: '2026-04-07T20:00',
    latitude: '',
    longitude: '',
  };
}
