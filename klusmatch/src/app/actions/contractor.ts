'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { ZodError } from 'zod';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { requireRole } from '@/lib/auth/guards';
import { saveContractorProfile } from '@/lib/contractors';
import { submitQuote, withdrawQuote } from '@/lib/quotes';
import { UserFacingError } from '@/lib/errors';
import { RateLimitError } from '@/lib/rate-limit';
import { drainQueue } from '@/lib/worker';
import type { ActionState } from '@/components/forms';

function asState(e: unknown): ActionState {
  if (e instanceof ZodError) return { error: e.issues[0]?.message };
  if (e instanceof UserFacingError || e instanceof RateLimitError) return { error: e.message };
  throw e;
}

export async function saveProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('contractor');
  try {
    await saveContractorProfile(sql(), user.id, {
      companyName: String(form.get('companyName') ?? ''),
      kvkNumber: String(form.get('kvkNumber') ?? '').replace(/\s/g, ''),
      description: String(form.get('description') ?? ''),
      basePostcode: String(form.get('basePostcode') ?? ''),
      serviceRadiusKm: Number(form.get('serviceRadiusKm') ?? 25),
      categories: form.getAll('categories').map(String),
      available: form.get('available') === 'on',
    });
    revalidatePath('/vakman');
    return { ok: 'Profiel opgeslagen.' };
  } catch (e) {
    return asState(e);
  }
}

export async function submitQuoteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('contractor');
  try {
    await submitQuote(user.id, {
      jobId: String(form.get('jobId')),
      amountEur: Number(String(form.get('amountEur') ?? '').replace(',', '.')),
      priceType: String(form.get('priceType')) as 'fixed',
      message: String(form.get('message') ?? ''),
      earliestStart: String(form.get('earliestStart') ?? ''),
    });
    if (env().INLINE_WORKER) after(() => drainQueue().catch(console.error));
    revalidatePath(`/vakman/klussen/${form.get('jobId')}`);
    return { ok: 'Offerte verstuurd! De klant ontvangt direct een melding.' };
  } catch (e) {
    return asState(e);
  }
}

export async function withdrawQuoteAction(form: FormData) {
  const user = await requireRole('contractor');
  await withdrawQuote(user.id, String(form.get('quoteId')));
  revalidatePath('/vakman/offertes');
}

export async function toggleSaveJobAction(form: FormData) {
  const user = await requireRole('contractor');
  const jobId = String(form.get('jobId'));
  const db = sql();
  const removed = await db`delete from saved_jobs where contractor_id = ${user.id} and job_id = ${jobId} returning job_id`;
  if (!removed.length) {
    await db`insert into saved_jobs (contractor_id, job_id)
             select ${user.id}, id from jobs where id = ${jobId} and status = 'published' on conflict do nothing`;
  }
  revalidatePath('/vakman');
  revalidatePath(`/vakman/klussen/${jobId}`);
}
