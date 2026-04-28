import Link from 'next/link';

import type { MediaAsset, RouteDetail, RoutePoint } from '../types';
import { RouteMap } from './RouteMap';

function formatDateRange(startedAt?: string | null, endedAt?: string | null, publishedAt?: string | null) {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });

  if (startedAt && endedAt) {
    return `${formatter.format(new Date(startedAt))} - ${formatter.format(new Date(endedAt))}`;
  }
  if (startedAt) {
    return formatter.format(new Date(startedAt));
  }
  if (publishedAt) {
    return formatter.format(new Date(publishedAt));
  }
  return '未设置时间';
}

function pointTime(point: RoutePoint) {
  const value = point.startedAt ?? point.checkInAt ?? point.capturedAt;
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function pointName(point: RoutePoint, index: number) {
  return point.title || point.placeName || point.cityName || point.districtName || `点位 ${index + 1}`;
}

function mediaUrl(media?: MediaAsset | null) {
  return media?.storageKey || null;
}

function PointImages({ point }: { point: RoutePoint }) {
  const medias = point.mediaAssets ?? [];
  if (!medias.length) {
    return null;
  }

  return (
    <div className="route-point-gallery route-point-gallery-compact">
      {medias.map((media) => {
        const src = mediaUrl(media);
        if (!src) return null;
        return (
          <img
            key={media.id}
            className="route-point-gallery-image"
            src={src}
            alt={media.caption || point.title || '路线图片'}
          />
        );
      })}
    </div>
  );
}

export function RouteStoryPreview({
  route,
  backHref,
  backLabel,
  mode = 'published',
}: {
  route: RouteDetail;
  backHref?: string;
  backLabel?: string;
  mode?: 'published' | 'preview';
}) {
  const coverUrl = mediaUrl(route.coverMedia);

  return (
    <article className="route-detail-simple">
      <header className="route-detail-topbar">
        {backHref ? (
          <Link className="text-link" href={backHref}>
            {backLabel ?? '返回'}
          </Link>
        ) : null}
        <span>{mode === 'preview' ? '发布预览' : '路线详情'}</span>
      </header>

      <section className="route-detail-hero">
        <div className="route-detail-copy">
          <h1 className="page-title">{route.title}</h1>
          {route.summary ? <p className="hero-copy">{route.summary}</p> : null}
          <div className="route-detail-meta">
            <span>{route.cityName || '未填写城市'}</span>
            <span>{route.pointCount} 个点位</span>
            <span>{formatDateRange(route.startedAt, route.endedAt, route.publishedAt)}</span>
          </div>
          {route.author ? <p className="route-credits">发布者：{route.author.displayName}</p> : null}
        </div>
        {coverUrl ? <img className="route-detail-cover" src={coverUrl} alt={route.title} /> : null}
      </section>

      <RouteMap
        title={route.title}
        points={route.points}
        routeSegments={route.routeSegments}
        pointCount={route.pointCount}
      />

      <section className="route-section route-section-simple">
        <div className="section-heading">
          <h2 className="section-title">点位</h2>
        </div>
        <div className="route-point-timeline">
          {route.points.map((point, index) => (
            <article key={point.id} className="route-point-row">
              <div className="route-point-index">{index + 1}</div>
              <div className="route-point-content">
                <div className="route-point-title-row">
                  <strong>{pointName(point, index)}</strong>
                  {pointTime(point) ? <span>{pointTime(point)}</span> : null}
                </div>
                {point.note ? <p>{point.note}</p> : null}
                <PointImages point={point} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
}
