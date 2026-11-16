import { createHash, randomInt } from 'node:crypto';
import type { Db } from '../db';
import { sql } from '../db';
import { audit } from '../audit';

export type WaContact = {
  id: string; phone_e164: string; profile_name: string | null; user_id: string | null;
  consent: 'unknown' | 'pending' | 'granted' | 'opted_out'; pending_action: PendingAction | null; last_inbound_at: Date | null;
  simulated: boolean;
};

export type PendingAction =
  | { type: 'consent'; replayMessageId?: string }
  | { type: 'accept_quote'; quoteId: string; quoteRef: string }
  | { type: 'complete_job'; jobId: string; title: string }
  | { type: 'review_rating'; jobId: string; company: string }
  | { type: 'review_text'; jobId: string; rating: number };

export async function upsertContact(db: Db, phone: string, profileName?: string, simulated = false): Promise<WaContact> {
  // `simulated` is only set when the contact is created; a real number never turns into a simulated one.
  const [c] = await db<WaContact[]>`
    insert into wa_contacts (phone_e164, profile_name, last_inbound_at, simulated) values (${phone}, ${profileName ?? null}, now(), ${simulated})
    on conflict (phone_e164) do update set last_inbound_at = now(), profile_name = coalesce(excluded.profile_name, wa_contacts.profile_name)
    returning *`;
  return c;
}

export async function setPendingAction(db: Db, contactId: string, action: PendingAction | null) {
  await db`update wa_contacts set pending_action = ${action ? db.json(action as never) : null} where id = ${contactId}`;
}

/**
 * Returns the customer account for a WhatsApp contact, creating a phone-only customer account
 * on first publication. Customers can later link it to a web login with a KOPPEL code.
 */
export async function ensureCustomerForContact(contactId: string): Promise<string> {
  return sql().begin(async (tx) => {
    const [c] = await tx<WaContact[]>`select * from wa_contacts where id = ${contactId} for update`;
    if (c.user_id) return c.user_id;
    const [existing] = await tx<{ id: string; role: string }[]>`select id, role from users where phone_e164 = ${c.phone_e164}`;
    let userId = existing?.role === 'customer' ? existing.id : null;
    if (!userId) {
      const [u] = await tx<{ id: string }[]>`
        insert into users (role, full_name, phone_e164, created_via)
        values ('customer', ${c.profile_name ?? 'WhatsApp-klant'}, ${existing ? null : c.phone_e164}, 'whatsapp')
        returning id`;
      userId = u.id;
      await audit(tx, { actorId: userId, action: 'user.created_from_whatsapp', entityType: 'user', entityId: userId });
    }
    await tx`update wa_contacts set user_id = ${userId} where id = ${contactId}`;
    return userId;
  });
}

const hashCode = (code: string) => createHash('sha256').update(code).digest('hex');

/** Web user generates a 6-digit code and sends "KOPPEL 123456" over WhatsApp to link the number. */
export async function createLinkCode(db: Db, userId: string) {
  const code = String(randomInt(100000, 1000000));
  await db`delete from account_link_codes where user_id = ${userId}`;
  await db`insert into account_link_codes (code_hash, user_id, expires_at) values (${hashCode(code)}, ${userId}, now() + interval '15 minutes')`;
  return code;
}

export async function redeemLinkCode(contactId: string, code: string): Promise<'linked' | 'invalid' | 'conflict'> {
  return sql().begin(async (tx) => {
    const [row] = await tx<{ user_id: string }[]>`
      update account_link_codes set used_at = now()
      where code_hash = ${hashCode(code)} and used_at is null and expires_at > now()
      returning user_id`;
    if (!row) return 'invalid';
    const [u] = await tx<{ role: string }[]>`select role from users where id = ${row.user_id}`;
    if (u.role !== 'customer') return 'invalid';
    const [c] = await tx<WaContact[]>`select * from wa_contacts where id = ${contactId} for update`;
    if (c.user_id && c.user_id !== row.user_id) {
      // Contact already belongs to a phone-only account: move its jobs over only if that account has no login.
      const [prev] = await tx<{ email: string | null }[]>`select email from users where id = ${c.user_id}`;
      if (prev?.email) return 'conflict';
      await tx`update jobs set customer_id = ${row.user_id} where customer_id = ${c.user_id}`;
      await tx`update intake_sessions set customer_id = ${row.user_id} where customer_id = ${c.user_id}`;
      await tx`update users set status = 'suspended', phone_e164 = null where id = ${c.user_id}`;
    }
    await tx`update users set phone_e164 = ${c.phone_e164} where id = ${row.user_id} and (phone_e164 is null or phone_e164 = ${c.phone_e164})`;
    await tx`update wa_contacts set user_id = ${row.user_id} where id = ${contactId}`;
    await audit(tx, { actorId: row.user_id, action: 'whatsapp.linked', entityType: 'wa_contact', entityId: contactId });
    return 'linked';
  });
}
