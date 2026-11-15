import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { env } from './env';
import { audit } from './audit';
import { UserFacingError } from './errors';

/**
 * Billing preparation (behind FEATURE_BILLING). Contractors subscribe via Stripe Checkout;
 * Stripe webhooks keep `subscriptions` in sync. Uses Stripe's REST API directly (no SDK) so the
 * webhook signature logic is fully unit-testable.
 */
export const PLANS = {
  starter: { name: 'Starter', priceLabel: '€ 29 / maand', features: ['Tot 15 offertes per maand', 'Meldingen van nieuwe klussen', 'Bedrijfsprofiel met reviews'] },
  pro: { name: 'Pro', priceLabel: '€ 79 / maand', features: ['Onbeperkt offertes', 'Voorrang in meldingen', 'Portfolio tot 12 foto’s', 'Prioriteitsondersteuning'] },
} as const;
export type PlanKey = keyof typeof PLANS;

export const billingEnabled = () => env().FEATURE_BILLING === true;

/** Verifies `Stripe-Signature: t=...,v1=...` (HMAC-SHA256 over `${t}.${payload}`), with replay tolerance. */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  const signatures = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || !signatures.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex'));
  return signatures.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), expected));
}

type StripeEvent = { id: string; type: string; data: { object: Record<string, any> } }; // eslint-disable-line @typescript-eslint/no-explicit-any

const STATUS_MAP: Record<string, string> = { trialing: 'trialing', active: 'active', past_due: 'past_due', unpaid: 'past_due', canceled: 'canceled', incomplete: 'incomplete', incomplete_expired: 'canceled' };

/** Idempotent: each Stripe event id is processed once. */
export async function handleStripeEvent(event: StripeEvent) {
  return sql().begin(async (tx) => {
    const fresh = await tx`insert into stripe_events (id, type) values (${event.id}, ${event.type}) on conflict do nothing returning id`;
    if (!fresh.length) return 'duplicate';
    const o = event.data.object;
    if (event.type === 'checkout.session.completed') {
      const contractorId = o.client_reference_id as string | undefined;
      const plan = o.metadata?.plan as PlanKey | undefined;
      if (!contractorId || !plan || !(plan in PLANS)) return 'ignored';
      await tx`
        insert into subscriptions (contractor_id, plan, status, stripe_customer_id, stripe_subscription_id)
        values (${contractorId}, ${plan}, 'active', ${o.customer ?? null}, ${o.subscription ?? null})
        on conflict (contractor_id) do update set plan = excluded.plan, status = 'active',
          stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id, updated_at = now()`;
      await audit(tx, { actorId: contractorId, action: 'billing.subscribed', entityType: 'subscription', entityId: contractorId, metadata: { plan } });
      return 'handled';
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const status = event.type.endsWith('deleted') ? 'canceled' : STATUS_MAP[o.status as string] ?? 'incomplete';
      const periodEnd = o.current_period_end ? new Date(Number(o.current_period_end) * 1000) : null;
      await tx`update subscriptions set status = ${status}, current_period_end = ${periodEnd}, updated_at = now() where stripe_subscription_id = ${o.id}`;
      return 'handled';
    }
    return 'ignored';
  });
}

/** Creates a Stripe Checkout session for a subscription. Requires Stripe credentials. */
export async function createCheckoutSession(contractorId: string, email: string | null, plan: PlanKey) {
  const e = env();
  if (!billingEnabled()) throw new UserFacingError('Abonnementen zijn nog niet beschikbaar.');
  const price = plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_STARTER;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !price) throw new UserFacingError('Betalingen zijn nog niet geconfigureerd.', 503);
  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: contractorId,
    'metadata[plan]': plan,
    'subscription_data[metadata][contractor_id]': contractorId,
    success_url: `${e.APP_BASE_URL}/vakman/abonnement?status=succes`,
    cancel_url: `${e.APP_BASE_URL}/vakman/abonnement?status=geannuleerd`,
    locale: 'nl',
  });
  if (email) body.set('customer_email', email);
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) throw new Error(`Stripe checkout failed: ${json.error?.message ?? res.status}`);
  return json.url;
}

export async function getSubscription(contractorId: string) {
  const [s] = await sql()<{ plan: PlanKey; status: string; current_period_end: Date | null }[]>`
    select plan, status, current_period_end from subscriptions where contractor_id = ${contractorId}`;
  return s ?? null;
}
