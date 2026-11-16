import type { Db } from '../db';
import { sql } from '../db';
import { enqueue } from '../queue';
import { transportFor } from './client';
import { renderTemplate, type TemplateName } from './templates';

const SERVICE_WINDOW_MS = 24 * 3600 * 1000;

type Contact = { id: string; phone_e164: string; consent: string; last_inbound_at: Date | null; simulated: boolean };

/**
 * Queues a message to a WhatsApp contact, enforcing platform rules:
 * - never message opted-out contacts (except the single opt-out confirmation, `allowOptedOut`);
 * - free-form text only inside the 24h customer service window; otherwise a template is required.
 * Delivery happens in the `wa.send` background job so failures retry with backoff.
 */
export async function queueWhatsApp(
  db: Db,
  contactId: string,
  msg: { text: string; template?: { name: TemplateName; params: string[] }; allowOptedOut?: boolean },
): Promise<'queued' | 'skipped_opted_out' | 'skipped_no_template'> {
  const [c] = await db<Contact[]>`select id, phone_e164, consent, last_inbound_at, simulated from wa_contacts where id = ${contactId}`;
  if (!c) throw new Error('Unknown WhatsApp contact');
  if (c.consent === 'opted_out' && !msg.allowOptedOut) return 'skipped_opted_out';
  const inWindow = !!c.last_inbound_at && Date.now() - new Date(c.last_inbound_at).getTime() < SERVICE_WINDOW_MS;
  let kind: 'text' | 'template' = 'text';
  let body = msg.text;
  if (!inWindow) {
    if (!msg.template) return 'skipped_no_template';
    kind = 'template';
    body = renderTemplate(msg.template.name, msg.template.params);
  }
  const transport = transportFor(c.simulated).name;
  const payload = kind === 'template' ? { template: msg.template } : { text: body };
  const [row] = await db<{ id: string }[]>`
    insert into wa_outbound_messages (contact_id, kind, template_name, body, payload, transport)
    values (${c.id}, ${kind}, ${kind === 'template' ? msg.template!.name : null}, ${body}, ${db.json(payload as never)}, ${transport})
    returning id`;
  await enqueue(db, 'wa.send', { outboundId: row.id }, { idempotencyKey: `wa.send:${row.id}`, maxAttempts: 6 });
  return 'queued';
}

/** Background handler: performs the actual send. */
export async function deliverOutbound(outboundId: string) {
  const db = sql();
  const [m] = await db<{ id: string; kind: string; body: string; payload: { template?: { name: TemplateName; params: string[] } }; status: string; phone_e164: string; simulated: boolean }[]>`
    select o.id, o.kind, o.body, o.payload, o.status, c.phone_e164, c.simulated
    from wa_outbound_messages o join wa_contacts c on c.id = o.contact_id where o.id = ${outboundId}`;
  if (!m || m.status !== 'queued') return; // already sent — retry-safe
  try {
    const t = transportFor(m.simulated);
    const res = m.kind === 'template' ? await t.sendTemplate(m.phone_e164, m.payload.template!.name, m.payload.template!.params) : await t.sendText(m.phone_e164, m.body);
    await db`update wa_outbound_messages set status = 'sent', provider_message_id = ${res.providerMessageId}, error = null where id = ${m.id}`;
  } catch (err) {
    await db`update wa_outbound_messages set error = ${String(err instanceof Error ? err.message : err).slice(0, 1000)} where id = ${m.id}`;
    throw err;
  }
}

export async function markFailedOutbound(outboundId: string) {
  await sql()`update wa_outbound_messages set status = 'failed' where id = ${outboundId} and status = 'queued'`;
}
