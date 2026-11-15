import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cheap edge-level gate: bounce requests without a session cookie away from private areas.
 * Real authorization (valid session, role, ownership) is enforced server-side on every page and action.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get('km_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/inloggen';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/klant/:path*', '/vakman/:path*', '/admin/:path*', '/meldingen'] };
