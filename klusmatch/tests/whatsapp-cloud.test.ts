import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDb, sql } from '@/lib/db';
import { resetEnvCache } from '@/lib/env';
import { resetTransport } from '@/lib/whatsapp/client';
import { ingestWebhook } from '@/lib/whatsapp/webhook';
import { buildInboundPayload } from '@/lib/whatsapp/payload';
import { signPayload } from '@/lib/whatsapp/signature';
import { drainQueue, resetDb } from './helpers';

/** Real Cloud API mode, with Meta's Graph API intercepted at the network boundary. */
const graphCalls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];

beforeEach(async () => {
  await resetDb();
  graphCalls.length = 0;
  vi.stubEnv('WHATSAPP_MODE', 'cloud_api');
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-graph-token');
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123456789012345');
  resetEnvCache();
  resetTransport();
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    graphCalls.push({ url, body: JSON.parse(String(init?.body ?? '{}')), auth: new Headers(init?.headers).get('authorization') });
    return new Response(JSON.stringify({ messages: [{ id: `wamid.out.${graphCalls.length}` }] }), { status: 200 });
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetEnvCache();
  resetTransport();
});
afterAll(() => closeDb());

async function deliver(from: string, id: string, text: string) {
  const body = JSON.stringify(buildInboundPayload({ from, id, text, name: 'Klant' }));
  expect((await ingestWebhook(body, signPayload(body, 'test-app-secret-123'))).status).toBe(200);
  await drainQueue();
}

describe('WhatsApp Cloud API mode', () => {
  it('sends replies to real numbers through the Graph API', async () => {
    await deliver('+31687654321', 'wamid.HBgLMzE2ODc2NTQzMjE', 'Hallo, mijn dakgoot lekt');
    expect(graphCalls).toHaveLength(1);
    const call = graphCalls[0];
    expect(call.url).toBe('https://graph.facebook.com/v21.0/123456789012345/messages');
    expect(call.auth).toBe('Bearer test-graph-token');
    expect(call.body).toMatchObject({ messaging_product: 'whatsapp', to: '31687654321', type: 'text' });
    expect(String((call.body.text as { body: string }).body)).toContain('Antwoord *JA*');
    const [o] = await sql()`select transport, status, provider_message_id from wa_outbound_messages`;
    expect(o).toMatchObject({ transport: 'cloud_api', status: 'sent', provider_message_id: 'wamid.out.1' });
  });

  it('keeps simulator conversations local on the same deployment', async () => {
    await deliver('+31611111111', 'wamid.sim.7d1f2c9e-1111-4c4c-9a9a-123456789abc', 'Hallo vanuit de simulator');
    expect(graphCalls).toHaveLength(0);
    const [o] = await sql()`select transport, status from wa_outbound_messages`;
    expect(o).toMatchObject({ transport: 'simulator', status: 'sent' });
    const [c] = await sql()`select simulated from wa_contacts`;
    expect(c.simulated).toBe(true);
  });

  it('retries when Meta is temporarily unavailable', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { message: 'Service unavailable' } }), { status: 503 }));
    await deliver('+31687654321', 'wamid.HBgLretry', 'Hallo');
    const [o] = await sql()`select status, error from wa_outbound_messages`;
    expect(o.status).toBe('queued');
    expect(o.error).toMatch(/503/);
    const [j] = await sql()`select status, attempts from background_jobs where kind = 'wa.send'`;
    expect(j).toMatchObject({ status: 'pending', attempts: 1 }); // scheduled for retry with backoff
  });
});
