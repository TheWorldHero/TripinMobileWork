'use client';

import { useState } from 'react';
import Link from 'next/link';

import { createRoutePreviewLayout } from '../../home-feed/route-preview-layout';
import type { HomeFeedPost } from '../../home-feed/types';
import styles from './HomeFeedRedesign.module.css';

export function RouteFeedPostMap({
  post,
  activeStopIndex,
  onSelectStop,
}: {
  post: HomeFeedPost;
  activeStopIndex: number;
  onSelectStop: (stopIndex: number) => void;
}) {
  const layout = createRoutePreviewLayout(post.stops, activeStopIndex);
  const [hoveredStopIndex, setHoveredStopIndex] = useState<number | null>(null);

  return (
    <section className={styles.mapBlock} aria-label={`${post.title} 路线图`}>
      <Link className={styles.mapSurfaceLink} href={post.detailHref} aria-label={`查看 ${post.title} 的路线`} />

      <svg className={styles.mapSvg} viewBox="0 0 560 132" preserveAspectRatio="none" role="presentation">
        {layout.fullPathD ? (
          <>
            <path className={styles.mapPathGlow} d={layout.fullPathD} vectorEffect="non-scaling-stroke" />
            <path className={styles.mapPathBase} d={layout.fullPathD} vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
        {layout.activePathD ? (
          <path className={styles.mapPathActive} d={layout.activePathD} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>

      {layout.anchors.map((anchor, index) => {
        const stop = post.stops[index];
        const isActive = index === activeStopIndex;
        const isHovered = hoveredStopIndex === index;
        const haloR = isActive ? 10 : 7;
        const coreR = isActive ? 4.8 : 3.6;
        const fallbackTitle = `点 ${index + 1}`;

        return (
          <button
            key={stop?.id ?? index}
            className={styles.mapStopButton}
            type="button"
            aria-label={`切换到 ${stop?.title ?? fallbackTitle}`}
            style={{
              left: anchor.leftPercent,
              top: anchor.topPercent,
            }}
            onClick={() => onSelectStop(index)}
            onMouseEnter={() => setHoveredStopIndex(index)}
            onMouseLeave={() => setHoveredStopIndex((current) => (current === index ? null : current))}
            onFocus={() => setHoveredStopIndex(index)}
            onBlur={() => setHoveredStopIndex((current) => (current === index ? null : current))}
          >
            <svg
              viewBox="-12 -12 24 24"
              width="24"
              height="24"
              style={{ pointerEvents: 'none', overflow: 'visible' }}
              aria-hidden="true"
            >
              <circle className={isActive ? styles.mapNodeHaloActive : styles.mapNodeHalo} r={haloR} />
              <circle className={isActive ? styles.mapNodeCoreActive : styles.mapNodeCore} r={coreR} />
            </svg>
            {isHovered && stop ? (
              <span className={styles.mapStopLabel} role="tooltip">
                {stop.title}
              </span>
            ) : null}
          </button>
        );
      })}
    </section>
  );
}
