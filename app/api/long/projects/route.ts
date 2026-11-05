import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { longApi } from '@/lib/longServer';
import { longTemplate } from '@/lib/long';

export const maxDuration = 60;

// A new long-video project: the video server writes the script and the shot plan (free); credits are charged on approval.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const tpl = longTemplate(String(body.template || ''));
  if (!tpl) return NextResponse.json({ error: 'Unknown template.' }, { status: 400 });
  const minutes = tpl.minutes.includes(Number(body.minutes)) ? Number(body.minutes) : tpl.defaultMinutes;
  const voice = tpl.voices.some(v => v.id === body.voice) ? String(body.voice) : tpl.voices[0]?.id;
  const { status, data } = await longApi('/long/projects', {
    method: 'POST',
    body: JSON.stringify({ template: tpl.key, topic: String(body.topic || '').trim().slice(0, 300) || null, minutes, voice, notes: String(body.notes || '').trim().slice(0, 600) || null,
      look: tpl.looks?.some(l => l.id === body.look) ? String(body.look) : tpl.looks?.[0]?.id || null,
      uploads: tpl.uploads && Array.isArray(body.uploads) ? body.uploads.filter((u: unknown) => typeof u === 'string').slice(0, 20) : null }),
  });
  if (!data?.id) return NextResponse.json({ error: data?.error || 'Could not start the project.' }, { status: status >= 400 ? status : 500 });
  const { error } = await supabase.from('video_projects').insert({
    id: data.id, user_id: user.id, template: tpl.key, title: String(body.topic || '').trim().slice(0, 100) || 'Untitled video', status: 'planning', minutes,
  });
  if (error) console.error('[long] video_projects insert failed:', error.message);
  return NextResponse.json(data);
}
