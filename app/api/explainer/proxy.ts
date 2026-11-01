import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Signed-in only: forwards a small JSON call (script, presenter, voice samples) to the backend. */
export async function proxyExplainer(request: Request, path: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  let body: unknown = {};
  try { body = await request.json(); } catch { /* empty */ }
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: typeof data?.detail === 'string' ? data.detail : 'Something went wrong.' }, { status: res.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'The server could not be reached.' }, { status: 502 });
  }
}
