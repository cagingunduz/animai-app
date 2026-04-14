import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'video.mp4';

  if (!url) return new NextResponse('Missing url', { status: 400 });

  const resp = await fetch(url);
  if (!resp.ok) return new NextResponse('Failed to fetch video', { status: 502 });

  const buffer = await resp.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
