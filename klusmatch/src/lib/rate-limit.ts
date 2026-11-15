import type { Db } from './db';

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super('Te veel verzoeken. Probeer het later opnieuw.');
  }
}

/**
 * Fixed-window rate limiter backed by Postgres so it works across instances.
 * Throws RateLimitError when the limit is exceeded.
 */
export async function rateLimit(db: Db, key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000);
  const [row] = await db<{ count: number }[]>`
    insert into rate_limits (key, window_start, count) values (${key}, ${windowStart}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`;
  if (row.count > limit) {
    const retry = Math.ceil((windowStart.getTime() + windowSeconds * 1000 - now) / 1000);
    throw new RateLimitError(retry);
  }
}

export async function pruneRateLimits(db: Db) {
  await db`delete from rate_limits where window_start < now() - interval '1 day'`;
}
