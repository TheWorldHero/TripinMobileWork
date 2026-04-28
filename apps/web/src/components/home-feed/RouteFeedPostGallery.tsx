import Link from 'next/link';

import type { HomeFeedStop } from '../../home-feed/types';
import styles from './HomeFeedRedesign.module.css';

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function RouteFeedPostGallery({
  detailHref,
  postTitle,
  stop,
  activeImageIndex,
  hasPrevImage,
  hasNextImage,
  onPrevImage,
  onNextImage,
}: {
  detailHref: string;
  postTitle: string;
  stop: HomeFeedStop;
  activeImageIndex: number;
  hasPrevImage: boolean;
  hasNextImage: boolean;
  onPrevImage: () => void;
  onNextImage: () => void;
}) {
  const currentImage = stop.images[activeImageIndex] ?? stop.images[0] ?? null;
  const totalImages = stop.images.length;

  return (
    <div className={styles.galleryFrame}>
      <Link className={styles.gallerySurfaceLink} href={detailHref} aria-label={`查看 ${postTitle} 的内容`}>
        {currentImage ? (
          <img className={styles.galleryImage} src={currentImage} alt={`${postTitle} - ${stop.title}`} />
        ) : (
          <div className={styles.galleryPlaceholder}>这条路线暂时还没有公开图片</div>
        )}
      </Link>

      {totalImages > 1 ? (
        <div className={styles.galleryDots} aria-hidden="true">
          {stop.images.map((src, index) => (
            <span
              key={`${src}-${index}`}
              className={`${styles.galleryDot} ${index === activeImageIndex ? styles.galleryDotActive : ''}`}
            />
          ))}
        </div>
      ) : null}

      {hasPrevImage ? (
        <button
          className={`${styles.galleryNavButton} ${styles.galleryNavButtonLeft}`}
          type="button"
          aria-label="上一张图片"
          onClick={onPrevImage}
        >
          <ChevronLeft />
        </button>
      ) : null}

      {hasNextImage ? (
        <button
          className={`${styles.galleryNavButton} ${styles.galleryNavButtonRight}`}
          type="button"
          aria-label="下一张图片"
          onClick={onNextImage}
        >
          <ChevronRight />
        </button>
      ) : null}

      {totalImages > 1 ? (
        <div className={styles.galleryCounter}>
          {activeImageIndex + 1} / {totalImages}
        </div>
      ) : null}
    </div>
  );
}
