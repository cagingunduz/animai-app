import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { job_id: string } }) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/motion/${encodeURIComponent(params.job_id)}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Status unavailable' }, { status: 502 });
  }
}
