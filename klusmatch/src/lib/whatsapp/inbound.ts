import { ZodError } from 'zod';
import { sql } from '../db';
import { audit } from '../audit';
import { UserFacingError } from '../errors';
import { formatEuro } from '../intake/fields';
import { createIntake, handleCustomerTurn } from '../intake/engine';
import { acceptQuote, PRICE_TYPE_LABEL } from '../quotes';
import { completeJob } from '../jobs/lifecycle';
import { createReview } from '../reviews';
import { storeMedia } from '../storage';
import { rateLimit, RateLimitError } from '../rate-limit';
import { waTransport } from './client';
import { ensureCustomerForContact, redeemLinkCode, setPendingAction, upsertContact, type WaContact } from './contacts';
import { queueWhatsApp } from './outbound';
import { messageText, toE164, type InboundMessage } from './payload';

const OPT_OUT = /^\s*(stop|afmelden|uitschrijven|unsubscribe)\s*[.!]?\s*$/i;
const OPT_IN = /^\s*(start|aanmelden)\s*[.!]?\s*$/i;
const YES = /^\s*(ja|ja graag|akkoord|ok|oké|yes)\s*[.!]?\s*$/i;
const NO = /^\s*(nee|nee dank je|no|annuleer)\s*[.!]?\s*$/i;

export const CONSENT_TEXT = [
  'Welkom bij KlusMatch! 👋 Via WhatsApp plaats je in een paar berichten je klus en ontvang je offertes van geverifieerde vakmensen.',
  '',
  'Om je te helpen verwerken we je berichten, foto’s en telefoonnummer volgens ons privacybeleid (klusmatch.nl/privacy). Je telefoonnummer en adres worden nooit openbaar getoond.',
  '',
  'Antwoord *JA* om akkoord te gaan. Je kunt je altijd afmelden met *STOP*.',
].join('\n');

const HELP_TEXT = [
  'Zo werkt KlusMatch via WhatsApp:',
  '• Stuur een foto en beschrijving van je klus om te starten',
  '• *OFFERTES* — bekijk ontvangen offertes',
  '• *ACCEPTEER <code>* — kies een offerte (bijv. ACCEPTEER Q7F3K)',
  '• *AFGEROND* — meld dat je klus klaar is en geef een review',
  '• *NIEUW* — begin een nieuwe aanvraag',
  '• *KOPPEL <code>* — koppel aan je account op de website',
  '• *STOP* — afmelden',
].join('\n');

/** Background job entry point: processes one stored inbound event exactly once. */
export async function processInboundEvent(waMessageId: string) {
  const db = sql();
  const [ev] = await db<{ payload: InboundMessage; status: string }[]>`select payload, status from wa_inbound_events where wa_message_id = ${waMessageId}`;
  if (!ev || ev.status === 'processed' || ev.status === 'ignored') return;
  try {
    const status = await routeMessage(ev.payload);
    await db`update wa_inbound_events set status = ${status}, processed_at = now(), error = null where wa_message_id = ${waMessageId}`;
  } catch (err) {
    await db`update wa_inbound_events set error = ${String(err instanceof Error ? err.message : err).slice(0, 1000)} where wa_message_id = ${waMessageId}`;
    throw err; // let the queue retry
  }
}

async function reply(contactId: string, text: string, allowOptedOut = false) {
  await queueWhatsApp(sql(), contactId, { text, allowOptedOut });
}

