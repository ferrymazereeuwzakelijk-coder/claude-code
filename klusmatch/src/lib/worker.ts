import { sql } from './db';
import { processBatch, type JobKind } from './queue';
import { matchJob } from './jobs/matching';
import { notify } from './notifications';
import { formatEuro } from './intake/fields';
import { processInboundEvent } from './whatsapp/inbound';
import { deliverOutbound } from './whatsapp/outbound';
import { queueWhatsApp } from './whatsapp/outbound';

async function notifyQuoteSubmitted(quoteId: string) {
  const db = sql();
  const [q] = await db<{ ref: string; amount_cents: number; company_name: string; job_id: string; job_ref: string; job_title: string; customer_id: string }[]>`
    select q.ref, q.amount_cents, cp.company_name, j.id as job_id, j.ref as job_ref, j.title as job_title, j.customer_id
    from quotes q join jobs j on j.id = q.job_id join contractor_profiles cp on cp.user_id = q.contractor_id where q.id = ${quoteId}`;
  if (!q) return;
  const amount = formatEuro(q.amount_cents / 100);
  await notify(db, q.customer_id, {
    kind: 'quote_received',
    title: 'Nieuwe offerte ontvangen',
    body: `${q.company_name} biedt ${amount} voor "${q.job_title}".`,
    link: `/klant/klussen/${q.job_id}`,
    dedupeKey: `quote_received:${quoteId}`,
  });
  const [contact] = await db<{ id: string }[]>`select id from wa_contacts where user_id = ${q.customer_id} and consent = 'granted'`;
  if (contact) {
    await queueWhatsApp(db, contact.id, {
      text: `Nieuwe offerte voor je klus "${q.job_title}" (${q.job_ref}):\n${q.company_name} — ${amount}\n\nAntwoord *OFFERTES* voor het overzicht of *ACCEPTEER ${q.ref}* om deze offerte te kiezen.`,
      template: { name: 'klusmatch_new_quote', params: [q.job_ref, amount, q.company_name] },
    });
  }
}

async function notifyQuoteAccepted(quoteId: string) {
  const db = sql();
  const [q] = await db<{ contractor_id: string; job_id: string; job_ref: string; job_title: string }[]>`
    select q.contractor_id, j.id as job_id, j.ref as job_ref, j.title as job_title from quotes q join jobs j on j.id = q.job_id where q.id = ${quoteId}`;
  if (!q) return;
  await notify(db, q.contractor_id, {
    kind: 'quote_accepted',
    title: 'Je offerte is geaccepteerd 🎉',
    body: `De klant heeft gekozen voor jouw offerte op "${q.job_title}". Contactgegevens staan nu bij de klus.`,
    link: `/vakman/klussen/${q.job_id}`,
    dedupeKey: `quote_accepted:${quoteId}`,
  });
  const declined = await db<{ contractor_id: string; id: string }[]>`select contractor_id, id from quotes where job_id = ${q.job_id} and status = 'declined'`;
  for (const d of declined) {
    await notify(db, d.contractor_id, {
      kind: 'quote_declined',
      title: 'Klus vergeven aan een andere vakman',
      body: `De klant heeft voor "${q.job_title}" een andere offerte gekozen. Bedankt voor je aanbod!`,
      link: `/vakman/offertes`,
      dedupeKey: `quote_declined:${d.id}`,
    });
  }
}

export const handlers: Partial<Record<JobKind, (p: Record<string, unknown>) => Promise<void>>> = {
  'job.match': async (p) => void (await matchJob(sql(), String(p.jobId))),
  'wa.process_inbound': (p) => processInboundEvent(String(p.waMessageId)),
  'wa.send': (p) => deliverOutbound(String(p.outboundId)),
  'notify.quote_submitted': (p) => notifyQuoteSubmitted(String(p.quoteId)),
  'notify.quote_accepted': (p) => notifyQuoteAccepted(String(p.quoteId)),
};

/** Drains ready jobs (bounded). Used by the standalone worker and by INLINE_WORKER in development. */
export async function drainQueue(maxRounds = 10) {
  let total = 0;
  for (let i = 0; i < maxRounds; i++) {
    const n = await processBatch(handlers, 20);
    total += n;
    if (n === 0) break;
  }
  return total;
}
