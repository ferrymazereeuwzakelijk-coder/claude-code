import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDb, sql } from '@/lib/db';
import { assignFoundingNumber, foundingStats, recordReferral } from '@/lib/growth';
import { normaliseNlMobile, saveContractorProfile } from '@/lib/contractors';
import { ingestWebhook } from '@/lib/whatsapp/webhook';
import { buildInboundPayload } from '@/lib/whatsapp/payload';
import { signPayload } from '@/lib/whatsapp/signature';
import { drainQueue, makeContractor, makeCustomer, makeJobWithQuote, resetDb } from './helpers';

afterAll(() => closeDb());
beforeEach(() => resetDb());

describe('founding members', () => {
  it('numbers verified contractors in order and stops at the limit', async () => {
    vi.stubEnv('FOUNDING_MEMBER_LIMIT', '2');
    const { FOUNDING_LIMIT } = await import('@/lib/growth');
    expect(FOUNDING_LIMIT).toBeGreaterThan(0);
    const a = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    const b = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    expect(await assignFoundingNumber(sql(), a.id)).toBe(1);
    expect(await assignFoundingNumber(sql(), a.id)).toBeNull(); // never twice
    expect(await assignFoundingNumber(sql(), b.id)).toBe(2);
    const stats = await foundingStats();
    expect(stats.taken).toBe(2);
    vi.unstubAllEnvs();
  });
});

describe('referrals', () => {
  it('records the referring contractor once and ignores self-referral and bad codes', async () => {
    const ref = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    const [{ referral_code }] = await sql()`select referral_code from contractor_profiles where user_id = ${ref.id}`;
    expect(referral_code).toMatch(/^[A-Z0-9]{8}$/);
    const newbie = await makeCustomer('Collega');
    await recordReferral(sql(), "x'; drop table users; --", newbie.id);
    await recordReferral(sql(), referral_code, newbie.id);
    await recordReferral(sql(), referral_code, ref.id); // self
    const rows = await sql()`select id, referred_by from users where referred_by is not null`;
    expect(rows).toEqual([{ id: newbie.id, referred_by: ref.id }]);
  });
});

describe('WhatsApp job alerts for contractors', () => {
  it('normalises Dutch mobile numbers', () => {
    expect(normaliseNlMobile('06-12 34 56 78')).toBe('+31612345678');
    expect(normaliseNlMobile('+31 6 12345678')).toBe('+31612345678');
    expect(normaliseNlMobile('0201234567')).toBeNull(); // landline
  });

  async function optIn(contractorId: string, phone = '0687654321') {
    // Keep company name and KvK unchanged: changing them would (rightly) send the profile back to verification.
    const [p] = await sql()`select company_name, kvk_number from contractor_profiles where user_id = ${contractorId}`;
    await saveContractorProfile(sql(), contractorId, {
      companyName: p.company_name, kvkNumber: p.kvk_number, description: '', basePostcode: '3581', serviceRadiusKm: 30,
      categories: ['schilderwerk'], available: true, whatsappAlerts: true, whatsappNumber: phone,
    });
  }

  it('sends alerts only to contractors who opted in, and STOP turns them off', async () => {
    const { contractor, jobId } = await makeJobWithQuote(); // first job, contractor not opted in yet
    await drainQueue();
    expect((await sql()`select count(*)::int as n from wa_outbound_messages`)[0].n).toBe(0);
    await optIn(contractor.id);
    const [cp] = await sql()`select whatsapp_alerts, whatsapp_alerts_consent_at from contractor_profiles where user_id = ${contractor.id}`;
    expect(cp.whatsapp_alerts).toBe(true);
    expect(cp.whatsapp_alerts_consent_at).toBeTruthy();

    // A second job in the same area and trade triggers a WhatsApp alert (template: no recent inbound message).
    const { createIntake, handleCustomerTurn, confirmAndPublish } = await import('@/lib/intake/engine');
    const customer = await makeCustomer();
    const intake = await createIntake(sql(), { channel: 'web', customerId: customer.id });
    for (const t of ['Kozijnen buiten moeten geschilderd worden', '3512 AB', '6 kozijnen', 'flexibel', 'geen idee']) {
      await handleCustomerTurn(intake, { text: t }, { resolveCustomerId: async () => customer.id });
    }
    await confirmAndPublish(intake, customer.id);
    await drainQueue();
    const out = await sql()`select kind, template_name, body from wa_outbound_messages`;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'template', template_name: 'klusmatch_new_job' });
    expect(out[0].body).toContain('/vakman/klussen/');
    expect(jobId).toBeTruthy();

    // The contractor replies on WhatsApp: no customer intake is started for their number.
    const send = async (text: string, id: string) => {
      const body = JSON.stringify(buildInboundPayload({ from: '+31687654321', id, text }));
      await ingestWebhook(body, signPayload(body, 'test-app-secret-123'));
      await drainQueue();
    };
    await send('Hoe werkt dit?', 'wamid.c1');
    expect((await sql()`select count(*)::int as n from intake_sessions where channel = 'whatsapp'`)[0].n).toBe(0);
    expect((await sql()`select body from wa_outbound_messages order by created_at desc limit 1`)[0].body).toContain('ontvangt klusmeldingen');

    await send('STOP', 'wamid.c2');
    expect((await sql()`select whatsapp_alerts from contractor_profiles where user_id = ${contractor.id}`)[0].whatsapp_alerts).toBe(false);
  });

  it('refuses a number that belongs to another account', async () => {
    const a = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    const b = await makeContractor({ postcode: '3581', categories: ['schilderwerk'] });
    await optIn(a.id, '0611111111');
    await expect(optIn(b.id, '0611111111')).rejects.toThrow(/ander account/);
  });
});
