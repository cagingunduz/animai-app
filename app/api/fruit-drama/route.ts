import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { fruitDramaCost } from '@/lib/types';

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
    const sceneCount = Math.max(1, Math.min(10, Number(body.scene_count || 5)));
    const resolution: '720p' | '1080p' = body.resolution === '1080p' ? '1080p' : '720p';
    const durationSeconds = resolution === '1080p' ? 8 : Math.max(4, Math.min(8, Number(body.duration_seconds_per_scene || 8)));
    const cost = fruitDramaCost(sceneCount, resolution, durationSeconds);

    const spend = await spendCredits(supabase, cost, `Fruit Drama — ${body.title || 'Untitled'} (${sceneCount} scenes, ${resolution}, ${durationSeconds}s)`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-fruit-drama`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, scene_count: sceneCount, resolution, duration_seconds_per_scene: durationSeconds }),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    if (!data?.job_id) {
      await refundCredits(supabase, spend, 'Refund — Fruit Drama failed to start');
      return NextResponse.json(data?.error ? data : { error: 'Fruit Drama failed to start.' }, { status: upstreamStatus || 500 });
    }

    await supabase.from('animations').insert({
      user_id: user.id, job_id: data.job_id, title: body.title || 'Untitled Fruit Drama',
      status: 'processing', scenes_count: sceneCount, resolution, lipsync: false,
    });

    return NextResponse.json({ ...data, cost }, { status: upstreamStatus });
  } catch {
    return NextResponse.json({ error: 'Failed to start fruit drama' }, { status: 500 });
  }
}
