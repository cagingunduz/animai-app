import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { longApi } from '@/lib/longServer';

export const maxDuration = 60;

// Three topic ideas, each with one shocking true angle (free).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { status, data } = await longApi('/long/pitch', { method: 'POST', body: JSON.stringify({ template: String(body.template || 'flat-explainer'), hint: String(body.hint || '').slice(0, 300) || null }) });
  return NextResponse.json(data, { status });
}
