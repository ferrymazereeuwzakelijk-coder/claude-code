/**
 * Demo data — ONLY for APP_ENV=development or APP_ENV=demo.
 * All accounts use the reserved .test TLD and are created through the real services
 * (registration, profile save, intake engine, confirmation, matching), so demo data
 * follows exactly the same rules as production data.
 */
import { loadEnv } from './load-env';
loadEnv();

const APP_ENV = process.env.APP_ENV ?? 'development';
if (!['development', 'demo'].includes(APP_ENV)) {
  console.error(`Refusing to seed demo data with APP_ENV=${APP_ENV}.`);
  process.exit(1);
}

const { sql, closeDb } = await import('../src/lib/db');
const { registerUser } = await import('../src/lib/auth/users');
const { hashPassword } = await import('../src/lib/auth/password');
const { saveContractorProfile } = await import('../src/lib/contractors');
const { createIntake, handleCustomerTurn, confirmAndPublish } = await import('../src/lib/intake/engine');
const { RulesProvider } = await import('../src/lib/intake/providers/rules');
const { drainQueue } = await import('../src/lib/worker');

const PASSWORD = 'demo-wachtwoord-2026';
const DOMAIN = 'demo.klusmatch.test';
const db = sql();

const [existing] = await db<{ n: number }[]>`select count(*)::int as n from users where email like ${'%@' + DOMAIN}`;
if (existing.n > 0) {
  console.log('Demo data already present. To reseed, delete users with @' + DOMAIN + ' first.');
  await closeDb();
  process.exit(0);
}

async function user(fullName: string, local: string, role: 'customer' | 'contractor') {
  return registerUser(db, { fullName, email: `${local}@${DOMAIN}`, password: PASSWORD, role });
}

// Admin (registration only allows customer/contractor, so insert directly)
const [admin] = await db<{ id: string }[]>`
  insert into users (email, password_hash, role, full_name, created_via)
  values (${'admin@' + DOMAIN}, ${await hashPassword(PASSWORD)}, 'admin', 'Demo Beheerder', 'seed') returning id`;

const contractors = [
  { name: 'Jeroen Visser', local: 'schilder', company: 'Visser Schilderwerken', kvk: '81234567', pc: '3581', radius: 30, cats: ['schilderwerk', 'stukadoor'], verified: true },
  { name: 'Anouk de Groot', local: 'hovenier', company: 'Groene Vingers Hoveniers', kvk: '72345678', pc: '3523', radius: 25, cats: ['tuinonderhoud', 'bestrating'], verified: true },
  { name: 'Mehmet Yilmaz', local: 'loodgieter', company: 'Yilmaz Installatietechniek', kvk: '63456789', pc: '1062', radius: 40, cats: ['loodgieter', 'cv_installatie', 'badkamer'], verified: true },
  { name: 'Pieter Bakker', local: 'dakdekker', company: 'Bakker Dak & Gevel', kvk: '54567890', pc: '3812', radius: 50, cats: ['dakwerk', 'timmerwerk'], verified: true },
  { name: 'Sven Mulder', local: 'nieuw', company: 'Mulder Klusbedrijf', kvk: '45678901', pc: '3511', radius: 20, cats: ['schilderwerk', 'timmerwerk'], verified: false },
];
for (const c of contractors) {
  const u = await user(c.name, c.local, 'contractor');
  await saveContractorProfile(db, u.id, { companyName: c.company, kvkNumber: c.kvk, description: `${c.company} — demo-account.`, basePostcode: c.pc, serviceRadiusKm: c.radius, categories: c.cats, available: true });
  if (c.verified) await db`update contractor_profiles set verification = 'verified', verified_at = now(), verified_by = ${admin.id} where user_id = ${u.id}`;
}

const customer = await user('Sanne de Vries', 'klant', 'customer');
const provider = new RulesProvider();
async function demoJob(lines: string[]) {
  const id = await createIntake(db, { channel: 'web', customerId: customer.id });
  for (const text of lines) await handleCustomerTurn(id, { text }, { provider, resolveCustomerId: async () => customer.id });
  return confirmAndPublish(id, customer.id);
}
await demoJob(['De houten schutting in de achtertuin moet geschilderd worden, de verf bladdert flink af.', '3512 AB', 'ongeveer 15 meter lang en 1,8 meter hoog', 'binnen een maand', '€ 900']);
await demoJob(['Onze heg moet gesnoeid worden en het gazon verticuteren', '3521 KL', '20 meter heg en 50 m2 gazon', 'flexibel', 'geen idee']);
await drainQueue();

console.log(`
Demo data created (APP_ENV=${APP_ENV}). Password for all accounts: ${PASSWORD}
  admin@${DOMAIN}       — beheer
  klant@${DOMAIN}       — klant met 2 geplaatste klussen
  schilder@${DOMAIN}    — geverifieerde schilder (Utrecht)
  hovenier@${DOMAIN}    — geverifieerde hovenier (Utrecht)
  loodgieter@${DOMAIN}  — geverifieerde loodgieter (Amsterdam)
  dakdekker@${DOMAIN}   — geverifieerde dakdekker (Amersfoort)
  nieuw@${DOMAIN}       — vakman wacht op verificatie
`);
await closeDb();
