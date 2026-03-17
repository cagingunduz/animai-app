import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  // Simulate generation delay
  await new Promise((r) => setTimeout(r, 2000));

  // In production, call Railway backend:
  // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-character`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  // });
  // return NextResponse.json(await res.json());

  return NextResponse.json({
    success: true,
    character_image_url: null, // placeholder — real URL in production
    character_id: `char-${Date.now()}`,
  });
}
