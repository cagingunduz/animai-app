import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { STUDIO_STYLES, type StudioFormat } from '@/lib/types';

export const maxDuration = 60;

// Style Studio: one route for every studio format; the backend runs studio_pipeline with the format's style.
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const cfg = STUDIO_STYLES[body.format as StudioFormat];
    if (!cfg) return NextResponse.json({ error: 'Unknown format.' }, { status: 400 });
    const topic = String(body.topic || '').trim().slice(0, 500);
    const seconds = cfg.seconds.includes(Number(body.seconds)) ? Number(body.seconds) : cfg.defaultSeconds;
    const uploads: string[] = Array.isArray(body.uploads) ? body.uploads.filter((u: unknown) => typeof u === 'string').slice(0, 12) : [];
    if (cfg.uploads === 'required' && !uploads.length) return NextResponse.json({ error: 'Upload your clip first.' }, { status: 400 });
    if (cfg.uploads === 'none' && uploads.length) uploads.length = 0;

    const o = body.options && typeof body.options === 'object' ? body.options : {};
    const options = cfg.options ? {
      accent: /^#[0-9a-fA-F]{6}$/.test(String(o.accent || '')) ? String(o.accent) : undefined,
      handle: String(o.handle || '').trim().slice(0, 40) || undefined,
      voice: cfg.options.voices?.some(v => v.id === o.voice) ? String(o.voice) : undefined,
      audience: String(o.audience || '').trim().slice(0, 160) || undefined,
    } : undefined;
    const label = topic ? topic.split('\n')[0].slice(0, 80) : cfg.title;
    const spend = await spendCredits(supabase, cfg.credits, `${cfg.title} — ${label}`);
    if (!spend) return NextResponse.json({ error: 'Could not deduct credits.' }, { status: 500 });
    if (!spend.ok) {
      return NextResponse.json({
        error: `Not enough credits. This video needs ${cfg.credits} credits and you have ${spend.balance}.`,
        required: cfg.credits, available: spend.balance,
      }, { status: 402 });
    }

    let data: any = {};
    let upstreamStatus = 500;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-studio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: cfg.style, topic: topic || null, seconds, uploads: uploads.length ? uploads : null, options: options || null }),
      });
      upstreamStatus = res.status;
      data = await res.json();
    } catch {
      data = {};
    }

    if (!data?.job_id) {
      await refundCredits(supabase, spend, `Refund — ${cfg.title} failed to start`);
      const detail = typeof data?.detail === 'string' ? data.detail : null;
      return NextResponse.json({ error: data?.error || detail || `${cfg.title} failed to start.` }, { status: upstreamStatus >= 400 ? upstreamStatus : 500 });
    }

    await supabase.from('animations').insert({
      user_id: user.id, job_id: data.job_id, title: topic ? label : cfg.title,
      status: 'processing', scenes_count: 1, resolution: '1080p', lipsync: false,
    });
    return NextResponse.json({ ...data, cost: cfg.credits });
  } catch {
    return NextResponse.json({ error: 'Failed to start the reel' }, { status: 500 });
  }
}
