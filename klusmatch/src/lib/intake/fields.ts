import { parsePostcode } from '../geo';
import type { FieldKey, IntakeFacts, TimingValue } from './types';
import { REQUIRED_FIELDS } from './types';

export const TIMING_LABELS: Record<TimingValue, string> = {
  spoed: 'Zo snel mogelijk (spoed)',
  binnen_2_weken: 'Binnen 2 weken',
  binnen_maand: 'Binnen een maand',
  flexibel: 'Flexibel / in overleg',
};

/** Canonical Dutch follow-up questions — used when the provider does not supply a better one. */
export const QUESTIONS: Record<FieldKey, string> = {
  category: 'Wat voor soort klus is het? Bijvoorbeeld schilderwerk, tuinonderhoud, bestrating of loodgieterswerk.',
  problem: 'Kun je in een paar zinnen beschrijven wat er moet gebeuren?',
  postcode: 'Wat is de postcode van de locatie? (bijv. 3512 AB) Je volledige adres wordt nooit openbaar getoond.',
  scope: 'Hoe groot is de klus ongeveer? Denk aan aantal m², aantal kamers of meters. Een schatting is prima.',
  timing: 'Wanneer moet de klus gebeuren? Spoed, binnen 2 weken, binnen een maand of flexibel?',
  budget: 'Heb je een maximaal budget in gedachten? Noem een bedrag in euro’s, of zeg "geen idee".',
};

/** Deterministic fallback when the customer could not answer the category question in words. */
export function categoryMenu(categories: { name: string }[]) {
  return ['Kies het soort klus door het nummer te sturen:', ...categories.map((c, i) => `${i + 1}. ${c.name}`)].join('\n');
}

export function missingFields(facts: IntakeFacts): FieldKey[] {
  return REQUIRED_FIELDS.filter((f) => facts[f] === undefined);
}

export function parseTiming(text: string): TimingValue | null {
  const t = text.toLowerCase();
  if (/\b(spoed|direct|vandaag|morgen|zsm|zo snel mogelijk|met spoed|asap|urgent|nood)\b/.test(t)) return 'spoed';
  if (/\b(deze week|volgende week|binnen (1|een|twee|2) weken?|2 weken|twee weken)\b/.test(t)) return 'binnen_2_weken';
  if (/\b(deze maand|volgende maand|binnen (een|1) maand|maand|paar weken|3 weken|drie weken)\b/.test(t)) return 'binnen_maand';
  if (/\b(flexibel|geen haast|maakt niet uit|in overleg|maakt me niet uit|wanneer het uitkomt)\b/.test(t)) return 'flexibel';
  return null;
}

/** Returns a positive euro amount, null for "no budget", or undefined when unparseable. */
export function parseBudget(text: string): number | null | undefined {
  const t = text.toLowerCase().replace(/\s/g, ' ');
  if (/\b(geen idee|weet (ik )?niet|geen budget|geen maximum|nvt|n\.v\.t\.|onbekend)\b/.test(t)) return null;
  const m = t.match(/(?:€|eur(?:o)?\s*)?\s*(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,\d{1,2})?\s*(k\b|duizend)?/);
  if (!m) return undefined;
  let n = Number(m[1].replace(/[.\s]/g, ''));
  if (m[2]) n *= 1000;
  if (!Number.isFinite(n) || n < 25 || n > 500_000) return undefined;
  return Math.round(n);
}

export function normalisePostcode(text: string): string | null {
  const info = parsePostcode(text);
  return info ? info.postcodeFull ?? info.postcode4 : null;
}

export function formatEuro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

/** Detects explicit publish confirmation. Deliberately strict: anything else counts as a correction. */
export function isConfirmation(text: string): boolean {
  return /^\s*(ja|jazeker|ja graag|ja,? plaats( maar| hem| de klus)?|bevestig(en)?|akkoord|plaatsen|publiceer|klopt,? plaats(en)?|yes)\s*[.!]*\s*$/i.test(text);
}

export function isCancel(text: string): boolean {
  return /^\s*(annuleer|annuleren|stop de aanvraag|afbreken|laat maar|cancel)\s*[.!]*\s*$/i.test(text);
}
