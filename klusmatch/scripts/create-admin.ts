/** Creates (or promotes) an administrator. Usage: npm run admin:create -- admin@example.nl "Naam" */
import { createInterface } from 'node:readline/promises';
import { loadEnv } from './load-env';
loadEnv();

const [email, name] = process.argv.slice(2);
if (!email || !name) {
  console.error('Usage: npm run admin:create -- <email> "<full name>"');
  process.exit(1);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = process.env.ADMIN_PASSWORD ?? (await rl.question('Password (min 12 chars): '));
rl.close();
if (password.length < 12) {
  console.error('Password too short.');
  process.exit(1);
}
const { sql, closeDb } = await import('../src/lib/db');
const { hashPassword } = await import('../src/lib/auth/password');
const { audit } = await import('../src/lib/audit');
const [u] = await sql()<{ id: string }[]>`
  insert into users (email, password_hash, role, full_name, created_via) values (${email.toLowerCase()}, ${await hashPassword(password)}, 'admin', ${name}, 'seed')
  on conflict (email) do update set role = 'admin', password_hash = excluded.password_hash returning id`;
await audit(sql(), { actorId: u.id, action: 'admin.created_via_cli', entityType: 'user', entityId: u.id });
console.log(`Admin ready: ${email}`);
await closeDb();
