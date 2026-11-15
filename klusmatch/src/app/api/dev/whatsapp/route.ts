import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { sql } from '@/lib/db';
import { env, isSimulatorEnabled } from '@/lib/env';
import { assertSameOrigin, errorResponse, kickWorker } from '@/lib/http';
import { sniffMime, storage } from '@/lib/storage';
import { buildInboundPayload } from '@/lib/whatsapp/payload';
import { signPayload } from '@/lib/whatsapp/signature';
import { ingestWebhook } from '@/lib/whatsapp/webhook';
import { UserFacingError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const PHONE_RE = /^\+31[1-9][0-9]{8}$/;

/**
 * Local WhatsApp simulator (disabled in production).
 * POST builds a payload in Meta's exact format, signs it with the app secret and pushes it through
 * the real webhook ingestion path — signature check, dedupe, queue, consent, intake — unchanged.
 */
export async function POST(req: Request) {
  try {
    if (!isSimulatorEnabled()) return new NextResponse('Not found', { status: 404 });
    assertSameOrigin(req);
    const form = await req.formData();
    const phone = String(form.get('phone') ?? '');
    if (!PHONE_RE.test(phone)) throw new UserFacingError('Gebruik een Nederlands nummer in E.164, bijv. +31612345678.');
    const text = String(form.get('text') ?? '').slice(0, 4000);
    const name = String(form.get('name') ?? 'Simulator').slice(0, 60);
    const file = form.get('file');
    let imageId: string | undefined;
    let mimeType: string | undefined;
    if (file instanceof File && file.size > 0) {
      const data = Buffer.from(await file.arrayBuffer());
      mimeType = sniffMime(data) ?? undefined;
      if (!mimeType) throw new UserFacingError('Alleen JPG, PNG, WebP of MP4.');
      imageId = `sim.media.${randomUUID()}`;
      const key = `simulator/${imageId}`;
      await storage().put(key, data, mimeType);
      await sql()`insert into wa_simulator_media (id, storage_key, mime_type) values (${imageId}, ${key}, ${mimeType})`;
    }
    if (!text && !imageId) throw new UserFacingError('Typ een bericht of kies een foto.');
    const waMessageId = String(form.get('replayId') || `wamid.sim.${randomUUID()}`);
    const body = JSON.stringify(buildInboundPayload({ from: phone, name, id: waMessageId, text, imageId, mimeType }));
    const result = await ingestWebhook(body, signPayload(body, env().WHATSAPP_APP_SECRET));
    kickWorker();
    return NextResponse.json({ ...result, waMessageId });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Conversation view for one phone number: inbound events + outbound messages, in order. */
export async function GET(req: Request) {
  if (!isSimulatorEnabled()) return new NextResponse('Not found', { status: 404 });
  const phone = new URL(req.url).searchParams.get('phone') ?? '';
  if (!PHONE_RE.test(phone)) return NextResponse.json({ messages: [], contact: null });
  const db = sql();
  const inbound = await db<{ id: string; at: Date; payload: { text?: { body: string }; image?: { id: string; caption?: string } }; status: string }[]>`
    select wa_message_id as id, received_at as at, payload, status from wa_inbound_events where phone_e164 = ${phone}`;
  const outbound = await db<{ id: string; at: Date; body: string; kind: string; template_name: string | null; status: string }[]>`
    select o.id, o.created_at as at, o.body, o.kind, o.template_name, o.status from wa_outbound_messages o
    join wa_contacts c on c.id = o.contact_id where c.phone_e164 = ${phone}`;
  const [contact] = await db<{ consent: string; user_id: string | null; last_inbound_at: Date | null }[]>`select consent, user_id, last_inbound_at from wa_contacts where phone_e164 = ${phone}`;
  const messages = [
    ...inbound.map((m) => ({ id: m.id, at: m.at, dir: 'in' as const, body: m.payload.text?.body ?? m.payload.image?.caption ?? '', imageId: m.payload.image?.id ?? null, status: m.status })),
    ...outbound.map((m) => ({ id: m.id, at: m.at, dir: 'out' as const, body: m.body, template: m.template_name, status: m.status })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return NextResponse.json({ messages, contact: contact ?? null });
}
