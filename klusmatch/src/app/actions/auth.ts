'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { sql } from '@/lib/db';
import { authenticate, registerUser } from '@/lib/auth/users';
import { clientIp, endSession, startSession } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { rateLimit, RateLimitError } from '@/lib/rate-limit';
import { UserFacingError } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { claimInvite } from '@/lib/outreach';
import type { ActionState } from '@/components/forms';

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const ip = clientIp(await headers());
  try {
    await rateLimit(sql(), `login:ip:${ip ?? 'unknown'}`, 20, 900);
    await rateLimit(sql(), `login:email:${email.toLowerCase()}`, 8, 900);
  } catch (e) {
    if (e instanceof RateLimitError) return { error: 'Te veel inlogpogingen. Probeer het over een kwartier opnieuw.' };
    throw e;
  }
  const user = await authenticate(sql(), email, password);
  if (!user) {
    await audit(sql(), { action: 'auth.login_failed', entityType: 'user', metadata: { email: email.toLowerCase().slice(0, 200) }, ip });
    return { error: 'E-mailadres of wachtwoord klopt niet.' };
  }
  await startSession(user.id);
  await audit(sql(), { actorId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, ip });
  const next = String(form.get('next') ?? '');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : homeFor(user.role));
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ip = clientIp(await headers());
  try {
    await rateLimit(sql(), `register:${ip ?? 'unknown'}`, 10, 3600);
    // One transaction: the account and its audit entry are created together or not at all.
    const invite = String(form.get('invite') ?? '').toUpperCase();
    const user = await sql().begin(async (tx) => {
      const u = await registerUser(
      tx,
      {
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        role: form.get('role') === 'contractor' ? 'contractor' : 'customer',
      },
      ip,
      );
      if (u.role === 'contractor') await claimInvite(tx, invite, u.id);
      return u;
    });
    await startSession(user.id);
    redirect(user.role === 'contractor' ? '/vakman/profiel' : '/klant/nieuw');
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues[0]?.message ?? 'Controleer je gegevens.' };
    if (e instanceof UserFacingError || e instanceof RateLimitError) return { error: e.message };
    throw e;
  }
}

export async function logoutAction() {
  await endSession();
  redirect('/');
}
