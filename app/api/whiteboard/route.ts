import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { whiteboardCost, WHITEBOARD_SCENE_MAP } from '@/lib/types';

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
    const durationMinutes: number = body.duration_minutes || 1;
    const resolution: '720p' | '1080p' = body.resolution === '1080p' || body.resolution === '2k' ? '1080p' : '720p';
    const scenesCount: number = body.scene_count && body.scene_count > 0
      ? body.scene_count
      : (WHITEBOARD_SCENE_MAP[durationMinutes] ?? 5);
    const cost = whiteboardCost(durationMinutes, body.scene_count);

    const spend = await spendCredits(supabase, cost, `Whiteboard Animation — ${body.title || 'Untitled'} (${scenesCount} scenes, ${resolution})`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-whiteboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    if (!data?.job_id) {
      await refundCredits(supabase, spend, 'Refund — Whiteboard Animation failed to start');
      return NextResponse.json(data?.error ? data : { error: 'Whiteboard failed to start.' }, { status: upstreamStatus || 500 });
    }

    await supabase.from('animations').insert({
      user_id: user.id, job_id: data.job_id, title: body.title || 'Untitled Whiteboard',
      status: 'processing', scenes_count: scenesCount, resolution, lipsync: false,
    });

    return NextResponse.json({ ...data, cost }, { status: upstreamStatus });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start whiteboard' }, { status: 500 });
  }
}
