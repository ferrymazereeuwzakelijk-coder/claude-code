import { sql } from '@/lib/db';
import { registerUser } from '@/lib/auth/users';
import { saveContractorProfile } from '@/lib/contractors';
import { drainQueue } from '@/lib/worker';

export async function resetDb() {
  await sql().unsafe(`
    truncate users, sessions, contractor_profiles, contractor_categories, wa_contacts, wa_inbound_events,
      wa_outbound_messages, wa_simulator_media, account_link_codes, media, intake_sessions, intake_messages,
      jobs, job_private_details, job_media, job_matches, saved_jobs, quotes, job_messages, notifications,
      background_jobs, audit_log, ai_usage, rate_limits, job_events, reviews, portfolio_items, reports,
      subscriptions, stripe_events, outreach_leads, outreach_suppressions restart identity cascade;
    insert into matching_rules default values on conflict (id) do nothing;
    update matching_rules set max_contractors_per_job = 12, max_new_job_notifications_per_day = 15, require_verified = true;
  `);
}

let n = 0;
export async function makeCustomer(name = 'Sanne de Vries') {
  return registerUser(sql(), { fullName: name, email: `klant${++n}-${Date.now()}@test.nl`, password: 'correct-horse-battery', role: 'customer' });
}

export async function makeContractor(opts: { postcode: string; radius?: number; categories: string[]; verified?: boolean; company?: string }) {
  const u = await registerUser(sql(), { fullName: 'Vakman', email: `vakman${++n}-${Date.now()}@test.nl`, password: 'correct-horse-battery', role: 'contractor' });
  await saveContractorProfile(sql(), u.id, {
    companyName: opts.company ?? `Bedrijf ${n}`,
    kvkNumber: String(10000000 + n),
    description: '',
    basePostcode: opts.postcode,
    serviceRadiusKm: opts.radius ?? 30,
    categories: opts.categories,
    available: true,
  });
  if (opts.verified !== false) await sql()`update contractor_profiles set verification = 'verified', verified_at = now() where user_id = ${u.id}`;
  return u;
}

export { drainQueue };

import { createIntake, handleCustomerTurn, confirmAndPublish } from '@/lib/intake/engine';
import { acceptQuote, submitQuote } from '@/lib/quotes';

/** Customer + verified painter + a published job with one quote; optionally accepted. */
export async function makeJobWithQuote(opts: { accept?: boolean } = {}) {
  const customer = await makeCustomer();
  const contractor = await makeContractor({ postcode: '3581', categories: ['schilderwerk'], company: 'Schilders Utrecht' });
  const intakeId = await createIntake(sql(), { channel: 'web', customerId: customer.id });
  const o = { resolveCustomerId: async () => customer.id };
  for (const t of ['De schutting in de tuin moet geschilderd worden', '3512 AB', '15 meter', 'flexibel', '€ 800']) await handleCustomerTurn(intakeId, { text: t }, o);
  const { jobId } = await confirmAndPublish(intakeId, customer.id);
  const quote = await submitQuote(contractor.id, { jobId, amountEur: 750, priceType: 'fixed', message: 'Twee lagen beits inclusief schuren en materiaal.' });
  if (opts.accept) await acceptQuote(customer.id, quote.id);
  return { customer, contractor, jobId, quote };
}
