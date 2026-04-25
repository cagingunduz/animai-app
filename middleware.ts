import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const MOBILE_UA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile Safari/i;

// iPad is excluded — large enough to use the app
function isMobileDevice(ua: string) {
  return MOBILE_UA.test(ua) && !/iPad/i.test(ua);
}

const APP_PATHS = ['/dashboard', '/create', '/billing', '/status'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get('user-agent') ?? '';

  // Block mobile on app routes
  if (APP_PATHS.some(p => pathname.startsWith(p)) && isMobileDevice(ua)) {
    const url = request.nextUrl.clone();
    url.pathname = '/mobile';
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
