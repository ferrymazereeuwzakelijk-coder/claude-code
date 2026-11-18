'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { requireRole } from '@/lib/auth/guards';
import { audit } from '@/lib/audit';
import { enqueue } from '@/lib/queue';
import { notify } from '@/lib/notifications';
import { drainQueue } from '@/lib/worker';
import { recordJobEvent } from '@/lib/jobs/lifecycle';
import { assignFoundingNumber } from '@/lib/growth';
import type { ActionState } from '@/components/forms';

const kick = () => env().INLINE_WORKER && after(() => drainQueue().catch(console.error));

export async function verifyContractorAction(form: FormData) {
  const admin = await requireRole('admin');
  const id = String(form.get('contractorId'));
  const decision = form.get('decision') === 'verify' ? 'verified' : 'rejected';
  const note = String(form.get('note') ?? '').slice(0, 500) || null;
  const db = sql();
  await db`update contractor_profiles set verification = ${decision}, verification_note = ${note},
           verified_at = ${decision === 'verified' ? new Date() : null}, verified_by = ${admin.id}, updated_at = now()
           where user_id = ${id}`;
  const founding = decision === 'verified' ? await assignFoundingNumber(db, id) : null;
  await notify(db, id, {
    kind: 'verification',
    title: decision === 'verified' ? (founding ? `Geverifieerd ✓ — je bent Founding Member #${founding}` : 'Je bedrijf is geverifieerd ✓') : 'Verificatie afgewezen',
    body: decision === 'verified' ? 'Je kunt nu offertes versturen en ontvangt meldingen van nieuwe klussen.' : note ?? 'Controleer je bedrijfsgegevens.',
    link: decision === 'verified' ? '/vakman' : '/vakman/profiel',
  });
  await audit(db, { actorId: admin.id, action: `contractor.${decision}`, entityType: 'contractor', entityId: id, metadata: { note } });
  revalidatePath('/admin/vakmensen');
}

export async function moderateJobAction(form: FormData) {
  const admin = await requireRole('admin');
  const id = String(form.get('jobId'));
  const decision = String(form.get('decision'));
  const reason = String(form.get('reason') ?? '').slice(0, 500) || null;
  const db = sql();
  await db.begin(async (tx) => {
    if (decision === 'approve') {
      const rows = await tx`update jobs set status = 'published', published_at = now() where id = ${id} and status = 'under_review' returning id`;
      if (rows.length) {
        await recordJobEvent(tx, id, 'approved', admin.id);
        await enqueue(tx, 'job.match', { jobId: id }, { idempotencyKey: `match:${id}` });
      }
    } else if (decision === 'remove') {
      const removed = await tx`update jobs set status = 'removed' where id = ${id} and status in ('published', 'under_review') returning id`;
      if (removed.length) await recordJobEvent(tx, id, 'removed', admin.id, { reason });
      await tx`update quotes set status = 'declined', decided_at = now() where job_id = ${id} and status = 'submitted'`;
    }
    await audit(tx, { actorId: admin.id, action: `job.moderation.${decision}`, entityType: 'job', entityId: id, metadata: { reason } });
  });
  kick();
  revalidatePath('/admin/klussen');
}

export async function resolveEscalationAction(form: FormData) {
  const admin = await requireRole('admin');
  const id = String(form.get('intakeId'));
  await sql()`update intake_sessions set state = 'cancelled', updated_at = now() where id = ${id} and state = 'escalated'`;
  await audit(sql(), { actorId: admin.id, action: 'intake.escalation_resolved', entityType: 'intake', entityId: id });
  revalidatePath('/admin');
}

const rulesSchema = z.object({
  maxContractors: z.coerce.number().int().min(1).max(100),
  maxPerDay: z.coerce.number().int().min(1).max(200),
  requireVerified: z.boolean(),
});

export async function updateMatchingRulesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireRole('admin');
  const parsed = rulesSchema.safeParse({ maxContractors: form.get('maxContractors'), maxPerDay: form.get('maxPerDay'), requireVerified: form.get('requireVerified') === 'on' });
  if (!parsed.success) return { error: 'Ongeldige waarden.' };
  const r = parsed.data;
  await sql()`update matching_rules set max_contractors_per_job = ${r.maxContractors}, max_new_job_notifications_per_day = ${r.maxPerDay},
              require_verified = ${r.requireVerified}, updated_at = now(), updated_by = ${admin.id}`;
  await audit(sql(), { actorId: admin.id, action: 'matching_rules.updated', entityType: 'settings', metadata: r });
  revalidatePath('/admin/systeem');
  return { ok: 'Matchingregels opgeslagen.' };
}

export async function toggleCategoryAction(form: FormData) {
  const admin = await requireRole('admin');
  const slug = String(form.get('slug'));
  await sql()`update categories set active = not active where slug = ${slug}`;
  await audit(sql(), { actorId: admin.id, action: 'category.toggled', entityType: 'category', entityId: slug });
  revalidatePath('/admin/systeem');
}

export async function retryJobAction(form: FormData) {
  const admin = await requireRole('admin');
  const id = String(form.get('id'));
  await sql()`update background_jobs set status = 'pending', attempts = 0, run_at = now(), last_error = null where id = ${id} and status = 'failed'`;
  await audit(sql(), { actorId: admin.id, action: 'background_job.retried', entityType: 'background_job', entityId: id });
  kick();
  revalidatePath('/admin/systeem');
}

export async function setUserStatusAction(form: FormData) {
  const admin = await requireRole('admin');
  const id = String(form.get('userId'));
  if (id === admin.id) return;
  const status = form.get('status') === 'suspended' ? 'suspended' : 'active';
  await sql()`update users set status = ${status} where id = ${id} and role <> 'admin'`;
  if (status === 'suspended') await sql()`delete from sessions where user_id = ${id}`;
  await audit(sql(), { actorId: admin.id, action: `user.${status}`, entityType: 'user', entityId: id });
  revalidatePath('/admin');
}

import { resolveReport } from '@/lib/reports';

export async function resolveReportAction(form: FormData) {
  const admin = await requireRole('admin');
  const status = String(form.get('status'));
  if (!['in_progress', 'resolved', 'dismissed'].includes(status)) return;
  await resolveReport(admin.id, String(form.get('reportId')), {
    status: status as 'resolved',
    note: String(form.get('note') ?? ''),
    hideTarget: form.get('hideTarget') === 'on',
  });
  revalidatePath('/admin/meldingen');
}
