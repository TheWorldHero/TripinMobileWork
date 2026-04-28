'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  buildRefreshPlan,
  reorderPointIds,
  type RefreshPlanSegment,
  type ReorderDirection,
} from '../editor/line-editor-state';
import { api } from '../lib/api';
import type { RouteDetail, RoutePoint } from '../types';
import { LineEditorMap } from './LineEditorMap';

function formatPointState(state?: string | null) {
  return (
    state
      ?.toLowerCase()
      .replace(/_/g, ' ')
      .replace('recorded only', '仅已记录')
      .replace('pending metadata', '待补信息')
      .replace('ready', '可入线') ?? '待补信息'
  );
}

function formatPointMeta(point: RoutePoint) {
  const time = point.checkInAt ?? point.capturedAt ?? point.startedAt ?? point.endedAt ?? null;
  if (!time) {
    return formatPointState(point.state);
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(time));
}

function hasCoordinates(point: RoutePoint) {
  return typeof point.latitude === 'number' && typeof point.longitude === 'number';
}

function formatLineStatus(status?: string | null) {
  if (!status) {
    return '可继续整理';
  }

  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace('published', '已发布')
    .replace('editing', '编辑中')
    .replace('draft', '草稿')
    .replace('ready', '已就绪');
}

function describeCompletionState(
  line: RouteDetail,
  points: RoutePoint[],
  hasPendingOrder: boolean,
  dirtySegments: RefreshPlanSegment[],
) {
  const positionedCount = points.filter(hasCoordinates).length;

  if (!points.length) {
    return {
      label: '还没有点',
      detail: '先从收集箱加入至少一个点，这条路线才会开始成形。',
    };
  }

  if (hasPendingOrder) {
    return {
      label: '顺序已变更',
      detail: '请先保存新的点位顺序，再把它作为这条路线的最新结构。',
    };
  }

  if (positionedCount !== points.length) {
    return {
      label: '位置未补全',
      detail: `还有 ${points.length - positionedCount} 个点缺少确认坐标，补完后整条线才能完整落到地图上。`,
    };
  }

  const dirtyCount = dirtySegments.filter((segment) => segment.status === 'dirty').length;
  if (dirtyCount > 0) {
    return {
      label: '路线待刷新',
      detail: `目前有 ${dirtyCount} 段路径发生了本地改动，请刷新路线几何结果以同步地图。`,
    };
  }

  return {
    label: formatLineStatus(line.status),
    detail: '点位顺序和确认坐标已经对齐，这条路线可以继续整理或直接发布。',
  };
}

function deriveRouteGeometryDirty(line: RouteDetail) {
  if (line.points.length <= 1) {
    return false;
  }

  return line.routeSegments.length !== line.points.length - 1;
}

type SidebarListProps = {
  points: RoutePoint[];
  inboxPoints: RoutePoint[];
  selectedPointId: string | null;
  dirtySegments: RefreshPlanSegment[];
  hasPendingOrder: boolean;
  isSaving: boolean;
  isRefreshing: boolean;
  isUpdatingLocation: boolean;
  isAttaching: boolean;
  isRemoving: boolean;
  feedback: string | null;
  completionLabel: string;
  completionDetail: string;
  locationDraft: { latitude: string; longitude: string };
  onSelectPoint: (pointId: string) => void;
  onMovePoint: (pointId: string, direction: ReorderDirection) => void;
  onSaveOrder: () => void;
  onRefreshRoutes: () => void;
  onAttachPoint: (pointId: string) => void;
  onRemovePoint: (pointId: string) => void;
  onLocationDraftChange: (next: { latitude: string; longitude: string }) => void;
  onSaveLocation: () => void;
};

