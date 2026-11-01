import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { BUILD3D_CREDITS } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const topic = String(body.topic || '').trim().slice(0, 300);
    const set: 'yard' | 'body' = body.set === 'body' ? 'body' : 'yard';
    const format = set === 'body' ? '3D Health' : '3D Build';
    const cost = BUILD3D_CREDITS;
    const label = topic ? topic.split('\n')[0].slice(0, 80) : 'Surprise topic';

    const spend = await spendCredits(supabase, cost, `${format} — ${label}`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-yard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic || null, set }),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    if (!data?.job_id) {
      await refundCredits(supabase, spend, `Refund — ${format} failed to start`);
      const detail = typeof data?.detail === 'string' ? data.detail : null;
      return NextResponse.json({ error: data?.error || detail || `${format} failed to start.` }, { status: upstreamStatus >= 400 ? upstreamStatus : 500 });
    }

    await supabase.from('animations').insert({
      user_id: user.id, job_id: data.job_id, title: topic ? label : format,
      status: 'processing', scenes_count: 1, resolution: '1080p', lipsync: false,
    });

    return NextResponse.json({ ...data, cost });
  } catch {
    return NextResponse.json({ error: 'Failed to start 3D Build' }, { status: 500 });
  }
}
