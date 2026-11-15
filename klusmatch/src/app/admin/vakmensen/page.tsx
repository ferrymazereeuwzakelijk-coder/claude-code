import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, EmptyState, PageHeader, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { verifyContractorAction } from '@/app/actions/admin';

export const metadata = { title: 'Vakmensen' };

const TONE = { unsubmitted: 'neutral', pending: 'amber', verified: 'green', rejected: 'red' } as const;

export default async function AdminContractors() {
  const user = await requireRole('admin');
  const rows = await sql()<{ user_id: string; company_name: string; kvk_number: string | null; base_postcode: string; service_radius_km: number; verification: keyof typeof TONE; created_at: Date; email: string | null; full_name: string; categories: string[]; quotes: number; accepted: number }[]>`
    select cp.user_id, cp.company_name, cp.kvk_number, cp.base_postcode, cp.service_radius_km, cp.verification, cp.created_at,
           u.email, u.full_name,
           array(select c.name_nl from contractor_categories cc join categories c on c.slug = cc.category_slug where cc.contractor_id = cp.user_id) as categories,
           (select count(*)::int from quotes q where q.contractor_id = cp.user_id) as quotes,
           (select count(*)::int from quotes q where q.contractor_id = cp.user_id and q.status = 'accepted') as accepted
    from contractor_profiles cp join users u on u.id = cp.user_id
    order by (cp.verification = 'pending') desc, cp.created_at desc limit 200`;
  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Beheer" title="Vakmensen verifiëren" description="Controleer de KvK-inschrijving (kvk.nl) en of de vakgebieden passen bij de SBI-code voordat je verifieert." />
      {rows.length === 0 ? <EmptyState title="Nog geen vakmensen" /> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.user_id} className="card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-navy-900">{r.company_name}</h3>
                  <Badge tone={TONE[r.verification]}>{r.verification}</Badge>
                </div>
                <p className="mt-1 text-xs text-navy-500">KvK {r.kvk_number ?? '—'} · {r.full_name} · {r.email} · {r.base_postcode} (+{r.service_radius_km} km) · aangemeld {relTime(r.created_at)}</p>
                <p className="mt-1 text-xs text-navy-400">{r.categories.join(', ')} · {r.quotes} offertes, {r.accepted} geaccepteerd</p>
              </div>
              <form action={verifyContractorAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="contractorId" value={r.user_id} />
                <input name="note" className="input w-44 py-1.5 text-xs" placeholder="Notitie (bij afwijzen)" aria-label="Notitie" />
                {r.verification !== 'verified' && <button name="decision" value="verify" className="btn-primary px-3 py-1.5 text-xs">Verifiëren</button>}
                {r.verification !== 'rejected' && <button name="decision" value="reject" className="btn-danger px-3 py-1.5 text-xs">Afwijzen</button>}
              </form>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
