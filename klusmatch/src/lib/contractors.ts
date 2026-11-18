import { z } from 'zod';
import type { Db, Sql } from './db';
import { audit } from './audit';
import { UserFacingError } from './errors';
import { parsePostcode } from './geo';
import { newReferralCode } from './growth';

/** Normalises Dutch mobile numbers (06…, +316…, 00316…) to E.164; null if not a Dutch mobile. */
export function normaliseNlMobile(input: string): string | null {
  const d = input.replace(/[\s().-]/g, '');
  const m = d.match(/^(?:\+31|0031|0)(6\d{8})$/);
  return m ? `+31${m[1]}` : null;
}

export const profileSchema = z.object({
  companyName: z.string().trim().min(2, 'Vul je bedrijfsnaam in').max(120),
  kvkNumber: z.string().trim().regex(/^[0-9]{8}$/, 'Een KvK-nummer heeft 8 cijfers'),
  description: z.string().trim().max(2000).default(''),
  basePostcode: z.string().trim(),
  serviceRadiusKm: z.coerce.number().int().min(5).max(150),
  categories: z.array(z.string()).min(1, 'Kies minimaal één vakgebied').max(8),
  available: z.boolean().default(true),
  whatsappAlerts: z.boolean().default(false),
  whatsappNumber: z.string().trim().max(20).default(''),
});

export type ContractorProfile = {
  user_id: string; company_name: string; kvk_number: string | null; description: string; base_postcode: string;
  service_radius_km: number; available: boolean; verification: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  verification_note: string | null; categories: string[];
  founding_member_no: number | null; referral_code: string | null; whatsapp_alerts: boolean; alert_phone: string | null;
};

export async function getContractorProfile(db: Db, userId: string): Promise<ContractorProfile | null> {
  const [p] = await db<ContractorProfile[]>`
    select cp.*, array(select category_slug from contractor_categories where contractor_id = cp.user_id) as categories,
           (select phone_e164 from wa_contacts w where w.user_id = cp.user_id limit 1) as alert_phone
    from contractor_profiles cp where user_id = ${userId}`;
  return p ?? null;
}

/**
 * Saves the business profile. Changing the KvK number or company name of a verified business
 * sends it back to verification, so a verified badge cannot be transferred to another company.
 */
