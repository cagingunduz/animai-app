import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  // In production, proxy to Railway:
  // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  // });
  // return NextResponse.json(await res.json());

  // Stub: return a mock job_id
  return NextResponse.json({
    success: true,
    job_id: `job-${Date.now()}`,
  });
}
