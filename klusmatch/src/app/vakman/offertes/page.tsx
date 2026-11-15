import Link from 'next/link';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, EmptyState, PageHeader, eur, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { PRICE_TYPE_LABEL } from '@/lib/quotes';
import { withdrawQuoteAction } from '@/app/actions/contractor';

export const metadata = { title: 'Mijn offertes' };

const STATUS = {
  submitted: { label: 'In afwachting', tone: 'blue' },
  accepted: { label: 'Geaccepteerd', tone: 'green' },
  declined: { label: 'Niet gekozen', tone: 'neutral' },
  withdrawn: { label: 'Ingetrokken', tone: 'neutral' },
} as const;

export default async function MyQuotesPage() {
  const user = await requireRole('contractor');
  const quotes = await sql()<{ id: string; ref: string; amount_cents: number; price_type: keyof typeof PRICE_TYPE_LABEL; status: keyof typeof STATUS; created_at: Date; job_id: string; job_title: string; region_name: string; competitors: number }[]>`
    select q.id, q.ref, q.amount_cents, q.price_type, q.status, q.created_at, j.id as job_id, j.title as job_title, j.region_name,
           (select count(*)::int from quotes o where o.job_id = j.id and o.id <> q.id and o.status <> 'withdrawn') as competitors
    from quotes q join jobs j on j.id = q.job_id where q.contractor_id = ${user.id} order by q.created_at desc`;
  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Offertes" title="Mijn offertes" description="Volg de status van je uitgebrachte offertes." />
      {quotes.length === 0 ? (
        <EmptyState title="Nog geen offertes" action={<Link href="/vakman" className="btn-primary">Bekijk klussen</Link>}>Bekijk de klussen in je regio en breng je eerste offerte uit.</EmptyState>
      ) : (
        <div className="card divide-y divide-navy-100">
          {quotes.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center gap-4 p-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <Link href={`/vakman/klussen/${q.job_id}`} className="font-medium text-navy-900 hover:text-leaf-800">{q.job_title}</Link>
                <p className="text-xs text-navy-400">{q.ref} · {q.region_name} · {relTime(q.created_at)} · {q.competitors} andere offerte{q.competitors === 1 ? '' : 's'}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-navy-900">{eur(q.amount_cents)}</p>
                <p className="text-xs text-navy-400">{PRICE_TYPE_LABEL[q.price_type]}</p>
              </div>
              <Badge tone={STATUS[q.status].tone}>{STATUS[q.status].label}</Badge>
              {q.status === 'submitted' && (
                <form action={withdrawQuoteAction}>
                  <input type="hidden" name="quoteId" value={q.id} />
                  <button className="btn-ghost px-2 py-1 text-xs">Intrekken</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
