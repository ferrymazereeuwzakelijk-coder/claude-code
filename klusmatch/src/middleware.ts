import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/klant', '/vakman', '/admin', '/meldingen', '/account'];
// Machine-to-machine endpoints have their own signature checks and must stay reachable.
const OPEN_PATHS = ['/api/whatsapp/webhook', '/api/stripe/webhook'];

/**
 * 1. Optional site-wide HTTP Basic auth for private test deployments (DEMO_BASIC_AUTH="user:password").
 * 2. Cheap redirect for private areas without a session cookie. Real authorization happens server-side.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const gate = process.env.DEMO_BASIC_AUTH;
  if (gate && !OPEN_PATHS.some((p) => path.startsWith(p))) {
    const header = req.headers.get('authorization') ?? '';
    let ok = false;
    try {
      ok = header.startsWith('Basic ') && safeEqual(atob(header.slice(6)), gate);
    } catch {
      ok = false; // malformed base64
    }
    if (!ok) {
      return new NextResponse('Toegang tot deze testomgeving is beveiligd.', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="KlusMatch testomgeving", charset="UTF-8"' },
      });
    }
  }
  if (PROTECTED.some((p) => path === p || path.startsWith(p + '/')) && !req.cookies.get('km_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/inloggen';
    url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
