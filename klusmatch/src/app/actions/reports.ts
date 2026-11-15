'use server';

import { ZodError } from 'zod';
import { requireRole } from '@/lib/auth/guards';
import { createReport } from '@/lib/reports';
import { UserFacingError } from '@/lib/errors';
import { RateLimitError } from '@/lib/rate-limit';
import type { ActionState } from '@/components/forms';

export async function reportAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('customer', 'contractor');
  try {
    const kind = form.get('kind') === 'dispute' ? 'dispute' : 'report';
    await createReport(user, {
      kind,
      targetType: String(form.get('targetType')) as 'job',
      targetId: String(form.get('targetId')),
      reason: String(form.get('reason')) as 'other',
      body: String(form.get('body') ?? ''),
    });
    return { ok: kind === 'dispute' ? 'Geschil gemeld. KlusMatch neemt binnen 2 werkdagen contact op met beide partijen.' : 'Bedankt, we bekijken je melding.' };
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues[0]?.message };
    if (e instanceof UserFacingError || e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
}
