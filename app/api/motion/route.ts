import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { motionCost } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users').select('credits, is_admin').eq('id', user.id).single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const body = await request.json();
    if (!body.prompt || !String(body.prompt).trim()) {
      return NextResponse.json({ error: 'Describe the video first.' }, { status: 400 });
    }
    const seconds: number = Math.max(5, Math.min(90, Number(body.duration_seconds) || 15));
    const resolution: '720p' | '1080p' = body.resolution === '720p' ? '720p' : '1080p';
    const cost = motionCost(seconds);
    const title = (body.title || String(body.prompt).trim().split('\n')[0]).slice(0, 80);

    const spend = await spendCredits(supabase, cost, `${body.look === 'cinematic3d' ? '3D Render' : 'Motion Graphics'} — ${title} (${seconds}s, ${resolution})`);
    if (!spend) {
      return NextResponse.json({ error: 'Could not deduct credits.' }, { status: 500 });
    }
    if (!spend.ok) {
      return NextResponse.json({
        error: `Not enough credits. This video needs ${cost} credits and you have ${spend.balance}.`,
        required: cost, available: spend.balance,
      }, { status: 402 });
    }

    let data: any = {};
    let upstreamStatus = 500;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-motion`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, title, duration_seconds: seconds, resolution }),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    if (!data?.job_id) {
      await refundCredits(supabase, spend, 'Refund — Motion Graphics failed to start');
      const detail = typeof data?.detail === 'string' ? data.detail : null;
      return NextResponse.json({ error: data?.error || detail || 'Motion Graphics failed to start.' }, { status: upstreamStatus >= 400 ? upstreamStatus : 500 });
    }

    const shots = Math.max(1, Math.round(seconds / 3.5));
    await supabase.from('animations').insert({
      user_id: user.id, job_id: data.job_id, title: title || 'Untitled Motion',
      status: 'processing', scenes_count: shots, resolution, lipsync: false,
    });

    return NextResponse.json({ ...data, cost });
  } catch {
    return NextResponse.json({ error: 'Failed to start Motion Graphics' }, { status: 500 });
  }
}
