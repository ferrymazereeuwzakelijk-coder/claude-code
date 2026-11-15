import { sql } from '../db';
import { env } from '../env';
import { enqueue } from '../queue';
import { parseWebhook, toE164 } from './payload';
import { verifySignature } from './signature';

export type IngestResult = { status: number; accepted: number; duplicates: number };

/**
 * Verifies, stores and enqueues a webhook delivery. Fast and retry-safe:
 * - signature is checked against the raw body before anything else;
 * - each message is stored once (primary key = WhatsApp message id), so Meta's retries are no-ops;
 * - processing happens asynchronously in the `wa.process_inbound` job.
 */
export async function ingestWebhook(rawBody: string, signatureHeader: string | null): Promise<IngestResult> {
  if (!verifySignature(rawBody, signatureHeader, env().WHATSAPP_APP_SECRET)) return { status: 401, accepted: 0, duplicates: 0 };
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, accepted: 0, duplicates: 0 };
  }
  const parsed = parseWebhook(json);
  // Unknown but correctly-signed payloads are acknowledged so Meta does not retry forever.
  if (!parsed) return { status: 200, accepted: 0, duplicates: 0 };

  const db = sql();
  let accepted = 0;
  let duplicates = 0;
  for (const m of parsed.messages) {
    await db.begin(async (tx) => {
      const rows = await tx`
        insert into wa_inbound_events (wa_message_id, phone_e164, payload)
        values (${m.id}, ${toE164(m.from)}, ${tx.json(m as never)})
        on conflict (wa_message_id) do nothing returning wa_message_id`;
      if (!rows.length) {
        duplicates++;
        return;
      }
      accepted++;
      await enqueue(tx, 'wa.process_inbound', { waMessageId: m.id }, { idempotencyKey: `wa.in:${m.id}` });
    });
  }
  for (const s of parsed.statuses) {
    const status = ['sent', 'delivered', 'read', 'failed'].includes(s.status) ? s.status : null;
    if (status) await db`update wa_outbound_messages set status = ${status} where provider_message_id = ${s.id}`;
  }
  return { status: 200, accepted, duplicates };
}
