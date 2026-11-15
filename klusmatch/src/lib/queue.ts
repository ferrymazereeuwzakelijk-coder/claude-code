import type { Db } from './db';
import { sql } from './db';

/**
 * Durable background job queue on Postgres (FOR UPDATE SKIP LOCKED).
 * - Enqueue inside the same transaction as the state change (transactional outbox).
 * - Idempotency keys make re-delivery (e.g. WhatsApp webhook retries) a no-op.
 * - Failed jobs retry with exponential backoff, then land in status 'failed' for the admin dashboard.
 */
export type JobKind = 'job.match' | 'wa.process_inbound' | 'wa.send' | 'notify.quote_submitted' | 'notify.quote_accepted';

export async function enqueue(db: Db, kind: JobKind, payload: Record<string, unknown>, opts: { idempotencyKey?: string; delaySeconds?: number; maxAttempts?: number } = {}) {
  const runAt = new Date(Date.now() + (opts.delaySeconds ?? 0) * 1000);
  await db`
    insert into background_jobs (kind, payload, idempotency_key, run_at, max_attempts)
    values (${kind}, ${db.json(payload as never)}, ${opts.idempotencyKey ?? null}, ${runAt}, ${opts.maxAttempts ?? 5})
    on conflict (idempotency_key) do nothing`;
}

type Handler = (payload: Record<string, unknown>) => Promise<void>;

export async function processBatch(handlers: Partial<Record<JobKind, Handler>>, limit = 10): Promise<number> {
  const db = sql();
  // Reclaim jobs whose worker died mid-run.
  await db`update background_jobs set status = 'pending', locked_at = null
           where status = 'running' and locked_at < now() - interval '5 minutes'`;
  const jobs = await db<{ id: string; kind: JobKind; payload: Record<string, unknown>; attempts: number; max_attempts: number }[]>`
    update background_jobs set status = 'running', locked_at = now(), attempts = attempts + 1
    where id in (
      select id from background_jobs where status = 'pending' and run_at <= now()
      order by run_at limit ${limit} for update skip locked)
    returning id, kind, payload, attempts, max_attempts`;
  for (const job of jobs) {
    const handler = handlers[job.kind];
    try {
      if (!handler) throw new Error(`No handler for ${job.kind}`);
      await handler(job.payload);
      await db`update background_jobs set status = 'done', finished_at = now(), last_error = null where id = ${job.id}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const final = job.attempts >= job.max_attempts;
      const backoff = Math.min(2 ** job.attempts * 5, 3600);
      await db`
        update background_jobs set
          status = ${final ? 'failed' : 'pending'},
          run_at = now() + make_interval(secs => ${backoff}),
          last_error = ${msg.slice(0, 2000)},
          finished_at = ${final ? new Date() : null}
        where id = ${job.id}`;
      console.error(`[queue] ${job.kind}#${job.id} attempt ${job.attempts} failed: ${msg}`);
    }
  }
  return jobs.length;
}
