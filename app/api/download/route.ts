import { NextRequest, NextResponse } from 'next/server';

// Redirect to the backend streaming download (attachment disposition). Avoids
// Vercel's ~4.5MB serverless response limit and needs no R2 CORS.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'video.mp4';
  if (!url) return new NextResponse('Missing url', { status: 400 });

  const base = process.env.NEXT_PUBLIC_API_URL;
  const target = `${base}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  return NextResponse.redirect(target, 302);
}
