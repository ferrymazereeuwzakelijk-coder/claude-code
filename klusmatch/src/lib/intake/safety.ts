import type { SafetyAssessment } from './types';

/**
 * Deterministic safety screen that runs on every customer message, independent of the AI provider.
 * The AI can raise the level further, but never lower what these rules detect.
 */
const DANGER: { re: RegExp; reason: string; advice: string }[] = [
  {
    re: /\b(gaslucht|ruik(t)? (naar )?gas|gaslek|gas lek)\b/i,
    reason: 'Mogelijk gaslek',
    advice:
      'Ruik je gas? Verlaat de woning, gebruik geen schakelaars of open vuur, en bel direct het landelijk storingsnummer 0800-9009. Bij direct gevaar: bel 112.',
  },
  {
    re: /\b(koolmonoxide|co[- ]?melder (gaat|piept|alarm))\b/i,
    reason: 'Mogelijke koolmonoxide',
    advice: 'Bij een afgaande CO-melder: zet ramen open, verlaat de woning en bel 112.',
  },
  {
    re: /\b(vonken|rook uit (het )?stopcontact|brandlucht (bij|uit) (de )?(meterkast|groepenkast|stopcontact)|elektrische brand|kabel (smelt|brandt))\b/i,
    reason: 'Acuut elektrisch gevaar',
    advice: 'Schakel indien veilig de hoofdschakelaar in de meterkast uit en raak niets aan. Bij brand of rook: bel 112.',
  },
  {
    re: /\b(instortingsgevaar|stort in|scheur(en)? in (de )?draagmuur|plafond (komt|zakt) naar beneden|verzakt plafond)\b/i,
    reason: 'Mogelijk constructief gevaar',
    advice: 'Blijf uit de buurt van het betreffende deel van de woning. Bij acuut gevaar: bel 112. Laat dit beoordelen door een constructeur.',
  },
];

const CAUTION: { re: RegExp; reason: string }[] = [
  { re: /\basbest\b|\beternit\b|golfplaten (dak|schuur)/i, reason: 'Mogelijk asbest — alleen gecertificeerde sanering (SC-530) toegestaan' },
  { re: /\b(groepenkast|meterkast|hoofdzekering)\b/i, reason: 'Werk aan de groepenkast vereist een erkend installateur' },
  { re: /\b(dak|nok|schoorsteen)\b.*\b(hoog|steiger|3 verdiepingen|hoogwerker)\b/i, reason: 'Werken op hoogte' },
];

export type SafetyResult = SafetyAssessment & { advice: string | null };

export function screenMessage(text: string): SafetyResult {
  for (const d of DANGER) if (d.re.test(text)) return { level: 'danger', reason: d.reason, advice: d.advice };
  for (const c of CAUTION) if (c.re.test(text)) return { level: 'caution', reason: c.reason, advice: null };
  return { level: 'none', reason: null, advice: null };
}

const RANK = { none: 0, caution: 1, danger: 2 } as const;
export function maxSafety(a: SafetyResult, b: SafetyAssessment): SafetyResult {
  if (RANK[b.level] > RANK[a.level]) {
    return {
      level: b.level,
      reason: b.reason,
      advice: b.level === 'danger' ? 'Dit klinkt mogelijk gevaarlijk. Bij acuut gevaar: bel 112. Een medewerker van KlusMatch bekijkt je aanvraag.' : null,
    };
  }
  return a;
}
