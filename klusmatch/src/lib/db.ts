import postgres from 'postgres';
import { env } from './env';

export type Sql = postgres.Sql<Record<string, unknown>>;
export type Tx = postgres.TransactionSql<Record<string, unknown>>;
/** Either the pool or an open transaction — services accept both. */
export type Db = Sql | Tx;

const globalForDb = globalThis as unknown as { __klusmatchSql?: Sql };

export function sql(): Sql {
  if (!globalForDb.__klusmatchSql) {
    globalForDb.__klusmatchSql = postgres(env().DATABASE_URL, {
      max: Number(process.env.DB_POOL_MAX ?? 10),
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
