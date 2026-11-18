import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { env, isWhatsAppEnabled } from '@/lib/env';
import { kickWorker } from '@/lib/http';
import { ingestWebhook } from '@/lib/whatsapp/webhook';

export const dynamic = 'force-dynamic';

/** Meta's one-time verification handshake when registering the webhook URL. */
export async function GET(req: Request) {
  if (!isWhatsAppEnabled()) return new NextResponse('WhatsApp disabled', { status: 503 });
  const url = new URL(req.url);
  const token = url.searchParams.get('hub.verify_token') ?? '';
  const expected = env().WHATSAPP_VERIFY_TOKEN;
  const ok =
    url.searchParams.get('hub.mode') === 'subscribe' &&
    token.length === expected.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) return new NextResponse('Forbidden', { status: 403 });
  return new NextResponse(url.searchParams.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

/** Inbound messages and delivery statuses. Responds fast; work happens in background jobs. */
export async function POST(req: Request) {
  if (!isWhatsAppEnabled()) return new NextResponse('WhatsApp disabled', { status: 503 });
  const raw = await req.text();
  if (raw.length > 1_000_000) return new NextResponse('Payload too large', { status: 413 });
  const result = await ingestWebhook(raw, req.headers.get('x-hub-signature-256'));
  if (result.status !== 200) return new NextResponse(null, { status: result.status });
  if (result.accepted) kickWorker();
  return NextResponse.json({ received: true, accepted: result.accepted, duplicates: result.duplicates });
}
