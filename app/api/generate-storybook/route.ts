import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STORYBOOK_CREDITS_PER_SCENE } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor.' }, { status: 401 });
    }

    // Load user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('credits, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Kullanıcı profili bulunamadı.' }, { status: 404 });
    }

    const body = await request.json();
    const sceneCount = (body.scenes || []).length;
    const cost = sceneCount * STORYBOOK_CREDITS_PER_SCENE;

    // Credit check (admin bypasses)
    if (!profile.is_admin) {
      if (profile.credits < cost) {
        return NextResponse.json({
          error: `Yetersiz kredi. Bu video ${cost} kredi gerektiriyor, ${profile.credits} krediniz var.`,
          required: cost,
          available: profile.credits,
        }, { status: 402 });
      }

      // Deduct credits
      const { error: deductError } = await supabase
        .from('users')
        .update({ credits: profile.credits - cost })
        .eq('id', user.id);

      if (deductError) {
        return NextResponse.json({ error: 'Kredi düşülemedi.' }, { status: 500 });
      }

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -cost,
        description: `Storybook video: ${sceneCount} sahne`,
      });
    }

    // Forward to Railway
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-storybook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Video oluşturma başlatılamadı.' }, { status: 500 });
  }
}
