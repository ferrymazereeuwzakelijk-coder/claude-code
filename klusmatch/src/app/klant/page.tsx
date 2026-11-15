import Link from 'next/link';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, EmptyState, JOB_STATUS, PageHeader, eur, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { WhatsAppLinkCard } from './whatsapp-link';

export const metadata = { title: 'Mijn klussen' };

export default async function CustomerDashboard() {
  const user = await requireRole('customer');
  const db = sql();
  const jobs = await db<{ id: string; ref: string; title: string; status: string; region_name: string; budget_max_cents: number | null; published_at: Date; quotes: number; category: string; best: number | null }[]>`
    select j.id, j.ref, j.title, j.status, j.region_name, j.budget_max_cents, j.published_at, c.name_nl as category,
           (select count(*)::int from quotes q where q.job_id = j.id and q.status in ('submitted','accepted')) as quotes,
           (select min(amount_cents) from quotes q where q.job_id = j.id and q.status in ('submitted','accepted')) as best
    from jobs j join categories c on c.slug = j.category_slug
    where j.customer_id = ${user.id} order by j.published_at desc`;
  const drafts = await db<{ id: string; state: string; updated_at: Date; problem: string | null; channel: string }[]>`
    select id, state, updated_at, facts->'problem'->>'value' as problem, channel from intake_sessions
    where customer_id = ${user.id} and state in ('collecting','awaiting_confirmation','escalated') order by updated_at desc limit 5`;
  const [wa] = await db<{ phone_e164: string }[]>`select phone_e164 from wa_contacts where user_id = ${user.id} and consent = 'granted'`;

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Klantomgeving"
        title={`Hallo ${user.fullName.split(' ')[0]}`}
        description="Hier volg je je klussen, vergelijk je offertes en kies je de vakman die bij je past."
        actions={<Link href="/klant/nieuw" className="btn-primary">+ Nieuwe klus</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {drafts.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-navy-500">Lopende aanvragen</h2>
              <div className="space-y-2">
                {drafts.map((d) => (
                  <Link key={d.id} href={d.channel === 'web' ? `/klant/nieuw?id=${d.id}` : '#'} className="card flex items-center gap-4 p-4 transition hover:shadow-lift">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${d.state === 'escalated' ? 'bg-amber-500' : 'bg-leaf-500 animate-pulse-dot'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-900">{d.problem ?? 'Nieuwe aanvraag'}</p>
                      <p className="text-xs text-navy-400">
                        {d.state === 'awaiting_confirmation' ? 'Wacht op jouw bevestiging' : d.state === 'escalated' ? 'Wordt bekeken door KlusMatch' : 'Nog niet afgerond'} · {d.channel === 'whatsapp' ? 'via WhatsApp' : 'via website'} · {relTime(d.updated_at)}
                      </p>
                    </div>
                    {d.channel === 'web' && <span className="text-sm font-semibold text-leaf-700">Verder →</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-navy-500">Mijn klussen</h2>
            {jobs.length === 0 ? (
              <EmptyState title="Nog geen klussen" action={<Link href="/klant/nieuw" className="btn-primary">Plaats je eerste klus</Link>}>
                Beschrijf je klus en stuur een foto. Binnen een paar minuten staat hij online.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {jobs.map((j) => (
                  <Link key={j.id} href={`/klant/klussen/${j.id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={JOB_STATUS[j.status]?.tone}>{JOB_STATUS[j.status]?.label ?? j.status}</Badge>
                      <span className="text-xs text-navy-400">{j.category} · {j.region_name} · {j.ref}</span>
                    </div>
                    <h3 className="mt-2 font-semibold text-navy-900 group-hover:text-leaf-800">{j.title}</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <span className="text-navy-500"><strong className="font-display text-lg text-navy-900">{j.quotes}</strong> offerte{j.quotes === 1 ? '' : 's'}</span>
                      {j.best != null && <span className="text-navy-500">Laagste: <strong className="text-navy-900">{eur(j.best)}</strong></span>}
                      <span className="text-navy-500">Budget: {j.budget_max_cents ? eur(j.budget_max_cents) : 'geen maximum'}</span>
                      <span className="ml-auto text-xs text-navy-400">{relTime(j.published_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <WhatsAppLinkCard linkedPhone={wa?.phone_e164 ?? null} />
        </aside>
      </div>
    </AppShell>
  );
}
