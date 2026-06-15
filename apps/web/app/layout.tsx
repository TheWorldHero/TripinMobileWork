import './globals.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { TabBar } from '../src/components/shell/TabBar';

export const metadata: Metadata = {
  title: 'TripIn',
  description: '记录路线、分享生活的社区。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="phone">
          <main className="phone-main">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
