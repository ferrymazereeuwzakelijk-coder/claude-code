import type { Db } from '../db';
import { notify } from '../notifications';
import { audit } from '../audit';
import { env } from '../env';
import { formatEuro } from '../intake/fields';
import { queueWhatsApp } from '../whatsapp/outbound';

export type MatchingRules = { max_contractors_per_job: number; max_new_job_notifications_per_day: number; require_verified: boolean };

export async function getMatchingRules(db: Db): Promise<MatchingRules> {
  const [r] = await db<MatchingRules[]>`select max_contractors_per_job, max_new_job_notifications_per_day, require_verified from matching_rules`;
  if (r) return r;
  // Self-heal: the singleton row must always exist (safe defaults: verified contractors only).
  const [d] = await db<MatchingRules[]>`
    insert into matching_rules default values on conflict (id) do update set id = true
    returning max_contractors_per_job, max_new_job_notifications_per_day, require_verified`;
  return d;
}

/**
 * Matches a published job to contractors on category, service area (distance ≤ the contractor's radius),
 * availability and verification. Closest contractors first, capped per job; each contractor is capped
 * per day so nobody is spammed. Idempotent: re-running never double-notifies.
 */
export async function matchJob(db: Db, jobId: string) {
  const rules = await getMatchingRules(db);
  const [job] = await db<{ id: string; ref: string; title: string; category_slug: string; lat: number; lng: number; customer_id: string; status: string; region_name: string }[]>`
    select id, ref, title, category_slug, lat, lng, customer_id, status, region_name from jobs where id = ${jobId}`;
  if (!job || job.status !== 'published') return { matched: 0, notified: 0 };

  const candidates = await db<{ user_id: string; distance_km: number; service_radius_km: number; verified: boolean }[]>`
    select cp.user_id, km_distance(cp.base_lat, cp.base_lng, ${job.lat}, ${job.lng}) as distance_km,
           cp.service_radius_km, cp.verification = 'verified' as verified
    from contractor_profiles cp
    join contractor_categories cc on cc.contractor_id = cp.user_id and cc.category_slug = ${job.category_slug}
    join users u on u.id = cp.user_id and u.status = 'active'
    where cp.available
      and cp.user_id <> ${job.customer_id}
      and (${!rules.require_verified} or cp.verification = 'verified')
      and km_distance(cp.base_lat, cp.base_lng, ${job.lat}, ${job.lng}) <= cp.service_radius_km
    order by distance_km asc
    limit ${rules.max_contractors_per_job}`;

  let notified = 0;
  for (const c of candidates) {
    const score = Math.max(0, 1 - c.distance_km / c.service_radius_km) * 0.8 + (c.verified ? 0.2 : 0);
    const [{ n: sentToday }] = await db<{ n: number }[]>`
      select count(*)::int as n from notifications
      where user_id = ${c.user_id} and kind = 'new_job' and created_at > now() - interval '24 hours'`;
    const capped = sentToday >= rules.max_new_job_notifications_per_day;
    const inserted = await db`
      insert into job_matches (job_id, contractor_id, distance_km, score, notified, suppressed_reason)
      values (${job.id}, ${c.user_id}, ${Math.round(c.distance_km * 10) / 10}, ${score}, ${!capped}, ${capped ? 'daily_cap' : null})
      on conflict (job_id, contractor_id) do nothing returning job_id`;
    if (inserted.length && !capped) {
      await notify(db, c.user_id, {
        kind: 'new_job',
        title: 'Nieuwe klus in jouw regio',
        body: `${job.title} (${Math.round(c.distance_km)} km)`,
        link: `/vakman/klussen/${job.id}`,
        dedupeKey: `new_job:${job.id}:${c.user_id}`,
      });
      await whatsappAlert(db, c.user_id, job, Math.round(c.distance_km));
      notified++;
    }
  }
  await audit(db, { action: 'job.matched', entityType: 'job', entityId: job.id, metadata: { candidates: candidates.length, notified } });
  return { matched: candidates.length, notified };
}

/** Sends a WhatsApp alert to contractors who opted in on their profile (template outside the 24h window). */
async function whatsappAlert(db: Db, contractorId: string, job: { id: string; title: string; region_name: string; budget_max_cents?: number | null }, km: number) {
  const [c] = await db<{ id: string }[]>`
    select w.id from wa_contacts w join contractor_profiles cp on cp.user_id = w.user_id
    where w.user_id = ${contractorId} and cp.whatsapp_alerts and w.consent = 'granted' and not w.simulated limit 1`;
  if (!c) return;
  const [j] = await db<{ category: string; budget_max_cents: number | null }[]>`
    select cat.name_nl as category, j.budget_max_cents from jobs j join categories cat on cat.slug = j.category_slug where j.id = ${job.id}`;
  const link = `${env().APP_BASE_URL}/vakman/klussen/${job.id}`;
  const budget = j?.budget_max_cents ? `budget tot ${formatEuro(j.budget_max_cents / 100)}` : 'budget in overleg';
  await queueWhatsApp(db, c.id, {
    text: `🔨 Nieuwe klus op ${km} km: *${job.title}*\n${j?.category ?? ''} · ${job.region_name} · ${budget}\n\nBekijk de foto's en stuur een offerte: ${link}\n\nStuur STOP om deze meldingen uit te zetten.`,
    template: { name: 'klusmatch_new_job', params: [j?.category ?? 'klus', job.region_name, budget, link] },
  });
}
