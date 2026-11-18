import type { Db } from './db';
import { audit } from './audit';

/** Links a new contractor account to the outreach lead whose invite code they used. */
export async function claimInvite(db: Db, code: string | null | undefined, userId: string) {
  if (!code || !/^[A-Z0-9]{6,12}$/.test(code)) return;
  const rows = await db<{ id: string }[]>`
    update outreach_leads set status = 'signed_up', signed_up_user_id = ${userId}, last_status_at = now()
    where invite_code = ${code} and status not in ('opted_out', 'signed_up') returning id`;
  if (rows.length) await audit(db, { actorId: userId, action: 'outreach.signed_up', entityType: 'outreach_lead', entityId: rows[0].id });
}

export const OUTREACH_STATUS: Record<string, { label: string; tone: 'neutral' | 'blue' | 'amber' | 'green' | 'red' }> = {
  new: { label: 'Nog niet gemaild', tone: 'neutral' },
  contacted: { label: 'Gemaild', tone: 'blue' },
  replied: { label: 'Gereageerd', tone: 'amber' },
  signed_up: { label: 'Aangemeld', tone: 'green' },
  not_interested: { label: 'Geen interesse', tone: 'neutral' },
  opted_out: { label: 'Afgemeld', tone: 'red' },
  bounced: { label: 'Onbestelbaar', tone: 'red' },
};
