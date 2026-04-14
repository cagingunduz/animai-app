import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { job_id: string } }
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/status/${params.job_id}`);
  const data = await res.json();
  return NextResponse.json(data);
}
