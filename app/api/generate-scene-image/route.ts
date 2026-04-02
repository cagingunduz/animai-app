import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 2.5D story mode (no characters) → Grok
    // 2D cartoon mode (has characters) → Gemini
    const isStorybookMode = !body.characters || body.characters.length === 0;
    const endpoint = isStorybookMode ? '/generate-storybook-scene-image' : '/generate-scene-image';

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to generate scene image' }, { status: 500 });
  }
}
