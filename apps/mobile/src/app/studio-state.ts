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
      caption: 'Soft morning light at the Temple of Heaven.',
      takenAt: '2026-04-07T07:18',
      latitude: '39.882245',
      longitude: '116.406605',
    },
    {
      localId: 'draft-qianmen',
      originalName: 'qianmen-noon.jpg',
      caption: 'Walk through Qianmen after lunch.',
      takenAt: '2026-04-07T13:10',
      latitude: '39.899051',
      longitude: '116.397942',
    },
    {
      localId: 'draft-shichahai',
      originalName: 'shichahai-evening.jpg',
      caption: 'An evening walk by the lake in Shichahai.',
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

