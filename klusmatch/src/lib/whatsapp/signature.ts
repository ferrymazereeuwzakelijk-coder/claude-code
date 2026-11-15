import { createHmac, timingSafeEqual } from 'node:crypto';

/** Meta signs webhook bodies with HMAC-SHA256 of the raw body using the app secret: `X-Hub-Signature-256: sha256=<hex>`. */
export function signPayload(rawBody: string, appSecret: string): string {
  return 'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
}

export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from(signPayload(rawBody, appSecret));
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