async function routeMessage(m: InboundMessage): Promise<'processed' | 'ignored'> {
  const db = sql();
  const contact = await upsertContact(db, toE164(m.from), m.profileName);
  const text = messageText(m);

  // ── opt-out / opt-in always first ──
  if (OPT_OUT.test(text)) {
    await db`update wa_contacts set consent = 'opted_out', opted_out_at = now(), pending_action = null where id = ${contact.id}`;
    await audit(db, { action: 'whatsapp.opted_out', entityType: 'wa_contact', entityId: contact.id });
    await reply(contact.id, 'Je bent afgemeld en ontvangt geen berichten meer van KlusMatch. Stuur START om je weer aan te melden.', true);
    return 'processed';
  }
  if (contact.consent === 'opted_out') {
    if (!OPT_IN.test(text)) return 'ignored';
    await db`update wa_contacts set consent = 'granted', consent_at = now(), opted_out_at = null where id = ${contact.id}`;
    await audit(db, { action: 'whatsapp.opted_in', entityType: 'wa_contact', entityId: contact.id });
    await reply(contact.id, 'Welkom terug! Stuur een foto en een korte beschrijving van je klus om te beginnen.');
    return 'processed';
  }

  try {
    await rateLimit(db, `wa:${contact.id}`, 40, 3600);
  } catch (err) {
    if (err instanceof RateLimitError) return 'ignored';
    throw err;
  }

  // ── consent ──
  if (contact.consent === 'unknown') {
    await db`update wa_contacts set consent = 'pending' where id = ${contact.id}`;
    // Keep the first message so it is not lost once the customer agrees.
    await setPendingAction(db, contact.id, { type: 'consent', replayMessageId: m.id });
    await reply(contact.id, CONSENT_TEXT);
    return 'processed';
  }
  if (contact.consent === 'pending') {
    if (!YES.test(text)) {
      await reply(contact.id, 'Om verder te gaan hebben we je toestemming nodig. Antwoord *JA* om akkoord te gaan of *STOP* om af te melden.');
      return 'processed';
    }
    await db`update wa_contacts set consent = 'granted', consent_at = now(), pending_action = null where id = ${contact.id}`;
    await audit(db, { action: 'whatsapp.consent_granted', entityType: 'wa_contact', entityId: contact.id });
    const replayId = contact.pending_action?.type === 'consent' ? contact.pending_action.replayMessageId : undefined;
    const [orig] = replayId ? await db<{ payload: InboundMessage }[]>`select payload from wa_inbound_events where wa_message_id = ${replayId}` : [];
    const origText = orig ? messageText(orig.payload) : '';
    const substantive = orig && (orig.payload.image || orig.payload.video || origText.split(/\s+/).length >= 4);
    if (substantive) {
      await reply(contact.id, 'Dank je! Ik ga meteen aan de slag met je bericht.');
      await intakeTurn({ ...contact, consent: 'granted' }, orig.payload);
    } else {
      await reply(contact.id, 'Top, dank je! Stuur een foto en een korte beschrijving van je klus om te beginnen.');
    }
    return 'processed';
  }

  // ── pending confirmation (quote acceptance) ──
  if (contact.pending_action?.type === 'accept_quote') {
    const action = contact.pending_action;
    if (YES.test(text)) {
      await setPendingAction(db, contact.id, null);
      const userId = await ensureCustomerForContact(contact.id);
      try {
        await acceptQuote(userId, action.quoteId, 'whatsapp');
        await reply(contact.id, `Offerte ${action.quoteRef} is geaccepteerd! 🎉 De vakman ontvangt je contactgegevens en neemt contact met je op. De andere vakmensen krijgen automatisch bericht.`);
      } catch (err) {
        await reply(contact.id, err instanceof UserFacingError ? err.message : 'Er ging iets mis bij het accepteren. Probeer het later opnieuw.');
        if (!(err instanceof UserFacingError)) throw err;
      }
      return 'processed';
    }
    if (NO.test(text)) {
      await setPendingAction(db, contact.id, null);
      await reply(contact.id, 'Oké, de offerte is niet geaccepteerd. Stuur OFFERTES om het overzicht opnieuw te zien.');
      return 'processed';
    }
    await setPendingAction(db, contact.id, null); // any other message cancels the pending confirmation
  }

  // ── job completion & review flow ──
  const pa = contact.pending_action;
  if (pa?.type === 'complete_job') {
    await setPendingAction(db, contact.id, null);
    if (YES.test(text)) {
      const userId = await ensureCustomerForContact(contact.id);
      await completeJob(userId, pa.jobId);
      const [c] = await db<{ company_name: string }[]>`
        select cp.company_name from jobs j join quotes q on q.id = j.accepted_quote_id join contractor_profiles cp on cp.user_id = q.contractor_id where j.id = ${pa.jobId}`;
      await setPendingAction(db, contact.id, { type: 'review_rating', jobId: pa.jobId, company: c?.company_name ?? 'de vakman' });
      await reply(contact.id, `Top, de klus is afgerond! ✓\n\nHoe tevreden ben je over ${c?.company_name ?? 'de vakman'}? Stuur een cijfer van *1* (slecht) tot *5* (uitstekend). Of stuur *OVERSLAAN*.`);
      return 'processed';
    }
    if (NO.test(text)) {
      await reply(contact.id, 'Oké, de klus staat nog open.');
      return 'processed';
    }
  }
  if (pa?.type === 'review_rating') {
    const n = text.match(/^\s*([1-5])\s*$/);
    if (n) {
      await setPendingAction(db, contact.id, { type: 'review_text', jobId: pa.jobId, rating: Number(n[1]) });
      await reply(contact.id, `${'★'.repeat(Number(n[1]))} Dank je! Wil je in een paar zinnen vertellen hoe het ging? Je review komt met alleen je voornaam op het profiel van ${pa.company}.`);
      return 'processed';
    }
    await setPendingAction(db, contact.id, null);
    if (/^\s*overslaan\s*$/i.test(text)) {
      await reply(contact.id, 'Prima. Je kunt later altijd nog een review schrijven op de website.');
      return 'processed';
    }
  }
  if (pa?.type === 'review_text') {
    await setPendingAction(db, contact.id, null);
    const userId = await ensureCustomerForContact(contact.id);
    try {
      await createReview(userId, pa.jobId, { rating: pa.rating, body: text });
      await reply(contact.id, 'Bedankt voor je review! Daarmee help je andere klanten een goede vakman te kiezen. 🙏');
    } catch (err) {
      if (!(err instanceof UserFacingError) && !(err instanceof ZodError)) throw err;
      await setPendingAction(db, contact.id, pa);
      await reply(contact.id, 'Je toelichting is te kort. Schrijf minimaal een paar woorden over hoe het ging.');
    }
    return 'processed';
  }

  // ── commands ──
  const cmd = text.toUpperCase();
  if (cmd === 'HELP' || cmd === 'MENU') {
    await reply(contact.id, HELP_TEXT);
    return 'processed';
  }
  const link = cmd.match(/^KOPPEL\s+(\d{6})$/);
  if (link) {
    const res = await redeemLinkCode(contact.id, link[1]);
    await reply(
      contact.id,
      res === 'linked'
        ? 'Je WhatsApp-nummer is gekoppeld aan je KlusMatch-account. Je klussen en offertes zie je nu ook op de website.'
        : res === 'conflict'
          ? 'Dit nummer is al gekoppeld aan een ander account. Neem contact op met support.'
          : 'Deze code is ongeldig of verlopen. Maak een nieuwe code aan in je dashboard.',
    );
    return 'processed';
  }
  if (cmd === 'OFFERTES') {
    await reply(contact.id, await quotesOverview(contact));
    return 'processed';
  }
  const accept = cmd.match(/^ACCEPTEER\s+(Q[A-Z0-9]{5})$/);
  if (accept) {
    await startQuoteAcceptance(contact, accept[1]);
    return 'processed';
  }
  if (cmd === 'AFGEROND') {
    const [job] = contact.user_id
      ? await db<{ id: string; title: string }[]>`select id, title from jobs where customer_id = ${contact.user_id} and status = 'awarded' order by published_at desc limit 1`
      : [];
    if (!job) {
      await reply(contact.id, 'Ik vind geen lopende klus met een gekozen vakman. Stuur OFFERTES voor een overzicht.');
      return 'processed';
    }
    await setPendingAction(db, contact.id, { type: 'complete_job', jobId: job.id, title: job.title });
    await reply(contact.id, `Is de klus "${job.title}" helemaal afgerond? Antwoord *JA* of *NEE*.`);
    return 'processed';
  }
  if (cmd === 'NIEUW') {
    await db`update intake_sessions set state = 'cancelled', updated_at = now() where wa_contact_id = ${contact.id} and state in ('collecting', 'awaiting_confirmation')`;
    await reply(contact.id, 'Prima, we beginnen opnieuw. Stuur een foto en een korte beschrijving van je nieuwe klus.');
    return 'processed';
  }

  await intakeTurn(contact, m);
  return 'processed';
}

