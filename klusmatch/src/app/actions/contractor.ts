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
      whatsappAlerts: form.get('whatsappAlerts') === 'on',
      whatsappNumber: String(form.get('whatsappNumber') ?? ''),
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

import { replyToReview } from '@/lib/reviews';
import { addPortfolioItem, removePortfolioItem } from '@/lib/portfolio';
import { createCheckoutSession, type PlanKey } from '@/lib/billing';
import { redirect } from 'next/navigation';

export async function replyReviewAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('contractor');
  try {
    await replyToReview(user.id, String(form.get('reviewId')), String(form.get('reply') ?? ''));
    revalidatePath(`/vakman/klussen/${form.get('jobId')}`);
    return { ok: 'Reactie geplaatst.' };
  } catch (e) {
    return asState(e);
  }
}

export async function addPortfolioAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('contractor');
  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) return { error: 'Kies een foto.' };
  try {
    await addPortfolioItem(user.id, Buffer.from(await file.arrayBuffer()), { caption: String(form.get('caption') ?? ''), categorySlug: String(form.get('category') ?? '') || null });
    revalidatePath('/vakman/profiel');
    return { ok: 'Foto toegevoegd aan je portfolio.' };
  } catch (e) {
    return asState(e);
  }
}

export async function removePortfolioAction(form: FormData) {
  const user = await requireRole('contractor');
  await removePortfolioItem(user.id, String(form.get('itemId')));
  revalidatePath('/vakman/profiel');
}

export async function checkoutAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('contractor');
  const plan = form.get('plan') === 'pro' ? 'pro' : ('starter' as PlanKey);
  let url: string;
  try {
    url = await createCheckoutSession(user.id, user.email, plan);
  } catch (e) {
    return asState(e);
  }
  redirect(url);
}
