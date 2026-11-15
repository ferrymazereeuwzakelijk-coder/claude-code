import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { AppShell } from '@/components/app-shell';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Notice, PageHeader } from '@/components/ui';
import { billingEnabled, getSubscription, PLANS, type PlanKey } from '@/lib/billing';
import { checkoutAction } from '@/app/actions/contractor';

export const metadata = { title: 'Abonnement' };
// The billing flag is read at request time, so this page must never be pre-rendered.
export const dynamic = 'force-dynamic';

/** Only reachable when FEATURE_BILLING=true. */
export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!billingEnabled()) notFound();
  const user = await requireRole('contractor');
  const sub = await getSubscription(user.id);
  const { status } = await searchParams;
  const active = sub && ['active', 'trialing'].includes(sub.status);
  return (
    <AppShell user={user}>
      <PageHeader eyebrow="Abonnement" title="Kies je abonnement" description="Maandelijks opzegbaar. Prijzen exclusief btw." />
      {status === 'succes' && <div className="mb-6"><Notice tone="green">Betaling ontvangen. Je abonnement wordt geactiveerd zodra Stripe dit bevestigt (meestal binnen een minuut).</Notice></div>}
      {status === 'geannuleerd' && <div className="mb-6"><Notice>Betaling afgebroken. Er is niets in rekening gebracht.</Notice></div>}
      {sub && (
        <div className="mb-6">
          <Notice tone={active ? 'green' : 'amber'} title={`Huidig abonnement: ${PLANS[sub.plan].name}`}>
            Status: {sub.status}
            {sub.current_period_end && ` · loopt tot ${new Date(sub.current_period_end).toLocaleDateString('nl-NL')}`}
          </Notice>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {(Object.keys(PLANS) as PlanKey[]).map((key) => {
          const plan = PLANS[key];
          const current = active && sub?.plan === key;
          return (
            <div key={key} className={`card flex flex-col p-6 ${key === 'pro' ? 'ring-2 ring-leaf-500' : ''}`}>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-navy-900">{plan.name}</h2>
                {key === 'pro' && <Badge tone="green">Meest gekozen</Badge>}
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-navy-900">{plan.priceLabel}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-navy-600">
                {plan.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <ActionForm action={checkoutAction} className="mt-6">
                <input type="hidden" name="plan" value={key} />
                <SubmitButton className={current ? 'btn-secondary w-full' : 'btn-primary w-full'} pendingText="Doorsturen naar Stripe…">{current ? 'Huidig abonnement' : `Kies ${plan.name}`}</SubmitButton>
              </ActionForm>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
