import { sql, type Db } from './db';
import { env } from './env';
import { shortCode } from './ids';

/** Number of founding-member places. Real scarcity: numbers are handed out on verification, in order. */
export const FOUNDING_LIMIT = Number(process.env.FOUNDING_MEMBER_LIMIT ?? 100);

export const newReferralCode = () => shortCode(8);

/** Assigns the next founding-member number on verification, if places are left. Safe under concurrency. */
export async function assignFoundingNumber(db: Db, contractorId: string): Promise<number | null> {
  const rows = await db<{ founding_member_no: number | null }[]>`
    update contractor_profiles set founding_member_no = (
      select coalesce(max(founding_member_no), 0) + 1 from contractor_profiles
    )
    where user_id = ${contractorId} and founding_member_no is null
      and (select count(*) from contractor_profiles where founding_member_no is not null) < ${FOUNDING_LIMIT}
    returning founding_member_no`;
  return rows[0]?.founding_member_no ?? null;
}

export async function foundingStats(db: Db = sql()) {
  const [r] = await db<{ taken: number }[]>`select count(*)::int as taken from contractor_profiles where founding_member_no is not null`;
  return { taken: r.taken, left: Math.max(0, FOUNDING_LIMIT - r.taken), limit: FOUNDING_LIMIT };
}

/** Records who referred a new account; ignores unknown codes and self-referral. */
export async function recordReferral(db: Db, code: string | null | undefined, newUserId: string) {
  if (!code || !/^[A-Z0-9]{6,12}$/.test(code)) return;
  await db`
    update users set referred_by = cp.user_id
    from contractor_profiles cp
    where users.id = ${newUserId} and cp.referral_code = ${code} and cp.user_id <> ${newUserId} and users.referred_by is null`;
}

export async function referralStats(db: Db, contractorId: string) {
  const [r] = await db<{ signed_up: number; verified: number }[]>`
    select count(*)::int as signed_up,
           count(*) filter (where cp.verification = 'verified')::int as verified
    from users u left join contractor_profiles cp on cp.user_id = u.id
    where u.referred_by = ${contractorId}`;
  return r;
}

export function referralLink(code: string) {
  return `${env().APP_BASE_URL}/voor-vakmensen?ref=${code}`;
}

/** WhatsApp "share" deep link with a ready-made message for colleagues. */
export function whatsappShareLink(code: string) {
  const text =
    `Ken je KlusMatch al? Gratis klussen in je eigen regio, met foto's, postcode en budget erbij. ` +
    `Geen leadkosten. Aanmelden duurt 2 minuten: ${referralLink(code)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Public, non-identifying snapshot of open jobs for marketing pages (no names, no full postcodes). */
export async function openJobsTeaser(db: Db, opts: { category?: string; limit?: number } = {}) {
  return db<{ id: string; title: string; category: string; category_slug: string; region_name: string; postcode4: string; budget_max_cents: number | null; timing: string; published_at: Date; quotes: number }[]>`
    select j.id, j.title, c.name_nl as category, j.category_slug, j.region_name, j.postcode4, j.budget_max_cents, j.timing, j.published_at,
           (select count(*)::int from quotes q where q.job_id = j.id and q.status <> 'withdrawn') as quotes
    from jobs j join categories c on c.slug = j.category_slug
    where j.status = 'published' ${opts.category ? db`and j.category_slug = ${opts.category}` : db``}
    order by j.published_at desc limit ${opts.limit ?? 6}`;
}

export async function platformStats(db: Db = sql()) {
  const [r] = await db<{ open_jobs: number; jobs_30d: number; verified: number; budget_open_cents: number | null }[]>`
    select (select count(*)::int from jobs where status = 'published') as open_jobs,
           (select count(*)::int from jobs where published_at > now() - interval '30 days') as jobs_30d,
           (select count(*)::int from contractor_profiles where verification = 'verified') as verified,
           (select sum(budget_max_cents)::bigint from jobs where status = 'published') as budget_open_cents`;
  return r;
}
