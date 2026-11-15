import { z } from 'zod';
import { sql } from './db';
import { audit } from './audit';
import { ForbiddenError, NotFoundError, UserFacingError } from './errors';
import { notify } from './notifications';
import { rateLimit } from './rate-limit';
import { recordJobEvent } from './jobs/lifecycle';
import type { SessionUser } from './auth/session';

export const REPORT_REASONS = {
  spam: 'Spam of reclame',
  fraud: 'Oplichting of fraude',
  inappropriate: 'Ongepaste inhoud',
  unsafe: 'Onveilige situatie',
  no_show: 'Niet komen opdagen',
  quality: 'Kwaliteit van het werk',
  payment: 'Betaling of prijs',
  other: 'Anders',
} as const;

const schema = z.object({
  kind: z.enum(['report', 'dispute']),
  targetType: z.enum(['job', 'quote', 'review', 'user', 'message']),
  targetId: z.string().min(1).max(100),
  reason: z.enum(Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS, ...(keyof typeof REPORT_REASONS)[]]),
  body: z.string().trim().min(10, 'Beschrijf wat er aan de hand is (minimaal 10 tekens)').max(4000),
});

/**
 * Reports (anyone involved can flag content) and disputes (only the two parties of an awarded job).
 * The reporter must be related to the target, so random users cannot flood moderation.
 */
export async function createReport(user: SessionUser, input: z.input<typeof schema>) {
  const data = schema.parse(input);
  const db = sql();
  await rateLimit(db, `report:${user.id}`, 10, 86400);

  let jobId: string | null = null;
  if (data.targetType === 'job') jobId = data.targetId;
  else if (data.targetType === 'quote' || data.targetType === 'review') {
    const table = data.targetType === 'quote' ? db`quotes` : db`reviews`;
    const [r] = await db<{ job_id: string }[]>`select job_id from ${table} where id = ${data.targetId}`;
    if (!r) throw new NotFoundError();
    jobId = r.job_id;
  }
  if (!jobId && data.targetType !== 'user') throw new NotFoundError();

  const [rel] = jobId
    ? await db<{ customer_id: string; status: string; awarded_contractor: string | null; quoted: boolean }[]>`
        select j.customer_id, j.status, q.contractor_id as awarded_contractor,
               exists (select 1 from quotes x where x.job_id = j.id and x.contractor_id = ${user.id}) as quoted
        from jobs j left join quotes q on q.id = j.accepted_quote_id where j.id = ${jobId}`
    : [];
  if (jobId && !rel) throw new NotFoundError();

  if (data.kind === 'dispute') {
    const party = rel && (rel.customer_id === user.id || rel.awarded_contractor === user.id);
    if (!party || !['awarded', 'completed'].includes(rel.status)) throw new ForbiddenError('Een geschil kan alleen worden gemeld door de klant of de gekozen vakman van een gegunde klus.');
  } else if (rel) {
    const involved = rel.customer_id === user.id || rel.quoted || (user.role === 'contractor' && rel.status === 'published');
    if (!involved) throw new ForbiddenError();
  }

  const rows = await db<{ id: string }[]>`
    insert into reports (kind, reporter_id, target_type, target_id, job_id, reason, body)
    values (${data.kind}, ${user.id}, ${data.targetType}, ${data.targetId}, ${jobId}, ${data.reason}, ${data.body})
    on conflict do nothing returning id`;
  if (!rows.length) throw new UserFacingError('Je hebt dit al gemeld. We behandelen je melding zo snel mogelijk.');

  if (data.kind === 'dispute' && jobId && rel) {
    await recordJobEvent(db, jobId, 'disputed', user.id, { reason: data.reason });
    const other = user.id === rel.customer_id ? rel.awarded_contractor : rel.customer_id;
    if (other) {
      await notify(db, other, {
        kind: 'dispute_opened',
        title: 'Er is een geschil gemeld',
        body: 'KlusMatch bemiddelt en neemt contact met beide partijen op.',
        link: user.id === rel.customer_id ? `/vakman/klussen/${jobId}` : `/klant/klussen/${jobId}`,
        dedupeKey: `dispute:${rows[0].id}`,
      });
    }
  }
  await audit(db, { actorId: user.id, action: `${data.kind}.created`, entityType: data.targetType, entityId: data.targetId, metadata: { reason: data.reason, reportId: rows[0].id } });
  return rows[0];
}

export async function resolveReport(adminId: string, reportId: string, input: { status: 'in_progress' | 'resolved' | 'dismissed'; note?: string; hideTarget?: boolean }) {
  const note = (input.note ?? '').trim().slice(0, 1000) || null;
  return sql().begin(async (tx) => {
    const [r] = await tx<{ reporter_id: string; target_type: string; target_id: string; kind: string; status: string }[]>`
      update reports set status = ${input.status}, resolution_note = coalesce(${note}, resolution_note), handled_by = ${adminId}, handled_at = now()
      where id = ${reportId} returning reporter_id, target_type, target_id, kind, status`;
    if (!r) throw new NotFoundError();
    // Moderation actions on the reported content.
    if (input.hideTarget) {
      if (r.target_type === 'review') await tx`update reviews set hidden = true where id = ${r.target_id}`;
      if (r.target_type === 'job') await tx`update jobs set status = 'removed' where id = ${r.target_id} and status in ('published', 'under_review')`;
    }
    if (input.status !== 'in_progress') {
      await notify(tx, r.reporter_id, {
        kind: 'report_handled',
        title: r.kind === 'dispute' ? 'Je geschil is behandeld' : 'Je melding is behandeld',
        body: note ?? (input.status === 'resolved' ? 'We hebben actie ondernomen. Bedankt voor je melding.' : 'We hebben je melding bekeken en geen overtreding gevonden.'),
        dedupeKey: `report_handled:${reportId}:${input.status}`,
      });
    }
    await audit(tx, { actorId: adminId, action: `report.${input.status}`, entityType: 'report', entityId: reportId, metadata: { hideTarget: !!input.hideTarget } });
  });
}
