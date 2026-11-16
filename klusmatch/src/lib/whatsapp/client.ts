import { env } from '../env';
import { sql } from '../db';
import { storage } from '../storage';
import type { TemplateName } from './templates';
import { TEMPLATES } from './templates';

export interface WhatsAppTransport {
  readonly name: 'cloud_api' | 'simulator';
  sendText(toE164: string, body: string): Promise<{ providerMessageId: string }>;
  sendTemplate(toE164: string, name: TemplateName, params: string[]): Promise<{ providerMessageId: string }>;
  downloadMedia(mediaId: string): Promise<Buffer>;
}

class TransientError extends Error {}

/** Official WhatsApp Business Cloud API (Graph API). Requires approved number + access token. */
class CloudApiTransport implements WhatsAppTransport {
  readonly name = 'cloud_api' as const;
  private base: string;
  constructor(private token: string, private phoneNumberId: string, version: string) {
    this.base = `https://graph.facebook.com/${version}`;
  }
  private async post(body: unknown) {
    const res = await fetch(`${this.base}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (!res.ok) {
      const msg = `Graph API ${res.status}: ${json.error?.message ?? 'unknown error'}`;
      // 429 / 5xx are retryable; 4xx (bad template, invalid number) are not.
      if (res.status === 429 || res.status >= 500) throw new TransientError(msg);
      throw new Error(msg);
    }
    return { providerMessageId: json.messages?.[0]?.id ?? '' };
  }
  sendText(to: string, body: string) {
    return this.post({ messaging_product: 'whatsapp', to: to.replace('+', ''), type: 'text', text: { body, preview_url: false } });
  }
  sendTemplate(to: string, name: TemplateName, params: string[]) {
    return this.post({
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'template',
      template: {
        name,
        language: { code: TEMPLATES[name].language },
        components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: p })) }],
      },
    });
  }
  async downloadMedia(mediaId: string) {
    const meta = await fetch(`${this.base}/${mediaId}`, { headers: { Authorization: `Bearer ${this.token}` } });
    if (!meta.ok) throw new TransientError(`Media lookup failed: ${meta.status}`);
    const { url } = (await meta.json()) as { url: string };
    const file = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
    if (!file.ok) throw new TransientError(`Media download failed: ${file.status}`);
    return Buffer.from(await file.arrayBuffer());
  }
}

/** Local stand-in: messages are stored in wa_outbound_messages and shown in /dev/whatsapp. */
class SimulatorTransport implements WhatsAppTransport {
  readonly name = 'simulator' as const;
  async sendText() {
    return { providerMessageId: `sim.out.${crypto.randomUUID()}` };
  }
  async sendTemplate() {
    return { providerMessageId: `sim.out.${crypto.randomUUID()}` };
  }
  async downloadMedia(mediaId: string) {
    const [row] = await sql()<{ storage_key: string }[]>`select storage_key from wa_simulator_media where id = ${mediaId}`;
    if (!row) throw new Error(`Unknown simulator media ${mediaId}`);
    return storage().get(row.storage_key);
  }
}

let transport: WhatsAppTransport | undefined;
const simulator = new SimulatorTransport();

/** Transport for a conversation: simulated conversations never leave the simulator. */
export function transportFor(simulated: boolean): WhatsAppTransport {
  return simulated ? simulator : waTransport();
}

/** Simulator-generated ids (signed server-side by the simulator route). */
export const isSimulatedMessageId = (id: string) => id.startsWith('wamid.sim.');

export function resetTransport() {
  transport = undefined;
}

export function waTransport(): WhatsAppTransport {
  if (transport) return transport;
  const e = env();
  if (e.WHATSAPP_MODE === 'cloud_api') {
    if (!e.WHATSAPP_ACCESS_TOKEN || !e.WHATSAPP_PHONE_NUMBER_ID) throw new Error('WHATSAPP_MODE=cloud_api requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
    transport = new CloudApiTransport(e.WHATSAPP_ACCESS_TOKEN, e.WHATSAPP_PHONE_NUMBER_ID, e.WHATSAPP_GRAPH_VERSION);
  } else {
    transport = new SimulatorTransport();
  }
  return transport;
}
