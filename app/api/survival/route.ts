import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { SURVIVAL_CREDITS } from '@/lib/types';

export const maxDuration = 60;

const SETTINGS = ['auto', 'apartment', 'subway', 'school at night', 'hospital', 'cabin', 'plane', 'office', 'motel', 'elevator', 'parking garage', 'lighthouse'];

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const idea = String(body.idea || '').trim().slice(0, 400);
    const setting = SETTINGS.includes(body.setting) ? body.setting : 'auto';
    const seconds = [60, 70, 80, 90].includes(Number(body.seconds)) ? Number(body.seconds) : 70;
    const day = Math.max(1, Math.min(30, Math.round(Number(body.day) || 1)));
    const cost = SURVIVAL_CREDITS;
    const label = idea ? idea.split('\n')[0].slice(0, 80) : `Surprise story${setting !== 'auto' ? ` (${setting})` : ''}`;

    const spend = await spendCredits(supabase, cost, `Survival Story — ${label}`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-survival`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea || null, setting, seconds, day }),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    if (!data?.job_id) {
      await refundCredits(supabase, spend, 'Refund — Survival Story failed to start');
      const detail = typeof data?.detail === 'string' ? data.detail : null;
      return NextResponse.json({ error: data?.error || detail || 'Survival Story failed to start.' }, { status: upstreamStatus >= 400 ? upstreamStatus : 500 });
    }

    await supabase.from('animations').insert({
      user_id: user.id, job_id: data.job_id, title: idea ? label : 'Survival Story',
      status: 'processing', scenes_count: 1, resolution: '1080p', lipsync: false,
    });

    return NextResponse.json({ ...data, cost });
  } catch {
    return NextResponse.json({ error: 'Failed to start Survival Story' }, { status: 500 });
  }
}
