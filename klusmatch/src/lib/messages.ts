import { z } from 'zod';
import type { Db } from './db';
import { ForbiddenError } from './errors';
import { notify } from './notifications';
import { rateLimit } from './rate-limit';
import { audit } from './audit';
import type { SessionUser } from './auth/session';

/** A thread exists per (job, contractor). Only the job owner and a contractor who quoted may participate. */
async function threadParties(db: Db, jobId: string, contractorId: string) {
  const [r] = await db<{ customer_id: string; title: string; has_quote: boolean }[]>`
    select j.customer_id, j.title, exists (select 1 from quotes q where q.job_id = j.id and q.contractor_id = ${contractorId}) as has_quote
    from jobs j where j.id = ${jobId}`;
  return r ?? null;
}

export async function assertThreadAccess(db: Db, user: SessionUser, jobId: string, contractorId: string) {
  const p = await threadParties(db, jobId, contractorId);
  if (!p || !p.has_quote) throw new ForbiddenError();
  if (user.role === 'admin') return p;
  if (user.role === 'customer' && p.customer_id === user.id) return p;
  if (user.role === 'contractor' && user.id === contractorId) return p;
  throw new ForbiddenError();
}

export async function listThread(db: Db, user: SessionUser, jobId: string, contractorId: string) {
  await assertThreadAccess(db, user, jobId, contractorId);
  return db<{ id: string; sender_id: string; body: string; created_at: Date; sender_name: string }[]>`
    select m.id, m.sender_id, m.body, m.created_at, u.full_name as sender_name
    from job_messages m join users u on u.id = m.sender_id
    where m.job_id = ${jobId} and m.contractor_id = ${contractorId} order by m.id`;
}

const bodySchema = z.string().trim().min(1, 'Bericht is leeg').max(4000);

export async function postMessage(db: Db, user: SessionUser, jobId: string, contractorId: string, body: string) {
  const text = bodySchema.parse(body);
  const p = await assertThreadAccess(db, user, jobId, contractorId);
  if (user.role === 'admin') throw new ForbiddenError('Beheerders kunnen meelezen maar niet meeschrijven.');
  await rateLimit(db, `msg:${user.id}`, 60, 3600);
  await db`insert into job_messages (job_id, contractor_id, sender_id, body) values (${jobId}, ${contractorId}, ${user.id}, ${text})`;
  await audit(db, { actorId: user.id, action: 'message.sent', entityType: 'job', entityId: jobId });
  const recipient = user.role === 'customer' ? contractorId : p.customer_id;
  await notify(db, recipient, {
    kind: 'message',
    title: `Nieuw bericht over "${p.title}"`,
    body: text.slice(0, 140),
    link: user.role === 'customer' ? `/vakman/klussen/${jobId}` : `/klant/klussen/${jobId}?thread=${contractorId}`,
  });
}
