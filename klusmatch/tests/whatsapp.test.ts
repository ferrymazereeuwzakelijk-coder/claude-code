import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { closeDb, sql } from '@/lib/db';
import { ingestWebhook } from '@/lib/whatsapp/webhook';
import { buildInboundPayload } from '@/lib/whatsapp/payload';
import { signPayload } from '@/lib/whatsapp/signature';
import { submitQuote } from '@/lib/quotes';
import { createLinkCode } from '@/lib/whatsapp/contacts';
import { drainQueue, makeContractor, makeCustomer, resetDb } from './helpers';

afterAll(() => closeDb());
beforeEach(() => resetDb());

const PHONE = '+31612345678';
let seq = 0;

async function send(text: string, extra: { imageId?: string; id?: string } = {}) {
  const id = extra.id ?? `wamid.test.${++seq}`;
  const body = JSON.stringify(buildInboundPayload({ from: PHONE, name: 'Fatima', id, text, imageId: extra.imageId }));
  const res = await ingestWebhook(body, signPayload(body, 'test-app-secret-123'));
  await drainQueue();
  return { res, id };
}

async function outbox() {
  return (await sql()<{ body: string }[]>`
    select o.body from wa_outbound_messages o join wa_contacts c on c.id = o.contact_id
    where c.phone_e164 = ${PHONE} order by o.created_at`).map((r) => r.body);
}
const last = async () => (await outbox()).at(-1) ?? '';

describe('WhatsApp webhook', () => {
  it('rejects unsigned or tampered deliveries', async () => {
    const body = JSON.stringify(buildInboundPayload({ from: PHONE, id: 'wamid.x', text: 'hoi' }));
    expect((await ingestWebhook(body, null)).status).toBe(401);
    expect((await ingestWebhook(body, signPayload(body, 'wrong-secret'))).status).toBe(401);
    expect((await ingestWebhook(body.replace('hoi', 'hallo'), signPayload(body, 'test-app-secret-123'))).status).toBe(401);
    expect((await sql()`select count(*)::int as n from wa_inbound_events`)[0].n).toBe(0);
  });

  it('deduplicates retried deliveries', async () => {
    const first = await send('Hallo', { id: 'wamid.dup' });
    const second = await send('Hallo', { id: 'wamid.dup' });
    expect(first.res).toMatchObject({ status: 200, accepted: 1 });
    expect(second.res).toMatchObject({ status: 200, accepted: 0, duplicates: 1 });
    expect(await outbox()).toHaveLength(1); // only one consent prompt
  });

  it('runs consent → photo intake → confirm → quote notification → accept, end to end', async () => {
    const contractor = await makeContractor({ postcode: '1013', categories: ['tuinonderhoud'], company: 'Groen & Zo' });

    // Simulator media: a real (tiny) PNG.
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b30000000049454e44ae426082', 'hex');
    await mkdir(path.resolve('.data/uploads/simulator'), { recursive: true });
    await writeFile(path.resolve('.data/uploads/simulator/test.png'), png);
    await sql()`insert into wa_simulator_media (id, storage_key, mime_type) values ('sim.media.1', 'simulator/test.png', 'image/png')`;

    await send('De heg en het gazon in mijn voortuin moeten flink onderhouden worden', { imageId: 'sim.media.1' });
    expect(await last()).toContain('Antwoord *JA*'); // consent prompt; nothing processed yet
    expect((await sql()`select count(*)::int as n from intake_sessions`)[0].n).toBe(0);

    await send('JA');
    const afterConsent = await outbox();
    expect(afterConsent.join('\n')).toMatch(/postcode/i); // original message was replayed into the intake
    const [{ n: mediaCount }] = await sql()`select count(*)::int as n from media`;
    expect(mediaCount).toBe(1);

    await send('1017 CD');
    await send('ongeveer 40 m2 gazon en 12 meter heg');
    await send('binnen 2 weken');
    await send('max 400 euro');
    expect(await last()).toContain('Klopt alles? Antwoord *JA*');
    expect((await sql()`select count(*)::int as n from jobs`)[0].n).toBe(0);

    await send('ja');
    expect(await last()).toMatch(/Je klus is geplaatst! Referentie: KM-/);
    const [job] = await sql()`select j.*, p.contact_phone from jobs j join job_private_details p on p.job_id = j.id`;
    expect(job.category_slug).toBe('tuinonderhoud');
    expect(job.contact_phone).toBe(PHONE);
    expect(job.description).not.toContain(PHONE);
    expect((await sql()`select count(*)::int as n from job_media where job_id = ${job.id}`)[0].n).toBe(1);
    const [owner] = await sql()`select created_via, phone_e164 from users where id = ${job.customer_id}`;
    expect(owner).toMatchObject({ created_via: 'whatsapp', phone_e164: PHONE });

    const quote = await submitQuote(contractor.id, { jobId: job.id, amountEur: 375, priceType: 'fixed', message: 'Heg knippen, gazon maaien en verticuteren, inclusief afvoer.' });
    await drainQueue();
    expect(await last()).toContain(`ACCEPTEER ${quote.ref}`);

    await send('OFFERTES');
    expect(await last()).toContain('Groen & Zo');

    await send(`ACCEPTEER ${quote.ref}`);
    expect(await last()).toContain('Antwoord *JA* om te bevestigen');
    expect((await sql()`select status from jobs where id = ${job.id}`)[0].status).toBe('published');

    await send('JA');
    expect(await last()).toContain('is geaccepteerd');
    expect((await sql()`select status from jobs where id = ${job.id}`)[0].status).toBe('awarded');
  });

  it('honours opt-out and opt-in', async () => {
    await send('Hallo');
    await send('JA');
    await send('STOP');
    expect(await last()).toContain('afgemeld');
    const before = (await outbox()).length;
    await send('Mijn dakgoot lekt, wie kan helpen?');
    expect(await outbox()).toHaveLength(before); // nothing sent to opted-out contact
    await send('START');
    expect(await last()).toContain('Welkom terug');
  });

  it('links a WhatsApp number to a web account with KOPPEL', async () => {
    const customer = await makeCustomer();
    const code = await createLinkCode(sql(), customer.id);
    await send('Hoi');
    await send('JA');
    await send(`KOPPEL ${code}`);
    expect(await last()).toContain('gekoppeld');
    const [c] = await sql()`select user_id from wa_contacts where phone_e164 = ${PHONE}`;
    expect(c.user_id).toBe(customer.id);
    await send(`KOPPEL ${code}`); // single use
    expect(await last()).toContain('ongeldig');
  });

  it('uses an approved template outside the 24h service window', async () => {
    const contractor = await makeContractor({ postcode: '1013', categories: ['tuinonderhoud'] });
    await send('Hoi');
    await send('JA');
    for (const t of ['Mijn gazon moet gemaaid en bemest worden deze zomer', '1017 CD', '60 m2', 'flexibel', 'geen idee', 'ja']) await send(t);
    const [job] = await sql()`select id from jobs`;
    await sql()`update wa_contacts set last_inbound_at = now() - interval '2 days'`;
    await submitQuote(contractor.id, { jobId: job.id, amountEur: 120, priceType: 'estimate', message: 'Maaien en bemesten, schatting op basis van foto en omschrijving.' });
    await drainQueue();
    const [o] = await sql()`select kind, template_name from wa_outbound_messages order by created_at desc limit 1`;
    expect(o).toMatchObject({ kind: 'template', template_name: 'klusmatch_new_quote' });
  });
});
