import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { ZodError } from 'zod';
import { UserFacingError } from './errors';
import { RateLimitError } from './rate-limit';
import { env } from './env';
import { drainQueue } from './worker';

/** CSRF defence for JSON/multipart route handlers: browsers always send Origin on cross-site POSTs. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return; // non-browser clients (tests, curl) — authentication still applies
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (new URL(origin).host !== host) throw new UserFacingError('Ongeldige herkomst van verzoek.', 403);
}

export function errorResponse(err: unknown) {
  if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429, headers: { 'Retry-After': String(err.retryAfterSeconds) } });
  if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? 'Ongeldige invoer' }, { status: 400 });
  console.error(err);
  return NextResponse.json({ error: 'Er ging iets mis. Probeer het opnieuw.' }, { status: 500 });
}

/** In development, process queued background work right after the response is sent. */
export function kickWorker() {
  if (!env().INLINE_WORKER) return;
  after(async () => {
    try {
      await drainQueue();
    } catch (err) {
      console.error('[inline-worker]', err);
    }
  });
}
