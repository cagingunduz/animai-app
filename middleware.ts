import { NextResponse, userAgent, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Use Next.js built-in userAgent parser
  const { device } = userAgent(request);

  // Block phones (not tablets) from all routes except /mobile
  if (device.type === 'mobile' && pathname !== '/mobile') {
    const url = request.nextUrl.clone();
    url.pathname = '/mobile';
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
