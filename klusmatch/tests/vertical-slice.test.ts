import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, sql } from '@/lib/db';
import { createIntake, handleCustomerTurn, confirmAndPublish } from '@/lib/intake/engine';
import { acceptQuote, submitQuote } from '@/lib/quotes';
import { contractorFeed } from '@/lib/contractors';
import { drainQueue, makeContractor, makeCustomer, resetDb } from './helpers';

afterAll(() => closeDb());
beforeEach(() => resetDb());

async function webIntakeToDraft(customerId: string) {
  const db = sql();
  const intakeId = await createIntake(db, { channel: 'web', customerId });
  const resolve = { resolveCustomerId: async () => customerId };
  let r = await handleCustomerTurn(intakeId, { text: 'De houten schutting in de achtertuin moet geschilderd worden, de verf bladdert af.' }, resolve);
  expect(r.state).toBe('collecting');
  expect(r.facts.category?.value).toBe('schilderwerk');
  r = await handleCustomerTurn(intakeId, { text: '3512 AB' }, resolve);
  expect(r.facts.postcode?.value).toBe('3512 AB');
  r = await handleCustomerTurn(intakeId, { text: 'ongeveer 15 meter lang, 1,8 meter hoog' }, resolve);
  r = await handleCustomerTurn(intakeId, { text: 'binnen een maand' }, resolve);
  r = await handleCustomerTurn(intakeId, { text: '€ 900' }, resolve);
  return { intakeId, r, resolve };
}

