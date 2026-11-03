import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits, refundCredits } from '@/lib/credits';
import { longApi } from '@/lib/longServer';
import { longTemplate } from '@/lib/long';

export const maxDuration = 60;

// Approve the plan: the credits are charged now (per minute), then production starts. Refunded if it fails to start.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const { data: row } = await supabase.from('video_projects').select('id, template, minutes, title, credits').eq('id', params.id).single();
  if (!row) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  if (row.credits > 0) return NextResponse.json({ error: 'This project is already approved.' }, { status: 409 });
  const tpl = longTemplate(row.template);
  if (!tpl) return NextResponse.json({ error: 'Unknown template.' }, { status: 400 });
  const cost = tpl.perMinute * row.minutes;
  const spend = await spendCredits(supabase, cost, `${tpl.title} (${row.minutes} min) — ${row.title}`);
  if (!spend) return NextResponse.json({ error: 'Could not deduct credits.' }, { status: 500 });
  if (!spend.ok) return NextResponse.json({ error: `Not enough credits. This video needs ${cost} credits and you have ${spend.balance}.`, required: cost, available: spend.balance }, { status: 402 });
  const { status, data } = await longApi(`/long/projects/${encodeURIComponent(params.id)}/approve`, { method: 'POST' });
  if (status !== 200) {
    await refundCredits(supabase, spend, `Refund — ${tpl.title} failed to start`);
    return NextResponse.json({ error: data?.error || 'Production failed to start. Your credits were refunded.' }, { status });
  }
  await supabase.from('video_projects').update({ status: 'producing', credits: cost, updated_at: new Date().toISOString() }).eq('id', params.id);
  return NextResponse.json({ ...data, cost });
}
