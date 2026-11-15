'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { sql } from '@/lib/db';
import { requireRole } from '@/lib/auth/guards';
import { acceptQuote } from '@/lib/quotes';
import { createLinkCode } from '@/lib/whatsapp/contacts';
import { postMessage } from '@/lib/messages';
import { UserFacingError } from '@/lib/errors';
import { RateLimitError } from '@/lib/rate-limit';
import { drainQueue } from '@/lib/worker';
import { env } from '@/lib/env';
import { after } from 'next/server';
import type { ActionState } from '@/components/forms';

function asState(e: unknown): ActionState {
  if (e instanceof ZodError) return { error: e.issues[0]?.message };
  if (e instanceof UserFacingError || e instanceof RateLimitError) return { error: e.message };
  throw e;
}

function kick() {
  if (env().INLINE_WORKER) after(() => drainQueue().catch((err) => console.error(err)));
}

export async function acceptQuoteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('customer');
  try {
    const res = await acceptQuote(user.id, String(form.get('quoteId')));
    kick();
    revalidatePath(`/klant/klussen/${res.jobId}`);
    return { ok: 'Offerte geaccepteerd. De vakman ontvangt je contactgegevens.' };
  } catch (e) {
    return asState(e);
  }
}

export async function createLinkCodeAction(_: ActionState): Promise<ActionState> {
  const user = await requireRole('customer');
  const code = await createLinkCode(sql(), user.id);
  return { ok: code };
}

export async function sendMessageAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('customer', 'contractor');
  const jobId = String(form.get('jobId'));
  const contractorId = String(form.get('contractorId'));
  try {
    await postMessage(sql(), user, jobId, contractorId, String(form.get('body') ?? ''));
    revalidatePath(user.role === 'customer' ? `/klant/klussen/${jobId}` : `/vakman/klussen/${jobId}`);
    return { ok: 'Verstuurd' };
  } catch (e) {
    return asState(e);
  }
}
