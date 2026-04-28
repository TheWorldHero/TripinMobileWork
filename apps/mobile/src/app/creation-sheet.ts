export type CreationActionKey =
  | 'camera'
  | 'album'
  | 'backfill-point'
  | 'resume-line';

export interface CreationAction {
  key: CreationActionKey;
  label: string;
  subtitle: string;
}

export const cameraAction: CreationAction = {
  key: 'camera',
  label: '拍照',
  subtitle: '现场快速生成一个新点',
};

export const albumImportAction: CreationAction = {
  key: 'album',
  label: '相册导入',
  subtitle: '先从已有照片接住草稿点',
};

export const backfillPointAction: CreationAction = {
  key: 'backfill-point',
  label: '补录一个点',
  subtitle: '补上漏记的地点和时间',
};

export const resumeLineAction: CreationAction = {
  key: 'resume-line',
  label: '继续编辑线路',
  subtitle: '回到正在整理的那条线',
};

export const CREATION_ACTIONS: CreationAction[] = [
  cameraAction,
  albumImportAction,
  backfillPointAction,
  resumeLineAction,
];