async function intakeTurn(contact: WaContact, m: InboundMessage) {
  const db = sql();
  const mediaIds: string[] = [];
  const media = m.image ?? m.video;
  if (media) {
    const data = await waTransport().downloadMedia(media.id);
    try {
      const stored = await storeMedia(db, data, { waContactId: contact.id, userId: contact.user_id });
      mediaIds.push(stored.id);
    } catch (err) {
      if (err instanceof UserFacingError) {
        await reply(contact.id, err.message);
        return;
      }
      throw err;
    }
  }
  const [active] = await db<{ id: string }[]>`
    select id from intake_sessions where wa_contact_id = ${contact.id} and state in ('collecting', 'awaiting_confirmation')
    order by created_at desc limit 1`;
  const intakeId = active?.id ?? (await createIntake(db, { channel: 'whatsapp', waContactId: contact.id, customerId: contact.user_id }));
  try {
    const res = await handleCustomerTurn(intakeId, { text: messageText(m), mediaIds }, { resolveCustomerId: () => ensureCustomerForContact(contact.id) });
    await reply(contact.id, res.reply);
  } catch (err) {
    if (err instanceof UserFacingError) await reply(contact.id, err.message);
    else throw err;
  }
}

async function quotesOverview(contact: WaContact) {
  if (!contact.user_id) return 'Je hebt nog geen klussen geplaatst. Stuur een foto en beschrijving om te beginnen.';
  const quotes = await sql()<{ ref: string; amount_cents: number; price_type: keyof typeof PRICE_TYPE_LABEL; company_name: string; job_ref: string; job_title: string; status: string; verification: string }[]>`
    select q.ref, q.amount_cents, q.price_type, cp.company_name, cp.verification, j.ref as job_ref, j.title as job_title, q.status
    from quotes q join jobs j on j.id = q.job_id join contractor_profiles cp on cp.user_id = q.contractor_id
    where j.customer_id = ${contact.user_id} and j.status in ('published', 'awarded') and q.status in ('submitted', 'accepted')
    order by j.published_at desc, q.amount_cents asc limit 10`;
  if (!quotes.length) return 'Er zijn nog geen offertes binnen. We laten het je weten zodra er een binnenkomt.';
  const lines = ['Je offertes:'];
  let lastJob = '';
  for (const q of quotes) {
    if (q.job_ref !== lastJob) {
      lines.push('', `*${q.job_title}* (${q.job_ref})`);
      lastJob = q.job_ref;
    }
    const badge = q.verification === 'verified' ? ' ✓' : '';
    const st = q.status === 'accepted' ? ' — GEACCEPTEERD' : '';
    lines.push(`• ${q.ref}: ${formatEuro(q.amount_cents / 100)} (${PRICE_TYPE_LABEL[q.price_type].toLowerCase()}) — ${q.company_name}${badge}${st}`);
  }
  lines.push('', 'Accepteer met: ACCEPTEER <code>. Details bekijken kan ook op de website.');
  return lines.join('\n');
}

async function startQuoteAcceptance(contact: WaContact, ref: string) {
  const db = sql();
  const [q] = contact.user_id
    ? await db<{ id: string; ref: string; amount_cents: number; company_name: string; job_title: string }[]>`
        select q.id, q.ref, q.amount_cents, cp.company_name, j.title as job_title
        from quotes q join jobs j on j.id = q.job_id join contractor_profiles cp on cp.user_id = q.contractor_id
        where q.ref = ${ref} and j.customer_id = ${contact.user_id} and q.status = 'submitted' and j.status = 'published'`
    : [];
  if (!q) {
    await reply(contact.id, `Ik kan geen openstaande offerte ${ref} voor jou vinden. Stuur OFFERTES voor het overzicht.`);
    return;
  }
  await setPendingAction(db, contact.id, { type: 'accept_quote', quoteId: q.id, quoteRef: q.ref });
  await reply(
    contact.id,
    `Je staat op het punt de offerte van *${q.company_name}* (${formatEuro(q.amount_cents / 100)}) te accepteren voor "${q.job_title}". De vakman krijgt dan je telefoonnummer en postcode.\n\nAntwoord *JA* om te bevestigen of *NEE* om te annuleren.`,
  );
}
