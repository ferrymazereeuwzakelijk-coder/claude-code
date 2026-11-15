import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { closeDb, sql } from '@/lib/db';
import { cancelJob, completeJob, jobTimeline } from '@/lib/jobs/lifecycle';
import { createReview, ratingsFor, replyToReview } from '@/lib/reviews';
import { createReport, resolveReport } from '@/lib/reports';
import { addPortfolioItem, MAX_PORTFOLIO_ITEMS } from '@/lib/portfolio';
import { handleStripeEvent, verifyStripeSignature } from '@/lib/billing';
import type { SessionUser } from '@/lib/auth/session';
import { makeContractor, makeCustomer, makeJobWithQuote, resetDb } from './helpers';

afterAll(() => closeDb());
beforeEach(() => resetDb());

const asUser = (u: { id: string; role: string }): SessionUser => ({ id: u.id, role: u.role as SessionUser['role'], email: null, fullName: 'Test', phone: null });
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

describe('job lifecycle', () => {
  it('records a timeline and supports cancel before award', async () => {
    const { customer, contractor, jobId } = await makeJobWithQuote();
    await expect(cancelJob(contractor.id, jobId)).rejects.toThrow();
    await cancelJob(customer.id, jobId, { reason: 'Zelf opgelost' });
    const [job] = await sql()`select status, cancel_reason from jobs where id = ${jobId}`;
    expect(job).toMatchObject({ status: 'cancelled', cancel_reason: 'Zelf opgelost' });
    expect((await sql()`select status from quotes where job_id = ${jobId}`)[0].status).toBe('declined');
    expect((await jobTimeline(sql(), jobId)).map((e) => e.kind)).toEqual(['published', 'quote_received', 'cancelled']);
    const [n] = await sql()`select count(*)::int as n from notifications where user_id = ${contractor.id} and kind = 'job_cancelled'`;
    expect(n.n).toBe(1);
  });

  it('cannot cancel an awarded job, but can complete it', async () => {
    const { customer, jobId } = await makeJobWithQuote({ accept: true });
    await expect(cancelJob(customer.id, jobId)).rejects.toThrow(/al een vakman gekozen/);
    await completeJob(customer.id, jobId);
    await completeJob(customer.id, jobId); // idempotent
    expect((await jobTimeline(sql(), jobId)).map((e) => e.kind)).toEqual(['published', 'quote_received', 'awarded', 'completed']);
  });
});

describe('reviews', () => {
  it('only allows one review by the customer after completion, and one reply', async () => {
    const { customer, contractor, jobId } = await makeJobWithQuote({ accept: true });
    await expect(createReview(customer.id, jobId, { rating: 5, body: 'Heel netjes gewerkt!' })).rejects.toThrow(/afgerond/);
    await completeJob(customer.id, jobId);
    const stranger = await makeCustomer('Vreemde');
    await expect(createReview(stranger.id, jobId, { rating: 1, body: 'Nooit klant geweest maar toch' })).rejects.toThrow();
    const review = await createReview(customer.id, jobId, { rating: 4, body: 'Netjes en op tijd, aanrader.' });
    await expect(createReview(customer.id, jobId, { rating: 5, body: 'Nog een keer proberen' })).rejects.toThrow(/al beoordeeld/);
    expect((await ratingsFor(sql(), [contractor.id])).get(contractor.id)).toEqual({ avg: 4, count: 1 });
    await replyToReview(contractor.id, review.id, 'Dank je wel!');
    await expect(replyToReview(contractor.id, review.id, 'Nog een reactie')).rejects.toThrow(/één keer/);
  });
});

describe('reports & disputes', () => {
  it('lets only the parties open a dispute, prevents duplicates, and admin can hide reviews', async () => {
    const { customer, contractor, jobId } = await makeJobWithQuote({ accept: true });
    const outsider = await makeContractor({ postcode: '9711', categories: ['dakwerk'] });
    const dispute = { kind: 'dispute' as const, targetType: 'job' as const, targetId: jobId, reason: 'no_show' as const, body: 'De vakman is niet komen opdagen op de afspraak.' };
    await expect(createReport(asUser(outsider), dispute)).rejects.toThrow(/geschil kan alleen/);
    const r = await createReport(asUser(customer), dispute);
    await expect(createReport(asUser(customer), dispute)).rejects.toThrow(/al gemeld/);
    expect((await jobTimeline(sql(), jobId)).at(-1)?.kind).toBe('disputed');
    expect((await sql()`select count(*)::int as n from notifications where user_id = ${contractor.id} and kind = 'dispute_opened'`)[0].n).toBe(1);

    const admin = await makeCustomer('Admin');
    await resolveReport(admin.id, r.id, { status: 'resolved', note: 'Nieuwe afspraak gemaakt.' });
    expect((await sql()`select status from reports where id = ${r.id}`)[0].status).toBe('resolved');

    await completeJob(customer.id, jobId);
    const review = await createReview(customer.id, jobId, { rating: 1, body: 'Kwam pas na drie weken langs.' });
    const rep = await createReport(asUser(contractor), { kind: 'report', targetType: 'review', targetId: review.id, reason: 'inappropriate', body: 'Deze review bevat onjuiste informatie.' });
    await resolveReport(admin.id, rep.id, { status: 'resolved', hideTarget: true });
    expect((await ratingsFor(sql(), [contractor.id])).get(contractor.id)).toBeUndefined();
  });
});

describe('portfolio', () => {
  it('stores images, enforces the limit and is publicly marked', async () => {
    const c = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    const item = await addPortfolioItem(c.id, PNG, { caption: 'Kozijnen in Zeist', categorySlug: 'schilderwerk' });
    expect(item.id).toBeTruthy();
    await expect(addPortfolioItem(c.id, Buffer.from('not an image at all'), {})).rejects.toThrow(/toegestaan/);
    for (let i = 1; i < MAX_PORTFOLIO_ITEMS; i++) await addPortfolioItem(c.id, PNG, {});
    await expect(addPortfolioItem(c.id, PNG, {})).rejects.toThrow(/al 12/);
  });
});

describe('billing (Stripe webhook)', () => {
  const secret = 'whsec_test_123';
  const sign = (payload: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;

  it('verifies signatures with replay tolerance', () => {
    const body = '{"id":"evt_1"}';
    expect(verifyStripeSignature(body, sign(body), secret)).toBe(true);
    expect(verifyStripeSignature(body + 'x', sign(body), secret)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, Math.floor(Date.now() / 1000) - 3600), secret)).toBe(false);
    expect(verifyStripeSignature(body, null, secret)).toBe(false);
  });

  it('activates and cancels subscriptions idempotently', async () => {
    const c = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    const done = { id: 'evt_a', type: 'checkout.session.completed', data: { object: { client_reference_id: c.id, metadata: { plan: 'pro' }, customer: 'cus_1', subscription: 'sub_1' } } };
    expect(await handleStripeEvent(done)).toBe('handled');
    expect(await handleStripeEvent(done)).toBe('duplicate');
    expect((await sql()`select plan, status from subscriptions where contractor_id = ${c.id}`)[0]).toMatchObject({ plan: 'pro', status: 'active' });
    await handleStripeEvent({ id: 'evt_b', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', status: 'canceled' } } });
    expect((await sql()`select status from subscriptions where contractor_id = ${c.id}`)[0].status).toBe('canceled');
  });
});
