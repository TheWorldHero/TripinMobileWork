'use client';

import { useEffect, useRef } from 'react';

import type { StopListDensity } from '../../home-feed/post-interactions';
import type { HomeFeedStop } from '../../home-feed/types';
import styles from './HomeFeedRedesign.module.css';

export function RouteFeedPostStopList({
  stops,
  activeStopIndex,
  density,
  windowStart,
  windowEnd,
  onSelectStop,
}: {
  stops: HomeFeedStop[];
  activeStopIndex: number;
  density: StopListDensity;
  windowStart: number;
  windowEnd: number;
  onSelectStop: (index: number) => void;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (density !== 'scroll') {
      return;
    }

    itemRefs.current[activeStopIndex]?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [activeStopIndex, density]);

  const densityClassName =
    density === 'single'
      ? styles.stopListSingle
      : density === 'pair'
        ? styles.stopListPair
        : density === 'trio'
          ? styles.stopListTrio
          : styles.stopListScroll;

  return (
    <aside
      className={`${styles.stopPanel} ${windowStart > 0 ? styles.stopPanelTopFade : ''} ${
        windowEnd < stops.length ? styles.stopPanelBottomFade : ''
      }`}
      aria-label="路线点位列表"
    >
      <div className={`${styles.stopList} ${densityClassName}`}>
        {stops.map((stop, index) => {
          const isActive = index === activeStopIndex;

          return (
            <button
              key={stop.id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              className={`${styles.stopButton} ${isActive ? styles.stopButtonActive : ''}`}
              type="button"
              onClick={() => onSelectStop(index)}
            >
              <div className={styles.stopButtonMain}>
                <span className={styles.stopDot} />
                <div className={styles.stopText}>
                  <strong className={styles.stopTitle}>{stop.title}</strong>
                  <span className={styles.stopPlace}>{stop.placeLabel}</span>
                </div>
              </div>
              <span className={styles.stopTime}>{stop.timeLabel}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
