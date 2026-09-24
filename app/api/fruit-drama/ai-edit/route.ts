import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fruitDramaSceneCost } from '@/lib/types';

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
    const jobId = String(body.job_id || '');
    const instruction = String(body.instruction || '').trim();
    const sceneIndex = body.scene_index ? Math.max(1, Number(body.scene_index)) : undefined;
    if (!jobId || instruction.length < 3) {
      return NextResponse.json({ error: 'job_id and an edit instruction are required.' }, { status: 400 });
    }

    const statusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/status/${jobId}`);
    const statusData = await statusRes.json().catch(() => ({}));
    if (!statusRes.ok) {
      return NextResponse.json({ error: statusData.detail || 'Job not found.' }, { status: statusRes.status });
    }

    const resolution = statusData.resolution === '1080p' ? '1080p' : '720p';
    const requestedDuration = body.duration_seconds ? Number(body.duration_seconds) : Number(statusData.duration_seconds_per_scene || 8);
    const durationSeconds = resolution === '1080p' ? 8 : Math.max(4, Math.min(8, requestedDuration));
    const cost = fruitDramaSceneCost(resolution, durationSeconds);

    if (!profile.is_admin) {
      if (profile.credits < cost) {
        return NextResponse.json({
          error: `Not enough credits. This AI edit needs ${cost} credits and you have ${profile.credits}.`,
          required: cost,
          available: profile.credits,
        }, { status: 402 });
      }
      const { error: deductError } = await supabase
        .from('users').update({ credits: profile.credits - cost }).eq('id', user.id);
      if (deductError) {
        return NextResponse.json({ error: 'Could not deduct credits.' }, { status: 500 });
      }
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -cost,
        description: `Fruit Drama AI edit${sceneIndex ? ` - scene ${sceneIndex}` : ''} (${resolution}, ${durationSeconds}s)`,
      });
    }

    let data: any = {};
    let upstreamStatus = 500;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/edit-fruit-drama-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          instruction,
          scene_index: sceneIndex,
          duration_seconds: durationSeconds,
        }),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    if (!data?.job_id) {
      if (!profile.is_admin) {
        await supabase.from('users').update({ credits: profile.credits }).eq('id', user.id);
        await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: cost,
          description: 'Refund — Fruit Drama AI edit failed to start',
        });
      }
      return NextResponse.json(data?.detail ? { error: data.detail } : data?.error ? data : { error: 'AI edit failed to start.' }, { status: upstreamStatus || 500 });
    }

    await supabase.from('animations').update({ status: 'processing' }).eq('job_id', jobId);
    return NextResponse.json({ ...data, cost }, { status: upstreamStatus });
  } catch {
    return NextResponse.json({ error: 'Failed to start fruit drama AI edit' }, { status: 500 });
  }
}
