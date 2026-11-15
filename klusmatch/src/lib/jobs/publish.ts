import type { Db } from '../db';
import { audit } from '../audit';
import { UserFacingError } from '../errors';
import { parsePostcode } from '../geo';
import { jobRef } from '../ids';
import { enqueue } from '../queue';
import { TIMING_LABELS } from '../intake/fields';
import type { IntakeFacts, JobDraft } from '../intake/types';

type IntakeRow = { id: string; facts: IntakeFacts; draft: JobDraft | null; state: string; wa_contact_id: string | null };

/**
 * Publishes a confirmed intake as a job. Must run inside a transaction that holds a row lock on the intake.
 * Only public, non-identifying data goes on the job; full postcode and contact details go to job_private_details.
 */
export async function publishIntake(tx: Db, intake: IntakeRow, customerId: string) {
  if (intake.state !== 'awaiting_confirmation' || !intake.draft) {
    throw new UserFacingError('Deze aanvraag kan nu niet worden gepubliceerd.');
  }
  const f = intake.facts;
  if (!f.category || !f.problem || !f.postcode || !f.scope || !f.timing || f.budget === undefined) {
    throw new UserFacingError('Er ontbreekt nog informatie in je aanvraag.');
  }
  const pc = parsePostcode(f.postcode.value);
  if (!pc) throw new UserFacingError('De postcode is ongeldig.');

  const [cat] = await tx<{ risk: string }[]>`select risk from categories where slug = ${f.category.value} and active`;
  if (!cat) throw new UserFacingError('Deze categorie is niet beschikbaar.');
  // Specialist work (e.g. asbestos) is held for manual review before contractors see it.
  const status = cat.risk === 'specialist' ? 'under_review' : 'published';

  const [contact] = intake.wa_contact_id
    ? await tx<{ phone_e164: string }[]>`select phone_e164 from wa_contacts where id = ${intake.wa_contact_id}`
    : [];
  const [customer] = await tx<{ full_name: string; phone_e164: string | null }[]>`select full_name, phone_e164 from users where id = ${customerId}`;

  const [job] = await tx<{ id: string; ref: string }[]>`
    insert into jobs (ref, customer_id, intake_id, category_slug, title, description, postcode4, region_name, lat, lng,
                      timing, budget_max_cents, facts, ai_assumptions, status)
    values (${jobRef()}, ${customerId}, ${intake.id}, ${f.category.value}, ${intake.draft.title}, ${intake.draft.description},
            ${pc.postcode4}, ${pc.region}, ${pc.lat}, ${pc.lng}, ${TIMING_LABELS[f.timing.value]},
            ${f.budget.value ? Math.round(f.budget.value * 100) : null}, ${tx.json(f as never)},
            ${tx.json(intake.draft.assumptions as never)}, ${status})
    returning id, ref`;

  await tx`insert into job_private_details (job_id, postcode_full, contact_phone, contact_name)
           values (${job.id}, ${pc.postcodeFull}, ${contact?.phone_e164 ?? customer?.phone_e164 ?? null}, ${customer?.full_name ?? null})`;

  await tx`insert into job_media (job_id, media_id)
           select distinct ${job.id}::uuid, unnest(media_ids) from intake_messages where intake_id = ${intake.id}
           on conflict do nothing`;

  await tx`update intake_sessions set state = 'published', job_id = ${job.id}, customer_id = ${customerId}, updated_at = now() where id = ${intake.id}`;
  if (status === 'published') await enqueue(tx, 'job.match', { jobId: job.id }, { idempotencyKey: `match:${job.id}` });
  await audit(tx, { actorId: customerId, action: 'job.published', entityType: 'job', entityId: job.id, metadata: { ref: job.ref, status, intakeId: intake.id } });
  return { jobId: job.id, ref: job.ref, status };
}
