import Link from 'next/link';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, PageHeader, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { setUserStatusAction } from '@/app/actions/admin';

export const metadata = { title: 'Gebruikers' };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; rol?: string }> }) {
  const admin = await requireRole('admin');
  const { q = '', rol } = await searchParams;
  const role = rol === 'vakman' ? 'contractor' : rol === 'klant' ? 'customer' : null;
  const term = `%${q.trim().slice(0, 100).replace(/[%_]/g, '')}%`;
  const users = await sql()<{ id: string; full_name: string; email: string | null; phone_e164: string | null; role: string; status: string; created_via: string; created_at: Date; jobs: number; quotes: number; open_reports: number; wa: string | null }[]>`
    select u.id, u.full_name, u.email, u.phone_e164, u.role, u.status, u.created_via, u.created_at,
           (select count(*)::int from jobs j where j.customer_id = u.id) as jobs,
           (select count(*)::int from quotes q where q.contractor_id = u.id) as quotes,
           (select count(*)::int from reports r where r.status in ('open','in_progress') and r.target_type = 'user' and r.target_id = u.id::text) as open_reports,
           (select consent::text from wa_contacts w where w.user_id = u.id limit 1) as wa
    from users u
    where u.role <> 'admin'
      and (${role}::user_role is null or u.role = ${role}::user_role)
      and (${q === ''} or u.full_name ilike ${term} or u.email::text ilike ${term} or u.phone_e164 ilike ${term})
    order by u.created_at desc limit 100`;
  const tab = (label: string, value?: string) => (
    <Link href={`/admin/gebruikers${value ? `?rol=${value}` : ''}`} className={`chip px-3 py-1.5 text-sm ${rol === value ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 ring-1 ring-navy-200'}`}>{label}</Link>
  );
  return (
    <AppShell user={admin}>
      <PageHeader eyebrow="Beheer" title="Gebruikers" description="Zoek klanten en vakmensen en blokkeer accounts bij misbruik. Blokkeren beëindigt direct alle sessies." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tab('Iedereen')}
        {tab('Klanten', 'klant')}
        {tab('Vakmensen', 'vakman')}
        <form className="ml-auto flex gap-2">
          {rol && <input type="hidden" name="rol" value={rol} />}
          <input name="q" defaultValue={q} className="input w-64 py-2" placeholder="Naam, e-mail of telefoon" aria-label="Zoeken" />
          <button className="btn-dark">Zoek</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-50 text-xs text-navy-500">
            <tr><th className="px-5 py-2.5 font-medium">Naam</th><th className="py-2.5 font-medium">Contact</th><th className="py-2.5 font-medium">Rol</th><th className="py-2.5 font-medium">Activiteit</th><th className="py-2.5 font-medium">Aangemeld</th><th className="px-5 py-2.5" /></tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {users.map((u) => (
              <tr key={u.id} className={u.status === 'suspended' ? 'bg-red-50/40' : ''}>
                <td className="px-5 py-3">
                  <p className="font-medium text-navy-900">{u.full_name}</p>
                  <div className="mt-0.5 flex gap-1">
                    {u.status === 'suspended' && <Badge tone="red">Geblokkeerd</Badge>}
                    {u.open_reports > 0 && <Badge tone="amber">{u.open_reports} melding(en)</Badge>}
                    {u.created_via === 'whatsapp' && <Badge tone="green">WhatsApp</Badge>}
                  </div>
                </td>
                <td className="py-3 text-xs text-navy-500">{u.email ?? '—'}<br />{u.phone_e164 ?? ''}{u.wa && ` · WA: ${u.wa}`}</td>
                <td className="py-3 text-xs text-navy-600">{u.role === 'contractor' ? 'Vakman' : 'Klant'}</td>
                <td className="py-3 text-xs text-navy-500">{u.role === 'contractor' ? `${u.quotes} offertes` : `${u.jobs} klussen`}</td>
                <td className="py-3 text-xs text-navy-400">{relTime(u.created_at)}</td>
                <td className="px-5 py-3 text-right">
                  <form action={setUserStatusAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="status" value={u.status === 'suspended' ? 'active' : 'suspended'} />
                    <button className={u.status === 'suspended' ? 'btn-secondary px-2.5 py-1 text-xs' : 'btn-danger px-2.5 py-1 text-xs'}>{u.status === 'suspended' ? 'Heractiveren' : 'Blokkeren'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-8 text-center text-sm text-navy-400">Geen gebruikers gevonden.</p>}
      </div>
    </AppShell>
  );
}
