import { describe, expect, it } from 'vitest';
import { parsePostcode, haversineKm } from '@/lib/geo';
import { isConfirmation, isCancel, parseBudget, parseTiming } from '@/lib/intake/fields';
import { screenMessage } from '@/lib/intake/safety';
import { mergeFacts } from '@/lib/intake/engine';
import { classifyCategory } from '@/lib/intake/providers/rules';
import { signPayload, verifySignature } from '@/lib/whatsapp/signature';
import { parseWebhook, buildInboundPayload } from '@/lib/whatsapp/payload';
import { sniffMime } from '@/lib/storage';
import type { CategoryOption } from '@/lib/intake/types';

const cats: CategoryOption[] = [
  { slug: 'schilderwerk', name: 'Schilderwerk', description: '', risk: 'normal' },
  { slug: 'tuinonderhoud', name: 'Tuinonderhoud', description: '', risk: 'normal' },
  { slug: 'loodgieter', name: 'Loodgieterswerk', description: '', risk: 'normal' },
  { slug: 'asbest', name: 'Asbest', description: '', risk: 'specialist' },
];

describe('postcodes & geo', () => {
  it('parses full and 4-digit postcodes', () => {
    expect(parsePostcode('3512 ab')).toMatchObject({ postcode4: '3512', postcodeFull: '3512 AB', region: 'Utrecht' });
    expect(parsePostcode('wij wonen in 1017')).toMatchObject({ postcode4: '1017', postcodeFull: null });
  });
  it('rejects invalid postcodes', () => {
    expect(parsePostcode('0123 AB')).toBeNull();
    expect(parsePostcode('1234 SS')).toBeNull();
    expect(parsePostcode('geen postcode')).toBeNull();
  });
  it('computes plausible distances', () => {
    const d = haversineKm(parsePostcode('1012')!, parsePostcode('3511')!);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(45);
  });
});

describe('intake field parsing', () => {
  it('parses budgets', () => {
    expect(parseBudget('max €1.500')).toBe(1500);
    expect(parseBudget('2k')).toBe(2000);
    expect(parseBudget('geen idee')).toBeNull();
    expect(parseBudget('blauw')).toBeUndefined();
  });
  it('parses timing', () => {
    expect(parseTiming('graag zo snel mogelijk')).toBe('spoed');
    expect(parseTiming('binnen een maand')).toBe('binnen_maand');
    expect(parseTiming('geen haast')).toBe('flexibel');
  });
  it('only accepts explicit confirmations', () => {
    expect(isConfirmation('Ja')).toBe(true);
    expect(isConfirmation('ja, plaats maar!')).toBe(true);
    expect(isConfirmation('ja maar het is 30 m2')).toBe(false);
    expect(isCancel('annuleer')).toBe(true);
  });
  it('classifies categories by keyword', () => {
    expect(classifyCategory('de heg moet gesnoeid worden', cats)?.slug).toBe('tuinonderhoud');
    expect(classifyCategory('eternit golfplaten op de schuur', cats)?.slug).toBe('asbest');
    expect(classifyCategory('de schutting moet geschilderd worden', cats)).toMatchObject({ slug: 'schilderwerk' });
    expect(classifyCategory('de schutting in de tuin moet geschilderd worden', cats)).toMatchObject({ slug: 'schilderwerk' });
    expect(classifyCategory('mijn tuin moet opgeruimd en het gras gemaaid', cats)?.slug).toBe('tuinonderhoud');
  });
});

describe('fact provenance', () => {
  it('never lets AI inferences overwrite customer statements', () => {
    const facts = { category: { value: 'schilderwerk', source: 'customer' as const } };
    const out = mergeFacts(facts, { category: { value: 'tuinonderhoud', source: 'ai_inferred' } }, cats, 0.95);
    expect(out.facts.category).toEqual({ value: 'schilderwerk', source: 'customer' });
  });
  it('drops low-confidence category guesses and invalid slugs', () => {
    expect(mergeFacts({}, { category: { value: 'tuinonderhoud', source: 'ai_inferred' } }, cats, 0.3).facts.category).toBeUndefined();
    expect(mergeFacts({}, { category: { value: 'raketbouw', source: 'customer' } }, cats, 1).facts.category).toBeUndefined();
  });
  it('validates postcodes and scrubs contact details', () => {
    const out = mergeFacts({}, { postcode: { value: '1234 SS', source: 'customer' }, problem: { value: 'Lekkage, bel 06-12345678 of mail a@b.nl', source: 'customer' } }, cats, null);
    expect(out.facts.postcode).toBeUndefined();
    expect(out.rejected).toContain('postcode');
    expect(out.facts.problem?.value).not.toMatch(/0612345678|06-12345678|a@b\.nl/);
  });
});

describe('safety screen', () => {
  it('flags danger and caution', () => {
    expect(screenMessage('Ik ruik gas in de keuken').level).toBe('danger');
    expect(screenMessage('vonken uit het stopcontact').level).toBe('danger');
    expect(screenMessage('asbest dak verwijderen').level).toBe('caution');
    expect(screenMessage('schutting schilderen').level).toBe('none');
  });
});

describe('whatsapp webhook primitives', () => {
  it('verifies HMAC signatures in constant time', () => {
    const body = JSON.stringify({ hello: 'world' });
    const sig = signPayload(body, 'secret-abc');
    expect(verifySignature(body, sig, 'secret-abc')).toBe(true);
    expect(verifySignature(body + ' ', sig, 'secret-abc')).toBe(false);
    expect(verifySignature(body, sig, 'other-secret')).toBe(false);
    expect(verifySignature(body, null, 'secret-abc')).toBe(false);
  });
  it('parses Meta payloads', () => {
    const p = parseWebhook(buildInboundPayload({ from: '+31612345678', id: 'wamid.1', text: 'Hoi', name: 'Piet' }));
    expect(p?.messages[0]).toMatchObject({ from: '31612345678', id: 'wamid.1', profileName: 'Piet' });
    expect(parseWebhook({ object: 'page' })).toBeNull();
  });
  it('sniffs real file types', () => {
    expect(sniffMime(Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'))).toBe('image/png');
    expect(sniffMime(Buffer.from('<html><body>not an image</body>'))).toBeNull();
  });
});
