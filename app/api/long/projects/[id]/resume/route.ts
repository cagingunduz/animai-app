import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { longApi } from '@/lib/longServer';

// Continue a project from its last finished step (free: it was paid for on approval).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const { data: row } = await supabase.from('video_projects').select('id').eq('id', params.id).single();
  if (!row) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const { status, data } = await longApi(`/long/projects/${encodeURIComponent(params.id)}/resume`, { method: 'POST' });
  return NextResponse.json(data, { status });
}
