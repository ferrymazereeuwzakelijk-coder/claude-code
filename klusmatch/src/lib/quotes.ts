import { z } from 'zod';
import { sql, type Db } from './db';
import { audit } from './audit';
import { ForbiddenError, NotFoundError, UserFacingError } from './errors';
import { quoteRef } from './ids';
import { enqueue } from './queue';
import { rateLimit } from './rate-limit';

export const quoteSchema = z.object({
  jobId: z.string().uuid(),
  amountEur: z.coerce.number().positive('Vul een bedrag in').max(500_000),
  priceType: z.enum(['fixed', 'estimate', 'hourly']),
  message: z.string().trim().min(20, 'Licht je offerte toe (minimaal 20 tekens)').max(4000),
  earliestStart: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Ongeldige datum'),
});

/** A contractor may quote when verified, active, in the job's category, and the job is within their service radius. */
export async function contractorEligibility(db: Db, contractorId: string, jobId: string) {
  const [row] = await db<{ status: string; in_category: boolean; in_radius: boolean; verified: boolean; customer_id: string }[]>`
    select j.status, j.customer_id,
      exists (select 1 from contractor_categories cc where cc.contractor_id = cp.user_id and cc.category_slug = j.category_slug) as in_category,
      km_distance(cp.base_lat, cp.base_lng, j.lat, j.lng) <= cp.service_radius_km as in_radius,
      cp.verification = 'verified' as verified
    from jobs j, contractor_profiles cp
    where j.id = ${jobId} and cp.user_id = ${contractorId}`;
  return row ?? null;
}

export async function submitQuote(contractorId: string, input: z.input<typeof quoteSchema>) {
  const data = quoteSchema.parse(input);
  const db = sql();
  await rateLimit(db, `quote:${contractorId}`, 30, 3600);
  return db.begin(async (tx) => {
    const e = await contractorEligibility(tx, contractorId, data.jobId);
    if (!e) throw new NotFoundError('Klus niet gevonden.');
    if (!e.verified) throw new ForbiddenError('Je bedrijf moet eerst geverifieerd zijn voordat je offertes kunt sturen.');
    if (!e.in_category || !e.in_radius) throw new ForbiddenError('Deze klus valt buiten jouw vakgebied of werkgebied.');
    if (e.status !== 'published') throw new UserFacingError('Op deze klus kun je geen offerte meer uitbrengen.');
    if (e.customer_id === contractorId) throw new ForbiddenError();
    const rows = await tx<{ id: string; ref: string }[]>`
      insert into quotes (ref, job_id, contractor_id, amount_cents, price_type, message, earliest_start)
      values (${quoteRef()}, ${data.jobId}, ${contractorId}, ${Math.round(data.amountEur * 100)}, ${data.priceType}, ${data.message}, ${data.earliestStart})
      on conflict (job_id, contractor_id) do nothing
      returning id, ref`;
    if (!rows.length) throw new UserFacingError('Je hebt al een offerte uitgebracht op deze klus.');
    await enqueue(tx, 'notify.quote_submitted', { quoteId: rows[0].id }, { idempotencyKey: `quote_submitted:${rows[0].id}` });
    await audit(tx, { actorId: contractorId, action: 'quote.submitted', entityType: 'quote', entityId: rows[0].id, metadata: { jobId: data.jobId, amountEur: data.amountEur } });
    return rows[0];
  });
}

export async function withdrawQuote(contractorId: string, quoteId: string) {
  const db = sql();
  const rows = await db`update quotes set status = 'withdrawn', updated_at = now()
                        where id = ${quoteId} and contractor_id = ${contractorId} and status = 'submitted' returning id`;
  if (!rows.length) throw new UserFacingError('Deze offerte kan niet meer worden ingetrokken.');
  await audit(db, { actorId: contractorId, action: 'quote.withdrawn', entityType: 'quote', entityId: quoteId });
}

/**
 * Customer accepts a quote. Row-locks the job so two concurrent accepts cannot both win.
 * Other open quotes are declined; private job details become visible to the awarded contractor only.
 */
export async function acceptQuote(customerId: string, quoteId: string, via: 'web' | 'whatsapp' = 'web') {
  return sql().begin(async (tx) => {
    const [q] = await tx<{ id: string; job_id: string; status: string; ref: string }[]>`select id, job_id, status, ref from quotes where id = ${quoteId}`;
    if (!q) throw new NotFoundError('Offerte niet gevonden.');
    const [job] = await tx<{ id: string; customer_id: string; status: string }[]>`select id, customer_id, status from jobs where id = ${q.job_id} for update`;
    if (!job || job.customer_id !== customerId) throw new ForbiddenError();
    if (job.status === 'awarded' && q.status === 'accepted') return { jobId: job.id, alreadyAccepted: true };
    if (job.status !== 'published') throw new UserFacingError('Voor deze klus is al een vakman gekozen of de klus is gesloten.');
    if (q.status !== 'submitted') throw new UserFacingError('Deze offerte is niet meer geldig.');
    await tx`update quotes set status = 'accepted', decided_at = now(), updated_at = now() where id = ${q.id}`;
    await tx`update quotes set status = 'declined', decided_at = now(), updated_at = now() where job_id = ${job.id} and id <> ${q.id} and status = 'submitted'`;
    await tx`update jobs set status = 'awarded', accepted_quote_id = ${q.id} where id = ${job.id}`;
    await enqueue(tx, 'notify.quote_accepted', { quoteId: q.id }, { idempotencyKey: `quote_accepted:${q.id}` });
    await audit(tx, { actorId: customerId, action: 'quote.accepted', entityType: 'quote', entityId: q.id, metadata: { jobId: job.id, via } });
    return { jobId: job.id, alreadyAccepted: false };
  });
}

export type QuoteView = {
  id: string; ref: string; amount_cents: number; price_type: 'fixed' | 'estimate' | 'hourly'; message: string; earliest_start: Date | null;
  status: string; created_at: Date; contractor_id: string; company_name: string; verification: string; distance_km: number;
  categories: string[];
};

export async function quotesForJob(db: Db, jobId: string): Promise<QuoteView[]> {
  return db<QuoteView[]>`
    select q.id, q.ref, q.amount_cents, q.price_type, q.message, q.earliest_start, q.status, q.created_at,
           cp.user_id as contractor_id, cp.company_name, cp.verification,
           round(km_distance(cp.base_lat, cp.base_lng, j.lat, j.lng)::numeric, 0)::float as distance_km,
           array(select c.name_nl from contractor_categories cc join categories c on c.slug = cc.category_slug where cc.contractor_id = cp.user_id) as categories
    from quotes q
    join contractor_profiles cp on cp.user_id = q.contractor_id
    join jobs j on j.id = q.job_id
    where q.job_id = ${jobId} and q.status <> 'withdrawn'
    order by (q.status = 'accepted') desc, q.amount_cents asc`;
}

export const PRICE_TYPE_LABEL = { fixed: 'Vaste prijs', estimate: 'Schatting', hourly: 'Uurtarief' } as const;
