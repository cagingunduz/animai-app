import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { whiteboardCost, WHITEBOARD_SCENE_MAP } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users').select('credits, is_admin').eq('id', user.id).single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Kullanıcı profili bulunamadı.' }, { status: 404 });
    }

    const body = await request.json();
    const durationMinutes: number = body.duration_minutes || 1;
    const resolution: '720p' | '1080p' = body.resolution === '1080p' || body.resolution === '2k' ? '1080p' : '720p';
    const scenesCount: number = body.scene_count && body.scene_count > 0
      ? body.scene_count
      : (WHITEBOARD_SCENE_MAP[durationMinutes] ?? 5);
    const cost = whiteboardCost(durationMinutes, body.scene_count);

    if (!profile.is_admin) {
      if (profile.credits < cost) {
        return NextResponse.json({
          error: `Yetersiz kredi. Bu video ${cost} kredi gerektiriyor, ${profile.credits} krediniz var.`,
          required: cost, available: profile.credits,
        }, { status: 402 });
      }
      const { error: deductError } = await supabase
        .from('users').update({ credits: profile.credits - cost }).eq('id', user.id);
      if (deductError) {
        return NextResponse.json({ error: 'Kredi düşülemedi.' }, { status: 500 });
      }
      await supabase.from('credit_transactions').insert({
        user_id: user.id, amount: -cost,
        description: `Whiteboard Animation — ${body.title || 'Untitled'} (${scenesCount} sahne, ${resolution})`,
      });
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
      if (!profile.is_admin) {
        await supabase.from('users').update({ credits: profile.credits }).eq('id', user.id);
        await supabase.from('credit_transactions').insert({
          user_id: user.id, amount: cost, description: 'İade — Whiteboard Animation başlatılamadı',
        });
      }
      return NextResponse.json(data?.error ? data : { error: 'Whiteboard başlatılamadı.' }, { status: upstreamStatus || 500 });
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
