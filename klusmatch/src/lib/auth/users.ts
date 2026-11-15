import { z } from 'zod';
import type { Db } from '../db';
import { audit } from '../audit';
import { UserFacingError } from '../errors';
import { hashPassword, verifyPassword } from './password';
import type { Role } from './session';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Vul je naam in').max(120),
  email: z.string().trim().toLowerCase().email('Ongeldig e-mailadres').max(200),
  password: z.string().min(10, 'Wachtwoord moet minimaal 10 tekens hebben').max(200),
  role: z.enum(['customer', 'contractor']),
});

export async function registerUser(db: Db, input: z.infer<typeof registerSchema>, ip?: string | null) {
  const data = registerSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  const rows = await db<{ id: string }[]>`
    insert into users (email, password_hash, role, full_name)
    values (${data.email}, ${passwordHash}, ${data.role}, ${data.fullName})
    on conflict (email) do nothing
    returning id`;
  if (!rows.length) throw new UserFacingError('Er bestaat al een account met dit e-mailadres.');
  await audit(db, { actorId: rows[0].id, action: 'user.registered', entityType: 'user', entityId: rows[0].id, metadata: { role: data.role }, ip });
  return { id: rows[0].id, role: data.role as Role };
}

export async function authenticate(db: Db, email: string, password: string) {
  const [user] = await db<{ id: string; password_hash: string | null; role: Role; status: string }[]>`
    select id, password_hash, role, status from users where email = ${email.trim().toLowerCase()}`;
  // Always run a hash comparison to keep timing similar for unknown accounts.
  const ok = await verifyPassword(password, user?.password_hash ?? 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
  if (!user || !ok || user.status !== 'active') return null;
  return { id: user.id, role: user.role };
}