describe('vertical slice: intake → publish → match → quote → accept', () => {
  it('runs the full web workflow with persistent data', async () => {
    const customer = await makeCustomer();
    const near = await makeContractor({ postcode: '3581', categories: ['schilderwerk'], company: 'Schilders Utrecht' });
    const far = await makeContractor({ postcode: '9711', categories: ['schilderwerk'], radius: 30 }); // Groningen: out of range
    const wrongTrade = await makeContractor({ postcode: '3511', categories: ['tuinonderhoud'] });
    const unverified = await makeContractor({ postcode: '3511', categories: ['schilderwerk'], verified: false });

    const { intakeId, r } = await webIntakeToDraft(customer.id);
    expect(r.state).toBe('awaiting_confirmation');
    expect(r.draft?.description).toContain('Utrecht');
    expect(r.draft?.description).not.toContain('3512 AB'); // full postcode never in public text

    // Nothing is published before explicit confirmation.
    expect((await sql()`select count(*)::int as n from jobs`)[0].n).toBe(0);

    const published = await confirmAndPublish(intakeId, customer.id);
    expect(published.status).toBe('published');
    // Idempotent re-confirmation.
    expect((await confirmAndPublish(intakeId, customer.id)).jobId).toBe(published.jobId);

    const [job] = await sql()`select * from jobs where id = ${published.jobId}`;
    expect(job.postcode4).toBe('3512');
    expect(job.facts.postcode.source).toBe('customer');

    await drainQueue();
    const matches = await sql()`select contractor_id, notified from job_matches where job_id = ${published.jobId}`;
    expect(matches.map((m) => m.contractor_id)).toEqual([near.id]);
    const notes = await sql()`select * from notifications where user_id = ${near.id} and kind = 'new_job'`;
    expect(notes).toHaveLength(1);

    // Feed visibility mirrors the matching rules.
    expect((await contractorFeed(sql(), near.id)).map((j) => j.id)).toContain(published.jobId);
    expect(await contractorFeed(sql(), far.id)).toHaveLength(0);
    expect(await contractorFeed(sql(), wrongTrade.id)).toHaveLength(0);

    // Authorization on quoting.
    const quoteInput = { jobId: published.jobId, amountEur: 850, priceType: 'fixed' as const, message: 'Twee lagen dekkende beits incl. schuren en materiaal.' };
    await expect(submitQuote(far.id, quoteInput)).rejects.toThrow(/buiten/);
    await expect(submitQuote(unverified.id, quoteInput)).rejects.toThrow(/geverifieerd/);
    const quote = await submitQuote(near.id, quoteInput);
    await expect(submitQuote(near.id, quoteInput)).rejects.toThrow(/al een offerte/);

    await drainQueue();
    const customerNotes = await sql()`select kind from notifications where user_id = ${customer.id}`;
    expect(customerNotes.map((n) => n.kind)).toContain('quote_received');

    // Another customer cannot accept.
    const intruder = await makeCustomer('Indringer');
    await expect(acceptQuote(intruder.id, quote.id)).rejects.toThrow();

    await acceptQuote(customer.id, quote.id);
    const [after] = await sql()`select status, accepted_quote_id from jobs where id = ${published.jobId}`;
    expect(after).toMatchObject({ status: 'awarded', accepted_quote_id: quote.id });
    await expect(acceptQuote(customer.id, quote.id)).resolves.toMatchObject({ alreadyAccepted: true });

    await drainQueue();
    const accepted = await sql()`select kind from notifications where user_id = ${near.id} and kind = 'quote_accepted'`;
    expect(accepted).toHaveLength(1);

    const audits = (await sql()`select action from audit_log`).map((a) => a.action);
    expect(audits).toEqual(expect.arrayContaining(['job.published', 'job.matched', 'quote.submitted', 'quote.accepted']));
  });

  it('supports corrections while awaiting confirmation', async () => {
    const customer = await makeCustomer();
    const { intakeId, resolve } = await webIntakeToDraft(customer.id);
    const r = await handleCustomerTurn(intakeId, { text: 'Correctie: budget is maximaal €1200' }, resolve);
    expect(r.state).toBe('awaiting_confirmation');
    expect(r.facts.budget?.value).toBe(1200);
    expect(r.draft?.description).toMatch(/1\.200/);
  });

  it('escalates dangerous situations instead of publishing', async () => {
    const customer = await makeCustomer();
    const intakeId = await createIntake(sql(), { channel: 'web', customerId: customer.id });
    const r = await handleCustomerTurn(intakeId, { text: 'Ik ruik gas bij de cv-ketel, kan iemand komen kijken?' }, { resolveCustomerId: async () => customer.id });
    expect(r.state).toBe('escalated');
    expect(r.reply).toContain('0800-9009');
    const again = await handleCustomerTurn(intakeId, { text: 'ja' }, { resolveCustomerId: async () => customer.id });
    expect(again.state).toBe('escalated');
    expect((await sql()`select count(*)::int as n from jobs`)[0].n).toBe(0);
  });

  it('holds specialist (asbestos) jobs for review and does not match them', async () => {
    const customer = await makeCustomer();
    await makeContractor({ postcode: '3511', categories: ['asbest'] });
    const intakeId = await createIntake(sql(), { channel: 'web', customerId: customer.id });
    const opts = { resolveCustomerId: async () => customer.id };
    for (const t of ['Er liggen eternit golfplaten op het dak van de schuur die weg moeten', '3512 AB', '20 m2', 'flexibel', 'geen idee']) {
      await handleCustomerTurn(intakeId, { text: t }, opts);
    }
    const res = await handleCustomerTurn(intakeId, { text: 'ja' }, opts);
    expect(res.published?.status).toBe('under_review');
    await drainQueue();
    expect((await sql()`select count(*)::int as n from job_matches`)[0].n).toBe(0);
  });

  it('caps daily notifications per contractor', async () => {
    await sql()`update matching_rules set max_new_job_notifications_per_day = 1`;
    const contractor = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    for (let i = 0; i < 2; i++) {
      const customer = await makeCustomer();
      const { intakeId } = await webIntakeToDraft(customer.id);
      await confirmAndPublish(intakeId, customer.id);
    }
    await drainQueue();
    const m = await sql()`select notified, suppressed_reason from job_matches where contractor_id = ${contractor.id} order by created_at`;
    expect(m.map((x) => x.notified)).toEqual([true, false]);
    expect(m[1].suppressed_reason).toBe('daily_cap');
  });
});
