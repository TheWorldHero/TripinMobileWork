import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'file is required' }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });

  const safeName = sanitizeFilename(file.name || 'upload.bin');
  const finalName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const diskPath = path.join(uploadsDir, finalName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(diskPath, bytes);

  return NextResponse.json({
    url: `/uploads/${finalName}`,
    storageKey: `/uploads/${finalName}`,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    bytes: file.size,
  });
}
