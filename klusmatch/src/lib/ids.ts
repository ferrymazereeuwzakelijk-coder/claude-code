import { randomBytes } from 'node:crypto';

// Crockford-ish alphabet without ambiguous characters (0/O, 1/I/L).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function shortCode(length = 5): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const jobRef = () => `KM-${shortCode(5)}`;
export const quoteRef = () => `Q${shortCode(5)}`;
