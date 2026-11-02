import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// A short-lived token that lets a signed-in user upload footage straight to the backend (big files can't pass
// through this server). The backend checks it with the same STUDIO_UPLOAD_SECRET.
export async function POST() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const secret = process.env.STUDIO_UPLOAD_SECRET;
  if (!secret) return NextResponse.json({ error: 'Uploads are not configured yet.' }, { status: 503 });
  const exp = Math.floor(Date.now() / 1000) + 30 * 60;
  const sig = createHmac('sha256', secret).update(`${exp}.${user.id}`).digest('hex');
  return NextResponse.json({ token: `${exp}.${user.id}.${sig}` });
}
