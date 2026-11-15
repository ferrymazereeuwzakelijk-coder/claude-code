import { sql } from '@/lib/db';
import { registerUser } from '@/lib/auth/users';
import { saveContractorProfile } from '@/lib/contractors';
import { drainQueue } from '@/lib/worker';

export async function resetDb() {
  await sql().unsafe(`
    truncate users, sessions, contractor_profiles, contractor_categories, wa_contacts, wa_inbound_events,
      wa_outbound_messages, wa_simulator_media, account_link_codes, media, intake_sessions, intake_messages,
      jobs, job_private_details, job_media, job_matches, saved_jobs, quotes, job_messages, notifications,
      background_jobs, audit_log, ai_usage, rate_limits restart identity cascade;
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
