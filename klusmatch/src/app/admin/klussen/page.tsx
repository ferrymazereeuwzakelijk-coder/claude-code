import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, JOB_STATUS, PageHeader, eur, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { moderateJobAction } from '@/app/actions/admin';

export const metadata = { title: 'Moderatie' };

export default async function AdminJobs() {
  const user = await requireRole('admin');
  const jobs = await sql()<{ id: string; ref: string; title: string; description: string; status: string; category: string; region_name: string; budget_max_cents: number | null; published_at: Date; customer: string; quotes: number; matches: number; channel: string | null }[]>`
    select j.id, j.ref, j.title, j.description, j.status, c.name_nl as category, j.region_name, j.budget_max_cents, j.published_at,
           u.full_name as customer, i.channel::text as channel,
           (select count(*)::int from quotes q where q.job_id = j.id) as quotes,
           (select count(*)::int from job_matches m where m.job_id = j.id and m.notified) as matches
    from jobs j join categories c on c.slug = j.category_slug join users u on u.id = j.customer_id left join intake_sessions i on i.id = j.intake_id
    order by (j.status = 'under_review') desc, j.published_at desc limit 100`;
  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Beheer" title="Klussen modereren" description="Specialistische klussen (zoals asbest) wachten op goedkeuring. Verwijder klussen die in strijd zijn met de voorwaarden." />
      <div className="space-y-3">
        {jobs.map((j) => (
          <article key={j.id} className={`card p-5 ${j.status === 'under_review' ? 'ring-2 ring-amber-300' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={JOB_STATUS[j.status]?.tone}>{JOB_STATUS[j.status]?.label ?? j.status}</Badge>
              <span className="text-xs text-navy-400">{j.ref} · {j.category} · {j.region_name} · {j.customer} · via {j.channel ?? '—'} · {relTime(j.published_at)}</span>
            </div>
            <h3 className="mt-2 font-semibold text-navy-900">{j.title}</h3>
            <details className="mt-1 text-sm text-navy-600">
              <summary className="cursor-pointer text-xs text-navy-400">Omschrijving tonen</summary>
              <p className="mt-2 whitespace-pre-line">{j.description}</p>
            </details>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-navy-500">
              <span>Budget {j.budget_max_cents ? eur(j.budget_max_cents) : '—'}</span>
              <span>{j.matches} vakmensen gematcht</span>
              <span>{j.quotes} offertes</span>
              {(j.status === 'under_review' || j.status === 'published') && (
                <form action={moderateJobAction} className="ml-auto flex flex-wrap gap-2">
                  <input type="hidden" name="jobId" value={j.id} />
                  <input name="reason" className="input w-40 py-1.5 text-xs" placeholder="Reden" aria-label="Reden" />
                  {j.status === 'under_review' && <button name="decision" value="approve" className="btn-primary px-3 py-1.5 text-xs">Goedkeuren & matchen</button>}
                  <button name="decision" value="remove" className="btn-danger px-3 py-1.5 text-xs">Verwijderen</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
