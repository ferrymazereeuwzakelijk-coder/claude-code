import { NextResponse } from 'next/server';
import { billingEnabled, handleStripeEvent, verifyStripeSignature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

/** Stripe webhook: signature-verified and idempotent (stripe_events). Disabled unless FEATURE_BILLING=true. */
export async function POST(req: Request) {
  if (!billingEnabled()) return new NextResponse('Not found', { status: 404 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse('Webhook secret not configured', { status: 503 });
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) return new NextResponse('Invalid signature', { status: 400 });
  try {
    const result = await handleStripeEvent(JSON.parse(raw));
    return NextResponse.json({ received: true, result });
  } catch (err) {
    console.error('[stripe-webhook]', err);
    return new NextResponse('Processing failed', { status: 500 }); // Stripe retries
  }
}
