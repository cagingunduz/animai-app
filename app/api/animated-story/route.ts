import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { animatedStoryCost, DURATION_SCENE_MAP } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    // Profile + credits
    const { data: profile, error: profileError } = await supabase
      .from('users').select('credits, is_admin').eq('id', user.id).single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const body = await request.json();
    const durationMinutes: number = body.duration_minutes || 1;
    const resolution: '720p' | '1080p' = body.resolution === '1080p' || body.resolution === '2k' ? '1080p' : '720p';
    const scenesCount: number = body.scene_count && body.scene_count > 0
      ? body.scene_count
      : (DURATION_SCENE_MAP[durationMinutes] ?? 10);
    const cost = animatedStoryCost(durationMinutes, resolution, body.scene_count);

    // Credit check + deduct (admin bypasses)
    const spend = await spendCredits(supabase, cost, `Animated Storytelling — ${body.title || 'Untitled'} (${scenesCount} scenes, ${resolution})`);
    if (!spend) {
      return NextResponse.json({ error: 'Could not deduct credits.' }, { status: 500 });
    }
    if (!spend.ok) {
      return NextResponse.json({
        error: `Not enough credits. This video needs ${cost} credits and you have ${spend.balance}.`,
        required: cost, available: spend.balance,
      }, { status: 402 });
    }

    // Start the backend job
    let data: any = {};
    let upstreamStatus = 500;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-animated-story`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    // Refund if the job failed to start
    if (!data?.job_id) {
      await refundCredits(supabase, spend, 'Refund — Animated Storytelling failed to start');
      return NextResponse.json(data?.error ? data : { error: 'Animated story failed to start.' }, { status: upstreamStatus || 500 });
    }

    // Record the generation so it shows up in the dashboard (24h section)
    const { error: recError } = await supabase.from('animations').insert({
      user_id: user.id, job_id: data.job_id, title: body.title || 'Untitled Animation',
      status: 'processing', scenes_count: scenesCount, resolution, lipsync: false,
    });
    if (recError) console.error('[animated-story] animations insert failed:', recError);

    return NextResponse.json({ ...data, cost, recorded: !recError, rec_error: recError?.message ?? null }, { status: upstreamStatus });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start animated story' }, { status: 500 });
  }
}
