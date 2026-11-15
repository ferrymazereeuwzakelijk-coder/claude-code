import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { sql, type Db } from '../db';

export const SESSION_COOKIE = 'km_session';
const SESSION_DAYS = 14;

export type Role = 'customer' | 'contractor' | 'admin';
export type SessionUser = { id: string; email: string | null; role: Role; fullName: string; phone: string | null };

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(db: Db, userId: string, meta: { ip?: string | null; userAgent?: string | null } = {}) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db`insert into sessions (token_hash, user_id, expires_at, ip, user_agent)
           values (${hashToken(token)}, ${userId}, ${expires}, ${meta.ip ?? null}, ${meta.userAgent?.slice(0, 300) ?? null})`;
  return { token, expires };
}

export async function userFromToken(db: Db, token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [row] = await db<{ id: string; email: string | null; role: Role; full_name: string; phone_e164: string | null }[]>`
    select u.id, u.email, u.role, u.full_name, u.phone_e164
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now() and u.status = 'active'`;
  return row ? { id: row.id, email: row.email, role: row.role, fullName: row.full_name, phone: row.phone_e164 } : null;
}

/** Resolves the signed-in user from the session cookie (memoised per request). */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  return userFromToken(sql(), jar.get(SESSION_COOKIE)?.value);
});

export async function startSession(userId: string) {
  const h = await headers();
  const { token, expires } = await createSession(sql(), userId, { ip: clientIp(h), userAgent: h.get('user-agent') });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sql()`delete from sessions where token_hash = ${hashToken(token)}`;
  jar.delete(SESSION_COOKIE);
}

export function clientIp(h: Headers): string | null {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
}
