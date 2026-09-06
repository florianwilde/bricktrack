import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic route guard: it only checks whether a session cookie is present,
 * which keeps the middleware free of database access. The real check happens
 * in every page and server action via `requireUser()`.
 */
export function middleware(request: NextRequest) {
  const hasSession = getSessionCookie(request, { cookiePrefix: 'bricktrack' });
  if (hasSession) return NextResponse.next();

  const target = new URL('/anmelden', request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== '/') {
    target.searchParams.set('weiter', `${pathname}${search}`);
  }
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    /*
     * Everything except the public surface:
     * - /anmelden, /registrieren, /einladung  (auth pages)
     * - /w/...                                (public wishlists)
     * - /api/auth, /api/health, /api/files    (handled by their own guards)
     * - Next internals and static assets
     */
    '/((?!anmelden|registrieren|einladung|w/|api/auth|api/health|api/files|_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)',
  ],
};
