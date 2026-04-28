import Link from 'next/link';

import { getSessionUserId } from '../../lib/session';
import styles from './HomeFeedRedesign.module.css';

export async function ThinSiteHeader() {
  const userId = await getSessionUserId();

  return (
    <header className={styles.shellHeader}>
      <div className={styles.shellHeaderInner}>
        <div className={styles.shellBrandBlock}>
          <span className={styles.shellBrandMark} aria-hidden="true">
            T
          </span>
          <span className={styles.shellBrand}>TripIn</span>
        </div>

        <div className={styles.shellHeaderActions}>
          {userId ? (
            <Link className={styles.shellHeaderLink} href="/me">
              我的
            </Link>
          ) : (
            <>
              <Link className={styles.shellHeaderLink} href="/login">
                登录
              </Link>
              <Link className={styles.shellHeaderPrimary} href="/register">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
