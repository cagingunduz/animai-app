import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Approve (or send notes on) the shot list / style frame of a Motion Graphics job.
export async function POST(request: Request, { params }: { params: { job_id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });

  const { data: owned } = await supabase
    .from('animations').select('id').eq('job_id', params.job_id).eq('user_id', user.id).maybeSingle();
  if (!owned) return NextResponse.json({ error: 'Job not found.' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/motion/${encodeURIComponent(params.job_id)}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: body.approved !== false, feedback: body.feedback || null }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Could not reach the studio.' }, { status: 502 });
  }
}