export function LineSidebar({
  points,
  inboxPoints,
  selectedPointId,
  dirtySegments,
  hasPendingOrder,
  isSaving,
  isRefreshing,
  isUpdatingLocation,
  isAttaching,
  isRemoving,
  feedback,
  completionLabel,
  completionDetail,
  locationDraft,
  onSelectPoint,
  onMovePoint,
  onSaveOrder,
  onRefreshRoutes,
  onAttachPoint,
  onRemovePoint,
  onLocationDraftChange,
  onSaveLocation,
}: SidebarListProps) {
  const dirtyOnly = dirtySegments.filter((segment) => segment.status === 'dirty');
  const selectedPoint = points.find((point) => point.id === selectedPointId) ?? points[0] ?? null;

  return (
    <aside className="editor-sidebar">
      <section className="editor-panel editor-panel-intro">
        <p className="eyebrow">路线编辑台</p>
        <h1 className="page-title editor-title">先整理点，再让地图追上你的编辑结果。</h1>
        <p className="section-copy">
          这里是明确的任务页面：左边整理点位，右边查看地图，刷新路线也和社区浏览分开处理。
        </p>
      </section>

      <section className="editor-panel editor-panel-status">
        <div className="editor-section-head">
          <p className="eyebrow">完成情况</p>
          <span className="editor-pill">{completionLabel}</span>
        </div>
        <p className="section-copy">{completionDetail}</p>
      </section>

      <section className="editor-panel editor-panel-actions">
        <div className="editor-action-row">
          <button
            className="editor-button editor-button-primary"
            type="button"
            onClick={onSaveOrder}
            disabled={!hasPendingOrder || isSaving}
          >
            {isSaving ? '正在保存顺序...' : hasPendingOrder ? '保存点位顺序' : '顺序已同步'}
          </button>
          <button
            className="editor-button"
            type="button"
            onClick={onRefreshRoutes}
            disabled={hasPendingOrder || isRefreshing}
          >
            {isRefreshing ? '正在刷新路线...' : '刷新路线'}
          </button>
        </div>
        <p className="editor-helper-text">
          {hasPendingOrder
            ? '先保存编辑后的点位顺序，再请求后端重新计算路线几何结果。'
            : '刷新路线会使用已经保存的顺序和当前确认过的位置。'}
        </p>
        {feedback ? <p className="editor-feedback">{feedback}</p> : null}
      </section>

      <section className="editor-panel">
        <div className="editor-section-head">
          <p className="eyebrow">打卡点</p>
          <span className="editor-pill">{points.length} 个点</span>
        </div>
        <div className="editor-point-list">
          {points.map((point, index) => (
            <article
              key={point.id}
              className={`editor-point-card${point.id === selectedPointId ? ' editor-point-card-selected' : ''}`}
            >
              <button
                className="editor-point-card-main"
                type="button"
                onClick={() => onSelectPoint(point.id)}
              >
                <span className="editor-point-index">{String(point.sequence ?? index + 1).padStart(2, '0')}</span>
                <span className="editor-point-copy">
                  <strong>{point.title ?? `第 ${index + 1} 个点`}</strong>
                  <span>{formatPointMeta(point)}</span>
                </span>
              </button>
              <div className="editor-point-actions">
                <button
                  className="editor-mini-button"
                  type="button"
                  onClick={() => onMovePoint(point.id, 'up')}
                  disabled={index === 0}
                >
                  上移
                </button>
                <button
                  className="editor-mini-button"
                  type="button"
                  onClick={() => onMovePoint(point.id, 'down')}
                  disabled={index === points.length - 1}
                >
                  下移
                </button>
                <button
                  className="editor-mini-button"
                  type="button"
                  onClick={() => onRemovePoint(point.id)}
                  disabled={isRemoving}
                >
                  {isRemoving && point.id === selectedPointId ? '正在移除...' : '移除'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="editor-panel editor-panel-location">
        <div className="editor-section-head">
          <p className="eyebrow">修改位置</p>
          <span className="editor-pill">{selectedPoint ? selectedPoint.title ?? '当前选中点' : '未选择点位'}</span>
        </div>
        {selectedPoint ? (
          <div className="editor-location-form">
            <label className="editor-field">
              <span>纬度</span>
              <input
                value={locationDraft.latitude}
                onChange={(event) =>
                  onLocationDraftChange({
                    ...locationDraft,
                    latitude: event.target.value,
                  })
                }
                placeholder="39.9042"
              />
            </label>
            <label className="editor-field">
              <span>经度</span>
              <input
                value={locationDraft.longitude}
                onChange={(event) =>
                  onLocationDraftChange({
                    ...locationDraft,
                    longitude: event.target.value,
                  })
                }
                placeholder="116.4074"
              />
            </label>
            <button
              className="editor-button editor-button-primary"
              type="button"
              onClick={onSaveLocation}
              disabled={isUpdatingLocation}
            >
              {isUpdatingLocation ? '正在保存位置...' : '保存位置'}
            </button>
          </div>
        ) : (
          <p className="section-copy">请先选择一个点，再更新它的确认坐标。</p>
        )}
      </section>

      <section className="editor-panel editor-panel-inbox">
        <div className="editor-section-head">
          <p className="eyebrow">添加点位</p>
          <span className="editor-pill">收集箱 {inboxPoints.length} 个</span>
        </div>
        {inboxPoints.length ? (
          <div className="editor-inbox-list">
            {inboxPoints.slice(0, 4).map((point) => (
              <article key={point.id} className="editor-inbox-card">
                <div>
                  <strong>{point.title ?? '收集箱里的点'}</strong>
                  <p>{formatPointMeta(point)}</p>
                </div>
                <button
                  className="editor-mini-button"
                  type="button"
                  onClick={() => onAttachPoint(point.id)}
                  disabled={isAttaching}
                >
                  {isAttaching ? '正在加入...' : '加入这条线'}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="section-copy">当前收集箱里没有等待加入的点。</p>
        )}
      </section>

      <section className="editor-panel editor-panel-segments">
        <div className="editor-section-head">
          <p className="eyebrow">刷新计划</p>
          <span className="editor-pill">{dirtyOnly.length} 段待刷新</span>
        </div>
        {dirtySegments.length ? (
          <div className="editor-segment-list">
            {dirtySegments.map((segment) => (
              <div
                key={segment.key}
                className={`editor-segment-row${segment.status === 'dirty' ? ' editor-segment-row-dirty' : ''}`}
              >
                <span>{segment.fromPointId}</span>
                <span>到</span>
                <span>{segment.toPointId}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="section-copy">至少加入两个点之后，这里才会显示路径段的刷新计划。</p>
        )}
      </section>
    </aside>
  );
}

type LineEditorStudioProps = {
  initialLine: RouteDetail;
  amapKey: string;
  amapSecurityCode?: string;
};

export function LineEditorStudio({
  initialLine,
  amapKey,
  amapSecurityCode,
}: LineEditorStudioProps) {
  const [line, setLine] = useState(initialLine);
  const [orderedPointIds, setOrderedPointIds] = useState(() => initialLine.points.map((point) => point.id));
  const [selectedPointId, setSelectedPointId] = useState<string | null>(initialLine.points[0]?.id ?? null);
  const [inboxPoints, setInboxPoints] = useState<RoutePoint[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState({ latitude: '', longitude: '' });
  const [routeGeometryDirty, setRouteGeometryDirty] = useState(() => deriveRouteGeometryDirty(initialLine));
  const [isSaving, startSaving] = useTransition();
  const [isRefreshing, startRefreshing] = useTransition();
  const [isAttaching, startAttaching] = useTransition();
  const [isRemoving, startRemoving] = useTransition();
  const [isUpdatingLocation, startUpdatingLocation] = useTransition();

  useEffect(() => {
    void api
      .getInboxPoints()
      .then(setInboxPoints)
      .catch((error) => {
        setFeedback(error instanceof Error ? error.message : '加载收集箱点位失败。');
      });
  }, []);

  const pointLookup = useMemo(
    () => new Map(line.points.map((point) => [point.id, point])),
    [line.points],
  );
  const orderedPoints = useMemo(
    () =>
      orderedPointIds
        .map((pointId) => pointLookup.get(pointId))
        .filter((point): point is RoutePoint => point != null)
        .map((point, index) => ({
          ...point,
          sequence: index + 1,
        })),
    [orderedPointIds, pointLookup],
  );
  const persistedPointIds = useMemo(
    () => line.points.map((point) => point.id),
    [line.points],
  );
  const hasPendingOrder = orderedPointIds.join('|') !== persistedPointIds.join('|');
  const baseRefreshPlan = useMemo(
    () => buildRefreshPlan(persistedPointIds, orderedPointIds),
    [orderedPointIds, persistedPointIds],
  );
  const refreshPlan = useMemo(
    () =>
      routeGeometryDirty
        ? baseRefreshPlan.map((segment) => ({
            ...segment,
            status: 'dirty' as const,
          }))
        : baseRefreshPlan,
    [baseRefreshPlan, routeGeometryDirty],
  );
  const completionState = useMemo(
    () => describeCompletionState(line, orderedPoints, hasPendingOrder, refreshPlan),
    [hasPendingOrder, line, orderedPoints, refreshPlan],
  );
  const selectedPoint = orderedPoints.find((point) => point.id === selectedPointId) ?? orderedPoints[0] ?? null;

  useEffect(() => {
    if (!selectedPoint) {
      setLocationDraft({ latitude: '', longitude: '' });
      return;
    }

    setLocationDraft({
      latitude: selectedPoint.latitude == null ? '' : String(selectedPoint.latitude),
      longitude: selectedPoint.longitude == null ? '' : String(selectedPoint.longitude),
    });
  }, [selectedPoint]);

  const movePoint = (pointId: string, direction: ReorderDirection) => {
    setOrderedPointIds((currentIds) => reorderPointIds(currentIds, pointId, direction));
    setSelectedPointId(pointId);
    setFeedback(null);
  };

  const syncLine = (nextLine: RouteDetail, options?: { markRouteDirty?: boolean }) => {
    setLine(nextLine);
    setOrderedPointIds(nextLine.points.map((point) => point.id));
    setSelectedPointId(nextLine.points[0]?.id ?? null);
    setRouteGeometryDirty(options?.markRouteDirty ?? deriveRouteGeometryDirty(nextLine));
  };

  const saveOrder = () => {
    if (!hasPendingOrder) {
      return;
    }

    startSaving(() => {
      void (async () => {
        try {
          const nextLine = await api.reorderLinePoints(line.id, orderedPointIds);
          syncLine(nextLine, { markRouteDirty: true });
          setFeedback('点位顺序已保存，现在可以刷新路线。');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '保存点位顺序失败。');
        }
      })();
    });
  };

  const refreshRoutes = () => {
    if (hasPendingOrder) {
      setFeedback('请先保存点位顺序，再刷新路线几何结果。');
      return;
    }

    startRefreshing(() => {
      void (async () => {
        try {
          const refresh = await api.refreshRoutes(line.id);
          const syncedLine = await api.getLine(line.id);
          syncLine(syncedLine, { markRouteDirty: false });
          setFeedback(
            `路线刷新完成：更新了 ${refresh.segmentsUpdated} 段，总距离 ${refresh.totalDistanceMeters} 米，总时长 ${refresh.totalDurationSeconds} 秒。`,
          );
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '刷新路线几何结果失败。');
        }
      })();
    });
  };

  const attachPoint = (pointId: string) => {
    startAttaching(() => {
      void (async () => {
        try {
          const nextLine = await api.attachPointsToLine(line.id, [pointId]);
          syncLine(nextLine, { markRouteDirty: true });
          setInboxPoints((currentPoints) => currentPoints.filter((point) => point.id !== pointId));
          setFeedback('收集箱中的点已经加入当前路线。');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '把收集箱点位加入路线失败。');
        }
      })();
    });
  };

  const removePoint = (pointId: string) => {
    startRemoving(() => {
      void (async () => {
        try {
          const nextLine = await api.removeLinePoint(line.id, pointId);
          syncLine(nextLine, { markRouteDirty: true });
          setFeedback('这个点已经从当前路线移除。');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '从路线中移除点位失败。');
        }
      })();
    });
  };

  const saveLocation = () => {
    if (!selectedPoint) {
      return;
    }

    const latitude = Number(locationDraft.latitude);
    const longitude = Number(locationDraft.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFeedback('纬度和经度必须是有效数字。');
      return;
    }

    startUpdatingLocation(() => {
      void (async () => {
        try {
          await api.confirmPointLocation(selectedPoint.id, {
            latitude,
            longitude,
            checkInAt:
              selectedPoint.checkInAt ??
              selectedPoint.capturedAt ??
              selectedPoint.startedAt ??
              new Date().toISOString(),
          });
          const syncedLine = await api.getLine(line.id);
          syncLine(syncedLine, { markRouteDirty: true });
          setFeedback('当前点位的位置已经更新。');
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '更新点位位置失败。');
        }
      })();
    });
  };

  return (
    <div className="editor-studio">
      <LineSidebar
        points={orderedPoints}
        inboxPoints={inboxPoints}
        selectedPointId={selectedPointId}
        dirtySegments={refreshPlan}
        hasPendingOrder={hasPendingOrder}
        isSaving={isSaving}
        isRefreshing={isRefreshing}
        isUpdatingLocation={isUpdatingLocation}
        isAttaching={isAttaching}
        isRemoving={isRemoving}
        feedback={feedback}
        completionLabel={completionState.label}
        completionDetail={completionState.detail}
        locationDraft={locationDraft}
        onSelectPoint={setSelectedPointId}
        onMovePoint={movePoint}
        onSaveOrder={saveOrder}
        onRefreshRoutes={refreshRoutes}
        onAttachPoint={attachPoint}
        onRemovePoint={removePoint}
        onLocationDraftChange={setLocationDraft}
        onSaveLocation={saveLocation}
      />
      <div className="editor-map-column">
        <LineEditorMap
          title={line.title}
          points={orderedPoints}
          routeSegments={line.routeSegments}
          selectedPointId={selectedPointId}
          dirtySegments={refreshPlan}
          amapKey={amapKey}
          amapSecurityCode={amapSecurityCode}
          onSelectPoint={setSelectedPointId}
          onDraftLocation={setLocationDraft}
        />
      </div>
    </div>
  );
}
