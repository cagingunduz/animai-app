import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: { job_id: string } }
) {
  const jobId = params.job_id;

  // In production, proxy to Railway:
  // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/status/${jobId}`);
  // return NextResponse.json(await res.json());

  // Stub: simulate progressive completion based on time
  // In real implementation this comes from the backend
  return NextResponse.json({
    job_id: jobId,
    status: 'processing', // 'processing' | 'completed' | 'failed'
    progress: 0,
    current_message: 'Initializing...',
    scenes: [],
    final_video_url: null,
  });
}
