import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { longApi } from '@/lib/longServer';

export const maxDuration = 60;

// The project's full state (from the video server), for its owner only; the list row is kept in sync.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const { data: row } = await supabase.from('video_projects').select('id, status, title, thumbnail_url, final_video_url').eq('id', params.id).single();
  if (!row) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const { status, data } = await longApi(`/long/projects/${encodeURIComponent(params.id)}`);
  if (status === 200) {
    const next = { status: data.status, title: data.title || row.title, thumbnail_url: data.thumbnail_url || null, final_video_url: data.final_video_url || null };
    if (next.status !== row.status || next.title !== row.title || next.thumbnail_url !== row.thumbnail_url || next.final_video_url !== row.final_video_url)
      await supabase.from('video_projects').update({ ...next, updated_at: new Date().toISOString() }).eq('id', params.id);
  }
  return NextResponse.json(data, { status });
}
