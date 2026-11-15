import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, PageHeader, Stat, relTime } from '@/components/ui';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { getMatchingRules } from '@/lib/jobs/matching';
import { retryJobAction, toggleCategoryAction, updateMatchingRulesAction } from '@/app/actions/admin';

export const metadata = { title: 'Systeem' };

export default async function AdminSystem() {
  const user = await requireRole('admin');
  const db = sql();
  const e = env();
  const rules = await getMatchingRules(db);
  const [ai] = await db<{ calls: number; failures: number; tokens_in: number | null; tokens_out: number | null; p50: number | null }[]>`
    select count(*)::int as calls, count(*) filter (where not success)::int as failures,
           sum(input_tokens)::int as tokens_in, sum(output_tokens)::int as tokens_out,
           percentile_cont(0.5) within group (order by latency_ms)::int as p50
    from ai_usage where created_at > now() - interval '7 days'`;
  const aiErrors = await db<{ id: string; provider: string; operation: string; error: string; created_at: Date }[]>`
    select id, provider, operation, error, created_at from ai_usage where not success order by created_at desc limit 8`;
  const failed = await db<{ id: string; kind: string; attempts: number; last_error: string | null; created_at: Date }[]>`
    select id, kind, attempts, last_error, created_at from background_jobs where status = 'failed' order by created_at desc limit 20`;
  const [queue] = await db<{ pending: number; running: number; retrying: number }[]>`
    select count(*) filter (where status = 'pending' and attempts = 0)::int as pending, count(*) filter (where status = 'running')::int as running,
           count(*) filter (where status = 'pending' and attempts > 0)::int as retrying from background_jobs`;
  const [wa] = await db<{ inbound: number; failed_in: number; outbound: number; failed_out: number }[]>`
    select (select count(*)::int from wa_inbound_events where received_at > now() - interval '7 days') as inbound,
           (select count(*)::int from wa_inbound_events where error is not null and status <> 'processed') as failed_in,
           (select count(*)::int from wa_outbound_messages where created_at > now() - interval '7 days') as outbound,
           (select count(*)::int from wa_outbound_messages where status = 'failed' or error is not null) as failed_out`;
  const categories = await db<{ slug: string; name_nl: string; active: boolean; risk: string; jobs: number; contractors: number }[]>`
    select c.slug, c.name_nl, c.active, c.risk, (select count(*)::int from jobs j where j.category_slug = c.slug) as jobs,
           (select count(*)::int from contractor_categories cc where cc.category_slug = c.slug) as contractors
    from categories c order by c.sort_order`;
  const auditRows = await db<{ id: string; action: string; entity_type: string; entity_id: string | null; actor: string | null; created_at: Date }[]>`
    select a.id, a.action, a.entity_type, a.entity_id, u.full_name as actor, a.created_at from audit_log a left join users u on u.id = a.actor_user_id
    order by a.id desc limit 25`;

  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Beheer" title="Systeem, AI & integraties" />
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Badge tone={e.ANTHROPIC_API_KEY || e.AI_PROVIDER === 'anthropic' ? 'green' : 'amber'}>AI: {e.ANTHROPIC_API_KEY || e.AI_PROVIDER === 'anthropic' ? `Claude (${e.AI_MODEL})` : 'regelgebaseerd — geen API-sleutel'}</Badge>
        <Badge tone={e.WHATSAPP_MODE === 'cloud_api' ? 'green' : 'amber'}>WhatsApp: {e.WHATSAPP_MODE === 'cloud_api' ? 'Cloud API' : 'simulator'}</Badge>
        <Badge tone="neutral">Opslag: {e.STORAGE_DRIVER}</Badge>
        <Badge tone="neutral">Billing: {e.FEATURE_BILLING ? 'aan' : 'uit (feature flag)'}</Badge>
        <Badge tone="neutral">Worker: {e.INLINE_WORKER ? 'inline (dev)' : 'los proces'}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="AI-calls (7d)" value={ai.calls} hint={`${ai.failures} mislukt · mediaan ${ai.p50 ?? 0} ms`} />
        <Stat label="AI-tokens (7d)" value={`${((ai.tokens_in ?? 0) + (ai.tokens_out ?? 0)).toLocaleString('nl-NL')}`} hint={`${ai.tokens_in ?? 0} in / ${ai.tokens_out ?? 0} uit`} />
        <Stat label="WhatsApp (7d)" value={`${wa.inbound} / ${wa.outbound}`} hint={`in / uit · ${wa.failed_in + wa.failed_out} fouten`} />
        <Stat label="Wachtrij" value={queue.pending + queue.running} hint={`${queue.retrying} in retry · ${failed.length} mislukt`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold text-navy-900">Matchingregels</h2>
          <ActionForm action={updateMatchingRulesAction} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="maxContractors">Max. vakmensen per klus</label><input className="input" id="maxContractors" name="maxContractors" type="number" min={1} max={100} defaultValue={rules.max_contractors_per_job} /></div>
              <div><label className="label" htmlFor="maxPerDay">Max. meldingen per vakman/dag</label><input className="input" id="maxPerDay" name="maxPerDay" type="number" min={1} max={200} defaultValue={rules.max_new_job_notifications_per_day} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-navy-800"><input type="checkbox" name="requireVerified" defaultChecked={rules.require_verified} className="accent-leaf-600" /> Alleen geverifieerde vakmensen matchen</label>
            <SubmitButton className="btn-dark">Opslaan</SubmitButton>
          </ActionForm>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-navy-900">Categorieën</h2>
          <ul className="mt-3 divide-y divide-navy-100 text-sm">
            {categories.map((c) => (
              <li key={c.slug} className="flex items-center gap-3 py-2">
                <span className={`flex-1 ${c.active ? 'text-navy-900' : 'text-navy-300 line-through'}`}>{c.name_nl}</span>
                {c.risk !== 'normal' && <Badge tone="amber">{c.risk}</Badge>}
                <span className="text-xs text-navy-400">{c.contractors} vakm. · {c.jobs} klussen</span>
                <form action={toggleCategoryAction}><input type="hidden" name="slug" value={c.slug} /><button className="btn-ghost px-2 py-1 text-xs">{c.active ? 'Uitzetten' : 'Aanzetten'}</button></form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-navy-900">Mislukte achtergrondtaken</h2>
          {failed.length === 0 ? <p className="mt-4 text-sm text-navy-400">Geen mislukte taken.</p> : (
            <ul className="mt-3 divide-y divide-navy-100 text-sm">
              {failed.map((f) => (
                <li key={f.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1"><p className="font-mono text-xs text-navy-900">{f.kind} #{f.id}</p><p className="truncate text-xs text-red-700">{f.last_error}</p><p className="text-xs text-navy-400">{f.attempts} pogingen · {relTime(f.created_at)}</p></div>
                  <form action={retryJobAction}><input type="hidden" name="id" value={f.id} /><button className="btn-secondary px-2.5 py-1 text-xs">Opnieuw</button></form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-navy-900">Recente AI-fouten</h2>
          {aiErrors.length === 0 ? <p className="mt-4 text-sm text-navy-400">Geen fouten. Bij een AI-fout valt de intake automatisch terug op de regelgebaseerde provider.</p> : (
            <ul className="mt-3 space-y-2 text-xs">
              {aiErrors.map((a) => <li key={a.id} className="rounded-lg bg-red-50 p-2.5 text-red-800"><span className="font-semibold">{a.provider}/{a.operation}</span> · {relTime(a.created_at)}<br />{a.error}</li>)}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <h2 className="px-6 pt-6 font-semibold text-navy-900">Auditlog</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-50 text-navy-500"><tr><th className="px-6 py-2 font-medium">Tijd</th><th className="py-2 font-medium">Actie</th><th className="py-2 font-medium">Object</th><th className="px-6 py-2 font-medium">Door</th></tr></thead>
            <tbody className="divide-y divide-navy-100">
              {auditRows.map((a) => (
                <tr key={a.id}><td className="whitespace-nowrap px-6 py-2 text-navy-400">{relTime(a.created_at)}</td><td className="py-2 font-mono text-navy-900">{a.action}</td><td className="py-2 text-navy-500">{a.entity_type} {a.entity_id?.slice(0, 8)}</td><td className="px-6 py-2 text-navy-500">{a.actor ?? 'systeem'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
