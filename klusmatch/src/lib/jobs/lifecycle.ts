import { z } from 'zod';
import { sql, type Db } from '../db';
import { audit } from '../audit';
import { ForbiddenError, NotFoundError, UserFacingError } from '../errors';
import { notify } from '../notifications';

export type JobEventKind = 'published' | 'quote_received' | 'awarded' | 'completed' | 'cancelled' | 'removed' | 'disputed' | 'reviewed' | 'approved';

export async function recordJobEvent(db: Db, jobId: string, kind: JobEventKind, actorId: string | null = null, metadata: Record<string, unknown> = {}) {
  await db`insert into job_events (job_id, kind, actor_user_id, metadata) values (${jobId}, ${kind}, ${actorId}, ${db.json(metadata as never)})`;
}

export async function jobTimeline(db: Db, jobId: string) {
  return db<{ id: string; kind: JobEventKind; metadata: Record<string, unknown>; created_at: Date }[]>`
    select id, kind, metadata, created_at from job_events where job_id = ${jobId} order by id`;
}

const cancelSchema = z.object({ reason: z.string().trim().max(500).default('') });

/** Customer withdraws a job that has not been awarded yet. Open quotes are declined and their contractors told. */
export async function cancelJob(customerId: string, jobId: string, input: { reason?: string } = {}) {
  const { reason } = cancelSchema.parse(input);
  return sql().begin(async (tx) => {
    const [job] = await tx<{ customer_id: string; status: string; title: string }[]>`select customer_id, status, title from jobs where id = ${jobId} for update`;
    if (!job) throw new NotFoundError();
    if (job.customer_id !== customerId) throw new ForbiddenError();
    if (!['published', 'under_review'].includes(job.status)) {
      throw new UserFacingError(job.status === 'awarded' ? 'Je hebt al een vakman gekozen. Neem contact op met de vakman of open een geschil.' : 'Deze klus kan niet meer worden geannuleerd.');
    }
    await tx`update jobs set status = 'cancelled', cancelled_at = now(), cancel_reason = ${reason || null} where id = ${jobId}`;
    const declined = await tx<{ contractor_id: string; id: string }[]>`
      update quotes set status = 'declined', decided_at = now(), updated_at = now()
      where job_id = ${jobId} and status = 'submitted' returning contractor_id, id`;
    for (const q of declined) {
      await notify(tx, q.contractor_id, {
        kind: 'job_cancelled',
        title: 'Klus geannuleerd door de klant',
        body: `"${job.title}" is ingetrokken. Je offerte is vervallen.`,
        link: '/vakman/offertes',
        dedupeKey: `job_cancelled:${jobId}:${q.id}`,
      });
    }
    await recordJobEvent(tx, jobId, 'cancelled', customerId, { reason: reason || null });
    await audit(tx, { actorId: customerId, action: 'job.cancelled', entityType: 'job', entityId: jobId, metadata: { reason } });
  });
}

/** Customer confirms the work is done. Unlocks the review. */
export async function completeJob(customerId: string, jobId: string) {
  return sql().begin(async (tx) => {
    const [job] = await tx<{ customer_id: string; status: string; title: string; contractor_id: string | null }[]>`
      select j.customer_id, j.status, j.title, q.contractor_id
      from jobs j left join quotes q on q.id = j.accepted_quote_id where j.id = ${jobId} for update of j`;
    if (!job) throw new NotFoundError();
    if (job.customer_id !== customerId) throw new ForbiddenError();
    if (job.status === 'completed') return;
    if (job.status !== 'awarded') throw new UserFacingError('Alleen een gegunde klus kan als afgerond worden gemarkeerd.');
    await tx`update jobs set status = 'completed', completed_at = now() where id = ${jobId}`;
    if (job.contractor_id) {
      await notify(tx, job.contractor_id, {
        kind: 'job_completed',
        title: 'Klus afgerond ✓',
        body: `De klant heeft "${job.title}" als afgerond gemarkeerd.`,
        link: `/vakman/klussen/${jobId}`,
        dedupeKey: `job_completed:${jobId}`,
      });
    }
    await recordJobEvent(tx, jobId, 'completed', customerId);
    await audit(tx, { actorId: customerId, action: 'job.completed', entityType: 'job', entityId: jobId });
  });
}

export const EVENT_LABEL: Record<JobEventKind, string> = {
  published: 'Klus geplaatst',
  approved: 'Goedgekeurd door KlusMatch',
  quote_received: 'Offerte ontvangen',
  awarded: 'Vakman gekozen',
  completed: 'Klus afgerond',
  cancelled: 'Klus geannuleerd',
  removed: 'Verwijderd door KlusMatch',
  disputed: 'Geschil gemeld',
  reviewed: 'Review geplaatst',
};
