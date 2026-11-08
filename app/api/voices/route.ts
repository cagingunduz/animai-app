import { NextResponse } from 'next/server';

// Always ask the video server: a list frozen at build time hides voices added later (Next caches GET routes).
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/voices`, {
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data.voices || []);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
 