export async function saveContractorProfile(db: Sql, userId: string, input: z.input<typeof profileSchema>) {
  const data = profileSchema.parse(input);
  const pc = parsePostcode(data.basePostcode);
  if (!pc) throw new UserFacingError('Ongeldige postcode voor je vestigingsadres.');
  const valid = await db<{ slug: string }[]>`select slug from categories where active and slug = any(${data.categories})`;
  if (valid.length !== new Set(data.categories).size) throw new UserFacingError('Onbekende categorie gekozen.');
  const alertPhone = data.whatsappAlerts ? normaliseNlMobile(data.whatsappNumber) : null;
  if (data.whatsappAlerts && !alertPhone) throw new UserFacingError('Vul een geldig Nederlands mobiel nummer in voor WhatsApp-meldingen (06…).');

  await db.begin(async (tx) => {
    const [existing] = await tx<{ kvk_number: string; company_name: string; verification: string }[]>`
      select kvk_number, company_name, verification from contractor_profiles where user_id = ${userId} for update`;
    const identityChanged = existing && (existing.kvk_number !== data.kvkNumber || existing.company_name !== data.companyName);
    const verification = !existing || existing.verification === 'unsubmitted' ? 'pending' : identityChanged ? 'pending' : existing.verification;
    await tx`
      insert into contractor_profiles (user_id, company_name, kvk_number, description, base_postcode, base_lat, base_lng, service_radius_km, available, verification, referral_code)
      values (${userId}, ${data.companyName}, ${data.kvkNumber}, ${data.description}, ${pc.postcode4}, ${pc.lat}, ${pc.lng}, ${data.serviceRadiusKm}, ${data.available}, ${verification}, ${newReferralCode()})
      on conflict (user_id) do update set
        company_name = excluded.company_name, kvk_number = excluded.kvk_number, description = excluded.description,
        base_postcode = excluded.base_postcode, base_lat = excluded.base_lat, base_lng = excluded.base_lng,
        service_radius_km = excluded.service_radius_km, available = excluded.available,
        verification = ${verification}, updated_at = now(),
        whatsapp_alerts = ${!!alertPhone},
        whatsapp_alerts_consent_at = case when ${!!alertPhone} then coalesce(contractor_profiles.whatsapp_alerts_consent_at, now()) else null end`;
    // WhatsApp job alerts: the contractor opted in on this form, which is recorded as consent for this number.
    if (alertPhone) {
      const [other] = await tx<{ user_id: string | null }[]>`select user_id from wa_contacts where phone_e164 = ${alertPhone}`;
      if (other && other.user_id && other.user_id !== userId) throw new UserFacingError('Dit WhatsApp-nummer is al gekoppeld aan een ander account.');
      await tx`update wa_contacts set user_id = null where user_id = ${userId} and phone_e164 <> ${alertPhone}`;
      await tx`
        insert into wa_contacts (phone_e164, user_id, consent, consent_at) values (${alertPhone}, ${userId}, 'granted', now())
        on conflict (phone_e164) do update set user_id = ${userId}, consent = 'granted', consent_at = coalesce(wa_contacts.consent_at, now()), opted_out_at = null`;
    }
    await tx`delete from contractor_categories where contractor_id = ${userId}`;
    for (const slug of new Set(data.categories)) await tx`insert into contractor_categories (contractor_id, category_slug) values (${userId}, ${slug})`;
    await audit(tx, { actorId: userId, action: 'contractor.profile_saved', entityType: 'contractor', entityId: userId, metadata: { verification, identityChanged: !!identityChanged, whatsappAlerts: !!alertPhone } });
  });
}

export type FeedFilters = { category?: string; maxKm?: number; withBudget?: boolean; sort?: 'newest' | 'closest'; saved?: boolean };

export type FeedJob = {
  id: string; ref: string; title: string; category_slug: string; category_name: string; region_name: string; postcode4: string;
  timing: string; budget_max_cents: number | null; published_at: Date; distance_km: number; quote_count: number;
  my_quote_status: string | null; saved: boolean; photo_count: number;
};

/** Jobs a contractor may see: published, in one of their categories, inside their service radius. */
export async function contractorFeed(db: Db, contractorId: string, f: FeedFilters = {}): Promise<FeedJob[]> {
  return db<FeedJob[]>`
    select * from (
      select j.id, j.ref, j.title, j.category_slug, c.name_nl as category_name, j.region_name, j.postcode4, j.timing,
             j.budget_max_cents, j.published_at,
             round(km_distance(cp.base_lat, cp.base_lng, j.lat, j.lng)::numeric, 1)::float as distance_km,
             (select count(*)::int from quotes q where q.job_id = j.id and q.status <> 'withdrawn') as quote_count,
             (select q.status::text from quotes q where q.job_id = j.id and q.contractor_id = cp.user_id) as my_quote_status,
             exists (select 1 from saved_jobs s where s.job_id = j.id and s.contractor_id = cp.user_id) as saved,
             (select count(*)::int from job_media m where m.job_id = j.id) as photo_count,
             cp.service_radius_km
      from contractor_profiles cp
      join contractor_categories cc on cc.contractor_id = cp.user_id
      join jobs j on j.category_slug = cc.category_slug and j.status = 'published'
      join categories c on c.slug = j.category_slug
      where cp.user_id = ${contractorId}
    ) feed
    where distance_km <= service_radius_km
      ${f.category ? db`and category_slug = ${f.category}` : db``}
      ${f.maxKm ? db`and distance_km <= ${f.maxKm}` : db``}
      ${f.withBudget ? db`and budget_max_cents is not null` : db``}
      ${f.saved ? db`and saved` : db``}
    order by ${f.sort === 'closest' ? db`distance_km asc` : db`published_at desc`}
    limit 100`;
}
