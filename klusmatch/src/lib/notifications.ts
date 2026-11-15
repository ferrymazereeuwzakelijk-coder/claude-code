import type { Db } from './db';

export async function notify(
  db: Db,
  userId: string,
  n: { kind: string; title: string; body: string; link?: string; dedupeKey?: string },
) {
  await db`
    insert into notifications (user_id, kind, title, body, link, dedupe_key)
    values (${userId}, ${n.kind}, ${n.title}, ${n.body}, ${n.link ?? null}, ${n.dedupeKey ?? null})
    on conflict (dedupe_key) do nothing`;
}

export async function unreadCount(db: Db, userId: string) {
  const [r] = await db<{ n: number }[]>`select count(*)::int as n from notifications where user_id = ${userId} and read_at is null`;
  return r.n;
}
