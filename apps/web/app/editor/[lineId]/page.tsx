import Link from 'next/link';

import { LineEditorStudio } from '../../../src/components/LineSidebar';
import { api } from '../../../src/lib/api';
import type { RouteDetail } from '../../../src/types';

export const dynamic = 'force-dynamic';

function EditorFailure({ lineId, message }: { lineId: string; message: string }) {
  return (
    <main className="site-shell editor-page">
      <section className="editor-panel editor-panel-intro">
        <p className="eyebrow">编辑器暂不可用</p>
        <h1 className="page-title editor-title">这条路线暂时无法进入编辑。</h1>
        <p className="section-copy">{message || `没有找到可编辑的路线：${lineId}。`}</p>
        <Link className="text-link" href="/">
          返回首页
        </Link>
      </section>
    </main>
  );
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ lineId: string }>;
}) {
  const { lineId } = await params;

  let line: RouteDetail;
  try {
    line = await api.getLine(lineId);
  } catch (error) {
    return (
      <EditorFailure
        lineId={lineId}
        message={error instanceof Error ? error.message : '读取线路编辑器时发生未知错误。'}
      />
    );
  }

  return (
    <main className="site-shell editor-page">
      <div className="route-breadcrumb">
        <Link className="text-link" href="/">
          首页
        </Link>
        <span className="meta-dot" />
        <Link className="text-link" href={`/routes/${lineId}`}>
          路线详情
        </Link>
      </div>
      <LineEditorStudio
        initialLine={line}
        amapKey={process.env.NEXT_PUBLIC_AMAP_JS_KEY ?? ''}
        amapSecurityCode={process.env.NEXT_PUBLIC_AMAP_JS_SECURITY_CODE ?? ''}
      />
    </main>
  );
}
