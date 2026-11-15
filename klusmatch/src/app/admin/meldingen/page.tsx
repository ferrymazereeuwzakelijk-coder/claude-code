import Link from 'next/link';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, EmptyState, PageHeader, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { REPORT_REASONS } from '@/lib/reports';
import { resolveReportAction } from '@/app/actions/admin';

export const metadata = { title: 'Meldingen & geschillen' };

const STATUS_TONE = { open: 'amber', in_progress: 'blue', resolved: 'green', dismissed: 'neutral' } as const;
const STATUS_LABEL = { open: 'Open', in_progress: 'In behandeling', resolved: 'Opgelost', dismissed: 'Afgewezen' } as const;

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireRole('admin');
  const { filter } = await searchParams;
  const showClosed = filter === 'alles';
  const rows = await sql()<{ id: string; kind: 'report' | 'dispute'; target_type: string; target_id: string; job_id: string | null; job_title: string | null; job_ref: string | null; reason: keyof typeof REPORT_REASONS; body: string; status: keyof typeof STATUS_TONE; resolution_note: string | null; created_at: Date; reporter: string; reporter_role: string; reporter_contact: string | null; target_preview: string | null }[]>`
    select r.id, r.kind, r.target_type, r.target_id, r.job_id, j.title as job_title, j.ref as job_ref, r.reason, r.body, r.status, r.resolution_note, r.created_at,
           u.full_name as reporter, u.role::text as reporter_role, coalesce(u.email::text, u.phone_e164) as reporter_contact,
           case r.target_type
             when 'review' then (select left(body, 160) from reviews where id::text = r.target_id)
             when 'quote' then (select left(message, 160) from quotes where id::text = r.target_id)
             else null end as target_preview
    from reports r join users u on u.id = r.reporter_id left join jobs j on j.id = r.job_id
    where ${showClosed} or r.status in ('open', 'in_progress')
    order by (r.kind = 'dispute') desc, r.created_at asc limit 100`;

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Beheer"
        title="Meldingen & geschillen"
        description="Geschillen staan bovenaan. Neem contact op met beide partijen voordat je een geschil afsluit."
        actions={<Link href={showClosed ? '/admin/meldingen' : '/admin/meldingen?filter=alles'} className="btn-secondary text-sm">{showClosed ? 'Alleen open' : 'Toon alles'}</Link>}
      />
      {rows.length === 0 ? (
        <EmptyState title="Geen open meldingen">Alles is afgehandeld.</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className={`card p-5 ${r.kind === 'dispute' && r.status === 'open' ? 'ring-2 ring-red-200' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.kind === 'dispute' ? 'red' : 'neutral'}>{r.kind === 'dispute' ? 'Geschil' : 'Melding'}</Badge>
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                <span className="text-sm font-medium text-navy-900">{REPORT_REASONS[r.reason]}</span>
                <span className="text-xs text-navy-400">· {r.target_type} · {relTime(r.created_at)}</span>
              </div>
              <p className="mt-2 text-xs text-navy-500">
                Door {r.reporter} ({r.reporter_role === 'contractor' ? 'vakman' : 'klant'}, {r.reporter_contact ?? '—'}){r.job_title && <> · klus <strong>{r.job_ref}</strong> “{r.job_title}”</>}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm text-navy-700">{r.body}</p>
              {r.target_preview && <blockquote className="mt-3 border-l-2 border-navy-200 pl-3 text-xs italic text-navy-500">“{r.target_preview}”</blockquote>}
              {r.resolution_note && <p className="mt-3 text-xs text-navy-500"><strong>Notitie:</strong> {r.resolution_note}</p>}
              {(r.status === 'open' || r.status === 'in_progress') && (
                <form action={resolveReportAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4">
                  <input type="hidden" name="reportId" value={r.id} />
                  <input name="note" className="input w-64 py-1.5 text-xs" placeholder="Notitie (gaat naar de melder)" aria-label="Notitie" maxLength={1000} />
                  {r.kind === 'report' && (r.target_type === 'review' || r.target_type === 'job') && (
                    <label className="flex items-center gap-1.5 text-xs text-navy-600"><input type="checkbox" name="hideTarget" className="accent-red-600" /> {r.target_type === 'review' ? 'Review verbergen' : 'Klus verwijderen'}</label>
                  )}
                  <div className="ml-auto flex gap-2">
                    {r.status === 'open' && <button name="status" value="in_progress" className="btn-secondary px-3 py-1.5 text-xs">In behandeling</button>}
                    <button name="status" value="dismissed" className="btn-ghost px-3 py-1.5 text-xs">Afwijzen</button>
                    <button name="status" value="resolved" className="btn-primary px-3 py-1.5 text-xs">Opgelost</button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
