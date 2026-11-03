import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { longApi } from '@/lib/longServer';

// Edits to the script before approval (the title, and the lines' text per part).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const { data: row } = await supabase.from('video_projects').select('id').eq('id', params.id).single();
  if (!row) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const { status, data } = await longApi(`/long/projects/${encodeURIComponent(params.id)}/plan`, { method: 'PATCH', body: JSON.stringify({ title: body.title, sections: body.sections }) });
  return NextResponse.json(data, { status });
}
