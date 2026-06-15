import { NextResponse } from 'next/server';

import { API_BASE_URL } from '../../../src/lib/config';

export const runtime = 'nodejs';

/**
 * 上传转发：把浏览器上传的文件转交给后端 /media/upload 落盘到服务器的 uploads 目录，
 * 后端再通过 /api/uploads/** 静态托管。这样本地/线上/任意设备都看同一份图。
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'file is required' }, { status: 400 });
  }

  const forward = new FormData();
  forward.append('file', file, file.name);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/media/upload`, { method: 'POST', body: forward });
  } catch {
    return NextResponse.json({ message: '上传服务连接失败，请确认后端在线。' }, { status: 502 });
  }

  const text = await response.text();
  if (!response.ok) {
    return new NextResponse(text || '上传失败', { status: response.status });
  }
  return new NextResponse(text, {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
