import type { Db } from './db';

export async function audit(
  db: Db,
  entry: { actorId?: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Record<string, unknown>; ip?: string | null },
) {
  await db`
    insert into audit_log (actor_user_id, action, entity_type, entity_id, metadata, ip)
    values (${entry.actorId ?? null}, ${entry.action}, ${entry.entityType}, ${entry.entityId ?? null},
            ${db.json((entry.metadata ?? {}) as never)}, ${entry.ip ?? null})`;
}
