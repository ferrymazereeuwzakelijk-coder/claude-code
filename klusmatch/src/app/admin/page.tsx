import Link from 'next/link';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { Badge, PageHeader, Stat, eur, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { resolveEscalationAction, setUserStatusAction } from '@/app/actions/admin';

export const metadata = { title: 'Beheer' };

export default async function AdminOverview() {
  const user = await requireRole('admin');
  const db = sql();
  const [k] = await db<{ customers: number; contractors: number; verified: number; pending: number; jobs_7d: number; open_jobs: number; quotes_7d: number; awarded: number; gmv: number | null; wa_contacts: number; opted_out: number }[]>`
    select
      (select count(*)::int from users where role = 'customer' and status = 'active') as customers,
      (select count(*)::int from contractor_profiles) as contractors,
      (select count(*)::int from contractor_profiles where verification = 'verified') as verified,
      (select count(*)::int from contractor_profiles where verification = 'pending') as pending,
      (select count(*)::int from jobs where published_at > now() - interval '7 days') as jobs_7d,
      (select count(*)::int from jobs where status = 'published') as open_jobs,
      (select count(*)::int from quotes where created_at > now() - interval '7 days') as quotes_7d,
      (select count(*)::int from jobs where status = 'awarded') as awarded,
      (select sum(q.amount_cents)::bigint from quotes q where q.status = 'accepted') as gmv,
      (select count(*)::int from wa_contacts) as wa_contacts,
      (select count(*)::int from wa_contacts where consent = 'opted_out') as opted_out`;
  const [funnel] = await db<{ started: number; to_confirm: number; published: number; escalated: number; via_wa: number }[]>`
    select count(*)::int as started,
           count(*) filter (where state in ('awaiting_confirmation','published'))::int as to_confirm,
           count(*) filter (where state = 'published')::int as published,
           count(*) filter (where state = 'escalated')::int as escalated,
           count(*) filter (where channel = 'whatsapp')::int as via_wa
    from intake_sessions where created_at > now() - interval '30 days'`;
  const escalations = await db<{ id: string; channel: string; escalation: { reason: string; level: string } | null; updated_at: Date; problem: string | null; phone: string | null; customer: string | null }[]>`
    select i.id, i.channel, i.escalation, i.updated_at, i.facts->'problem'->>'value' as problem, c.phone_e164 as phone, u.full_name as customer
    from intake_sessions i left join wa_contacts c on c.id = i.wa_contact_id left join users u on u.id = i.customer_id
    where i.state = 'escalated' order by i.updated_at desc limit 20`;
  // Simple abuse signals: many intakes or quotes in a short time, or many failed logins.
  const suspicious = await db<{ user_id: string | null; name: string | null; role: string | null; status: string | null; signal: string; n: number }[]>`
    select u.id as user_id, u.full_name as name, u.role::text, u.status::text, s.signal, s.n from (
      select customer_id as uid, 'Veel aanvragen (24u)' as signal, count(*)::int as n from intake_sessions
        where created_at > now() - interval '24 hours' and customer_id is not null group by customer_id having count(*) >= 8
      union all
      select contractor_id, 'Veel offertes (1u)', count(*)::int from quotes where created_at > now() - interval '1 hour' group by contractor_id having count(*) >= 15
      union all
      select actor_user_id, 'Veel berichten (1u)', count(*)::int from audit_log where action = 'message.sent' and created_at > now() - interval '1 hour' group by actor_user_id having count(*) >= 40
    ) s left join users u on u.id = s.uid order by s.n desc limit 20`;
  const [failedLogins] = await db<{ n: number }[]>`select count(*)::int as n from audit_log where action = 'auth.login_failed' and created_at > now() - interval '24 hours'`;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Beheer" title="Marktplaats in één oogopslag" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open klussen" value={k.open_jobs} hint={`${k.jobs_7d} geplaatst in 7 dagen`} />
        <Stat label="Offertes (7d)" value={k.quotes_7d} hint={`${k.awarded} klussen gegund`} />
        <Stat label="Vakmensen" value={k.contractors} hint={`${k.verified} geverifieerd · ${k.pending} wachtend`} />
        <Stat label="Geaccepteerd volume" value={eur(k.gmv ?? 0)} hint={`${k.customers} actieve klanten`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold text-navy-900">Intake-funnel (30 dagen)</h2>
          <div className="mt-5 space-y-3">
            {[
              ['Gestart', funnel.started, funnel.started],
              ['Concept bereikt', funnel.to_confirm, funnel.started],
              ['Bevestigd & geplaatst', funnel.published, funnel.started],
              ['Geëscaleerd', funnel.escalated, funnel.started],
            ].map(([label, n, total]) => (
              <div key={label as string}>
                <div className="flex justify-between text-sm"><span className="text-navy-600">{label}</span><span className="font-semibold text-navy-900">{n} <span className="font-normal text-navy-400">({pct(n as number, total as number)})</span></span></div>
                <div className="mt-1 h-2 rounded-full bg-navy-50"><div className="h-2 rounded-full bg-leaf-500" style={{ width: pct(n as number, total as number).replace('—', '0%') }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-navy-400">{funnel.via_wa} van {funnel.started} via WhatsApp · {k.wa_contacts} WhatsApp-contacten, {k.opted_out} afgemeld</p>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-navy-900">Verdachte activiteit</h2>
          <p className="mt-1 text-xs text-navy-400">{failedLogins.n} mislukte inlogpogingen in de afgelopen 24 uur.</p>
          {suspicious.length === 0 ? (
            <p className="mt-6 text-sm text-navy-400">Geen signalen.</p>
          ) : (
            <ul className="mt-4 divide-y divide-navy-100">
              {suspicious.map((s, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1"><p className="font-medium text-navy-900">{s.name ?? 'Onbekend'} <span className="text-xs text-navy-400">({s.role})</span></p><p className="text-xs text-navy-500">{s.signal}: {s.n}</p></div>
                  {s.user_id && s.role !== 'admin' && (
                    <form action={setUserStatusAction}>
                      <input type="hidden" name="userId" value={s.user_id} />
                      <input type="hidden" name="status" value={s.status === 'suspended' ? 'active' : 'suspended'} />
                      <button className={s.status === 'suspended' ? 'btn-secondary px-2.5 py-1 text-xs' : 'btn-danger px-2.5 py-1 text-xs'}>{s.status === 'suspended' ? 'Heractiveren' : 'Blokkeren'}</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Geëscaleerde aanvragen</h2>
          <Badge tone={escalations.length ? 'amber' : 'neutral'}>{escalations.length}</Badge>
        </div>
        <p className="mt-1 text-xs text-navy-400">Aanvragen met mogelijk gevaar of die menselijke opvolging nodig hebben. Neem contact op en markeer als afgehandeld.</p>
        {escalations.length === 0 ? <p className="mt-6 text-sm text-navy-400">Niets te doen.</p> : (
          <ul className="mt-4 divide-y divide-navy-100">
            {escalations.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <Badge tone={e.escalation?.level === 'danger' ? 'red' : 'amber'}>{e.escalation?.reason ?? 'Escalatie'}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-navy-900">{e.problem ?? '—'}</p>
                  <p className="text-xs text-navy-400">{e.customer ?? 'WhatsApp'} · {e.phone ?? 'web'} · {e.channel} · {relTime(e.updated_at)}</p>
                </div>
                <form action={resolveEscalationAction}>
                  <input type="hidden" name="intakeId" value={e.id} />
                  <button className="btn-secondary px-3 py-1.5 text-xs">Afgehandeld</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-6 text-sm text-navy-400">Zie ook <Link href="/admin/meldingen" className="font-medium text-navy-700 underline">meldingen & geschillen</Link> en <Link href="/admin/systeem" className="font-medium text-navy-700 underline">integraties & AI-gebruik</Link>.</p>
    </AppShell>
  );
}
