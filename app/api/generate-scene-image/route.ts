import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  // Simulate generation delay
  await new Promise((r) => setTimeout(r, 2500));

  // In production, proxy to Railway:
  // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-scene-image`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  // });
  // return NextResponse.json(await res.json());

  return NextResponse.json({
    success: true,
    scene_image_url: null, // placeholder — real URL in production
  });
}
