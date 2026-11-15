import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { loadEnv } from './load-env';

export async function migrate(databaseUrl: string, log = console.log) {
  const db = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await db`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const applied = new Set((await db<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
    const dir = path.resolve('db/migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      const content = readFileSync(path.join(dir, file), 'utf8');
      await db.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`insert into schema_migrations (name) values (${file})`;
      });
      log(`applied ${file}`);
    }
    log('migrations up to date');
  } finally {
    await db.end();
  }
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  loadEnv();
  migrate(process.env.DATABASE_URL!).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
