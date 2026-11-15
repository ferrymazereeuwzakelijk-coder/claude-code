import { z } from 'zod';
import { sql, type Db } from './db';
import { audit } from './audit';
import { ForbiddenError, NotFoundError, UserFacingError } from './errors';
import { notify } from './notifications';
import { recordJobEvent } from './jobs/lifecycle';

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Kies een score van 1 tot 5').max(5),
  body: z.string().trim().min(10, 'Schrijf minimaal 10 tekens').max(2000),
});

/**
 * Only the customer of a completed job can review, only the awarded contractor, and only once.
 * This keeps reviews tied to real, finished work.
 */
export async function createReview(customerId: string, jobId: string, input: z.input<typeof reviewSchema>) {
  const data = reviewSchema.parse(input);
  return sql().begin(async (tx) => {
    const [job] = await tx<{ customer_id: string; status: string; title: string; contractor_id: string | null }[]>`
      select j.customer_id, j.status, j.title, q.contractor_id
      from jobs j left join quotes q on q.id = j.accepted_quote_id where j.id = ${jobId}`;
    if (!job) throw new NotFoundError();
    if (job.customer_id !== customerId) throw new ForbiddenError();
    if (job.status !== 'completed' || !job.contractor_id) throw new UserFacingError('Je kunt een review schrijven zodra de klus is afgerond.');
    const rows = await tx<{ id: string }[]>`
      insert into reviews (job_id, contractor_id, customer_id, rating, body)
      values (${jobId}, ${job.contractor_id}, ${customerId}, ${data.rating}, ${data.body})
      on conflict (job_id) do nothing returning id`;
    if (!rows.length) throw new UserFacingError('Je hebt deze klus al beoordeeld.');
    await notify(tx, job.contractor_id, {
      kind: 'review_received',
      title: `Nieuwe review: ${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)}`,
      body: `Voor "${job.title}". Je kunt één keer reageren.`,
      link: `/vakman/klussen/${jobId}`,
      dedupeKey: `review:${rows[0].id}`,
    });
    await recordJobEvent(tx, jobId, 'reviewed', customerId, { rating: data.rating });
    await audit(tx, { actorId: customerId, action: 'review.created', entityType: 'review', entityId: rows[0].id, metadata: { rating: data.rating } });
    return rows[0];
  });
}

export async function replyToReview(contractorId: string, reviewId: string, text: string) {
  const reply = z.string().trim().min(2, 'Reactie is te kort').max(1000).parse(text);
  const db = sql();
  const rows = await db`update reviews set contractor_reply = ${reply}, replied_at = now()
                        where id = ${reviewId} and contractor_id = ${contractorId} and contractor_reply is null returning id`;
  if (!rows.length) throw new UserFacingError('Je kunt maar één keer op een review reageren.');
  await audit(db, { actorId: contractorId, action: 'review.replied', entityType: 'review', entityId: reviewId });
}

export type RatingSummary = { avg: number | null; count: number };

export async function ratingsFor(db: Db, contractorIds: string[]): Promise<Map<string, RatingSummary>> {
  if (!contractorIds.length) return new Map();
  const rows = await db<{ contractor_id: string; avg: number; count: number }[]>`
    select contractor_id, round(avg(rating)::numeric, 1)::float as avg, count(*)::int as count
    from reviews where contractor_id = any(${contractorIds}::uuid[]) and not hidden group by contractor_id`;
  return new Map(rows.map((r) => [r.contractor_id, { avg: r.avg, count: r.count }]));
}

export async function reviewsForContractor(db: Db, contractorId: string, limit = 20) {
  return db<{ id: string; rating: number; body: string; contractor_reply: string | null; created_at: Date; customer_first_name: string; job_title: string; category: string }[]>`
    select r.id, r.rating, r.body, r.contractor_reply, r.created_at,
           split_part(u.full_name, ' ', 1) as customer_first_name, j.title as job_title, c.name_nl as category
    from reviews r join users u on u.id = r.customer_id join jobs j on j.id = r.job_id join categories c on c.slug = j.category_slug
    where r.contractor_id = ${contractorId} and not r.hidden order by r.created_at desc limit ${limit}`;
}
