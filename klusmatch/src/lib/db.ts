import postgres from 'postgres';
import { env } from './env';

export type Sql = postgres.Sql<Record<string, unknown>>;
export type Tx = postgres.TransactionSql<Record<string, unknown>>;
/** Either the pool or an open transaction — services accept both. */
export type Db = Sql | Tx;

const globalForDb = globalThis as unknown as { __klusmatchSql?: Sql };

export function sql(): Sql {
  if (!globalForDb.__klusmatchSql) {
    const url = env().DATABASE_URL;
    // Supabase's transaction pooler (port 6543 / pgbouncer) does not support prepared statements.
    const pooled = /:6543\//.test(url) || /pgbouncer=true/.test(url) || process.env.DB_PREPARE === 'false';
    globalForDb.__klusmatchSql = postgres(url, {
      prepare: !pooled,
      max: Number(process.env.DB_POOL_MAX ?? (pooled ? 3 : 10)),
      idle_timeout: 20,
      transform: { undefined: null },
      onnotice: () => {},
    });
  }
  return globalForDb.__klusmatchSql;
}

export async function closeDb() {
  if (globalForDb.__klusmatchSql) {
    await globalForDb.__klusmatchSql.end({ timeout: 5 });
    globalForDb.__klusmatchSql = undefined;
  }
}
