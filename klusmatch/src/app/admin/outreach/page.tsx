import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, EmptyState, PageHeader, Stat, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { audit } from '@/lib/audit';
import { OUTREACH_STATUS } from '@/lib/outreach';

export const metadata = { title: 'Outreach' };

async function setLeadStatus(form: FormData) {
  'use server';
  const admin = await requireRole('admin');
  const id = String(form.get('leadId'));
  const status = String(form.get('status'));
  if (!(status in OUTREACH_STATUS)) return;
  const db = sql();
  const [lead] = await db<{ email: string }[]>`update outreach_leads set status = ${status}::outreach_status, last_status_at = now() where id = ${id} returning email`;
  if (lead && (status === 'opted_out' || status === 'bounced')) {
    await db`insert into outreach_suppressions (email, reason) values (${lead.email}, ${status}) on conflict do nothing`;
  }
  await audit(db, { actorId: admin.id, action: `outreach.${status}`, entityType: 'outreach_lead', entityId: id });
  revalidatePath('/admin/outreach');
}

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireRole('admin');
  const { status } = await searchParams;
  const filter = status && status in OUTREACH_STATUS ? status : null;
  const db = sql();
  const counts = await db<{ status: string; n: number }[]>`select status::text, count(*)::int as n from outreach_leads group by 1`;
  const c = Object.fromEntries(counts.map((r) => [r.status, r.n])) as Record<string, number>;
  const total = counts.reduce((a, r) => a + r.n, 0);
  const [{ today }] = await db<{ today: number }[]>`select count(*)::int as today from outreach_leads where contacted_at > date_trunc('day', now() at time zone 'Europe/Amsterdam') at time zone 'Europe/Amsterdam'`;
  const leads = await db<{ id: string; company_name: string; legal_form: string; email: string; website: string | null; city: string | null; trades: string[]; status: string; contacted_at: Date | null; invite_code: string; source_url: string; notes: string | null }[]>`
    select id, company_name, legal_form, email, website, city, trades, status::text, contacted_at, invite_code, source_url, notes
    from outreach_leads where (${filter}::text is null or status::text = ${filter}) order by coalesce(contacted_at, created_at) desc limit 300`;
  const base = env().APP_BASE_URL;

  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Groei" title="Outreach naar vakmensen" description="Bedrijven (B.V.) die via hun algemene bedrijfsadres zijn benaderd. Wie zich afmeldt, wordt nooit meer gemaild." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Leads" value={total} hint={`${c.new ?? 0} nog niet gemaild`} />
        <Stat label="Vandaag gemaild" value={today} hint="max. 20 per dag" />
        <Stat label="Gemaild" value={(c.contacted ?? 0) + (c.replied ?? 0) + (c.signed_up ?? 0) + (c.not_interested ?? 0) + (c.opted_out ?? 0)} />
        <Stat label="Gereageerd" value={(c.replied ?? 0) + (c.not_interested ?? 0)} />
        <Stat label="Aangemeld" value={c.signed_up ?? 0} hint="via uitnodigingslink" />
      </div>
      <div className="my-5 flex flex-wrap gap-2">
        <Link href="/admin/outreach" className={`chip px-3 py-1.5 text-sm ${!filter ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200'}`}>Alles</Link>
        {Object.entries(OUTREACH_STATUS).map(([k, v]) => (
          <Link key={k} href={`/admin/outreach?status=${k}`} className={`chip px-3 py-1.5 text-sm ${filter === k ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200'}`}>{v.label} ({c[k] ?? 0})</Link>
        ))}
      </div>
      {leads.length === 0 ? (
        <EmptyState title="Nog geen leads">Leads worden toegevoegd door de outreach-assistent.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-xs text-navy-500">
              <tr><th className="px-5 py-2.5 font-medium">Bedrijf</th><th className="py-2.5 font-medium">Contact</th><th className="py-2.5 font-medium">Status</th><th className="px-5 py-2.5 font-medium">Actie</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy-900">{l.company_name} <span className="text-xs font-normal text-navy-400">{l.legal_form}</span></p>
                    <p className="text-xs text-navy-500">{l.trades.join(', ')}{l.city && ` · ${l.city}`}</p>
                  </td>
                  <td className="py-3 text-xs text-navy-500">
                    {l.email}<br />
                    {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="underline">website</a>} · <a href={l.source_url} target="_blank" rel="noreferrer" className="underline">bron</a>
                    <br /><span className="font-mono text-[10px] text-navy-400">{base}/registreren?rol=vakman&uitnodiging={l.invite_code}</span>
                  </td>
                  <td className="py-3">
                    <Badge tone={OUTREACH_STATUS[l.status]?.tone}>{OUTREACH_STATUS[l.status]?.label}</Badge>
                    {l.contacted_at && <p className="mt-1 text-xs text-navy-400">{relTime(l.contacted_at)}</p>}
                    {l.notes && <p className="mt-1 max-w-xs text-xs text-navy-500">{l.notes}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <form action={setLeadStatus} className="flex gap-1">
                      <input type="hidden" name="leadId" value={l.id} />
                      <select name="status" defaultValue={l.status} className="input w-40 py-1.5 text-xs" aria-label="Status">
                        {Object.entries(OUTREACH_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button className="btn-secondary px-2.5 py-1 text-xs">Opslaan</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
