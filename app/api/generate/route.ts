import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RESOLUTION_CREDITS, type Resolution } from '@/lib/types';

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
    const resolution: Resolution = body.resolution === '1080p' ? '1080p' : body.resolution === '480p' ? '480p' : '720p';
    const requestedSceneCount = Number(body.scene_count || 0);
    const scenesCount = body.auto_plan
      ? Math.max(1, Math.min(8, requestedSceneCount || (Array.isArray(body.scenes) ? body.scenes.length : 1)))
      : Math.max(1, Array.isArray(body.scenes) ? body.scenes.length : 1);
    const cost = Math.max(1, scenesCount) * RESOLUTION_CREDITS[resolution];

    if (!profile.is_admin) {
      if (profile.credits < cost) {
        return NextResponse.json({
          error: `Yetersiz kredi. Bu video ${cost} kredi gerektiriyor, ${profile.credits} krediniz var.`,
          required: cost,
          available: profile.credits,
        }, { status: 402 });
      }
      const { error: deductError } = await supabase
        .from('users').update({ credits: profile.credits - cost }).eq('id', user.id);
      if (deductError) {
        return NextResponse.json({ error: 'Kredi düşülemedi.' }, { status: 500 });
      }
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -cost,
        description: `2D Animation (${scenesCount} sahne, ${resolution})`,
      });
    }

    let data: any = {};
    let upstreamStatus = 500;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, resolution }),
      });
      upstreamStatus = res.status;
      const raw = await res.text();
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || `Backend returned ${res.status}` };
      }
    } catch (error: any) {
      data = { error: error?.message || 'Backend request failed' };
    }

    if (!data?.job_id) {
      if (!profile.is_admin) {
        await supabase.from('users').update({ credits: profile.credits }).eq('id', user.id);
        await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: cost,
          description: 'İade — 2D Animation başlatılamadı',
        });
      }
      return NextResponse.json(data?.detail ? { error: data.detail } : data?.error ? data : { error: '2D animation başlatılamadı.' }, { status: upstreamStatus || 500 });
    }

    await supabase.from('animations').insert({
      user_id: user.id,
      job_id: data.job_id,
      title: body.project_prompt?.slice(0, 80) || body.scenes?.[0]?.scene_text?.slice(0, 80) || 'Untitled 2D Animation',
      status: 'processing',
      scenes_count: scenesCount,
      resolution,
      lipsync: !!body.lipsync,
    });

    return NextResponse.json({ ...data, cost }, { status: upstreamStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to start 2D animation' }, { status: 500 });
  }
}
