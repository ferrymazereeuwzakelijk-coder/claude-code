import { z } from 'zod';

/** Subset of the WhatsApp Cloud API webhook payload we act on. Unknown fields are ignored. */
const Message = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  image: z.object({ id: z.string(), mime_type: z.string().optional(), caption: z.string().optional() }).optional(),
  video: z.object({ id: z.string(), mime_type: z.string().optional(), caption: z.string().optional() }).optional(),
  button: z.object({ text: z.string(), payload: z.string().optional() }).optional(),
  interactive: z
    .object({
      button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    })
    .optional(),
});

const Status = z.object({ id: z.string(), status: z.string(), recipient_id: z.string().optional(), errors: z.array(z.any()).optional() });

const Payload = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).optional() })).optional(),
            messages: z.array(Message).optional(),
            statuses: z.array(Status).optional(),
          }),
        }),
      ),
    }),
  ),
});

export type InboundMessage = z.infer<typeof Message> & { profileName?: string };
export type StatusUpdate = z.infer<typeof Status>;

export function parseWebhook(body: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } | null {
  const parsed = Payload.safeParse(body);
  if (!parsed.success) return null;
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;
      const names = new Map(change.value.contacts?.map((c) => [c.wa_id, c.profile?.name]) ?? []);
      for (const m of change.value.messages ?? []) messages.push({ ...m, profileName: names.get(m.from) ?? undefined });
      statuses.push(...(change.value.statuses ?? []));
    }
  }
  return { messages, statuses };
}

/** Wa ids are digits without "+"; we store E.164 with "+". */
export const toE164 = (waId: string) => (waId.startsWith('+') ? waId : `+${waId}`);

export function messageText(m: InboundMessage): string {
  return (m.text?.body ?? m.image?.caption ?? m.video?.caption ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '').trim();
}

/** Builds a payload in Meta's exact shape — used by the simulator and tests. */
export function buildInboundPayload(opts: { from: string; name?: string; id: string; text?: string; imageId?: string; mimeType?: string }) {
  const waId = opts.from.replace(/^\+/, '');
  const message: Record<string, unknown> = { from: waId, id: opts.id, timestamp: String(Math.floor(Date.now() / 1000)) };
  if (opts.imageId) Object.assign(message, { type: 'image', image: { id: opts.imageId, mime_type: opts.mimeType ?? 'image/jpeg', caption: opts.text || undefined } });
  else Object.assign(message, { type: 'text', text: { body: opts.text ?? '' } });
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'SIMULATED_WABA_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '31850000000', phone_number_id: 'SIMULATED' },
              contacts: [{ wa_id: waId, profile: { name: opts.name ?? 'Simulator' } }],
              messages: [message],
            },
          },
        ],
      },
    ],
  };
}
