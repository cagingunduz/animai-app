import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spendCredits } from '@/lib/credits';
import { STORYBOOK_CREDITS_PER_SCENE } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    // Load user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('credits, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const body = await request.json();
    const isRegeneration: boolean = body.is_regeneration === true;
    const cost = isRegeneration ? 25 : STORYBOOK_CREDITS_PER_SCENE;

    const spend = await spendCredits(supabase, cost, isRegeneration ? 'Storytelling scene regeneration' : 'Storytelling scene preview');
    if (!spend) {
      return NextResponse.json({ error: 'Could not deduct credits.' }, { status: 500 });
    }
    if (!spend.ok) {
      return NextResponse.json({
        error: `Not enough credits. This scene needs ${cost} credits and you have ${spend.balance}.`,
        required: cost, available: spend.balance,
      }, { status: 402 });
    }

    // Strip is_regeneration before forwarding to Railway
    const { is_regeneration: _removed, ...forwardBody } = body;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-single-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardBody),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to generate scene' }, { status: 500 });
  }
}
