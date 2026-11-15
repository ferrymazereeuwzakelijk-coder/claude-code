import { parsePostcode } from '../../geo';
import { formatEuro, normalisePostcode, parseBudget, parseTiming, TIMING_LABELS } from '../fields';
import type { CategoryOption, FieldKey, IntakeFacts, IntakeProvider, JobDraft, TurnAnalysis, TurnInput } from '../types';

/**
 * Deterministic, offline intake provider. Used when no AI credentials are configured
 * (and as a fallback when the AI call fails). It cannot analyse photos — the UI says so.
 */
// strong = the kind of work (verbs, trades); weak = objects that several trades work on.
const CATEGORY_KEYWORDS: Record<string, { strong: RegExp; weak?: RegExp }> = {
  schilderwerk: { strong: /schilder|\bverf|\bverven|\blak(ken)?\b|gelakt|\bbeits|houtrot|bladder/i },
  tuinonderhoud: { strong: /\btuin|gazon|\bheg\b|\bhaag|snoei|onkruid|\bmaai|verticuter/i, weak: /\bgras|\bboom|\bbomen|struik/i },
  bestrating: { strong: /bestrating|\bbestraten|klinkers?|straatwerk|\boprit|\bterras\b/i, weak: /\btegels?\b|\bgrind/i },
  loodgieter: { strong: /lekkage|\bkraan|\bafvoer|verstop|\briool|\bsifon|loodgieter/i, weak: /\blekt\b|\blekken\b|\btoilet|\bwc\b|\bleiding/i },
  elektra: { strong: /stopcontact|elektra|groepenkast|bedrading|laadpaal|elektricien/i, weak: /\blamp|verlichting|schakelaar|meterkast/i },
  dakwerk: { strong: /dakpan|dakgoot|bitumen|dakbedekking|dakdekker|loodslab/i, weak: /\bdak\b|\bgoot\b|schoorsteen/i },
  timmerwerk: { strong: /timmer|laminaat|vlonder|kast op maat|\bmonteren\b/i, weak: /schutting|\bdeur|kozijn|\bvloer|\btrap\b/i },
  stukadoor: { strong: /\bstuc|stukad|pleister|\bsauzen|spachtel/i, weak: /\bmuren?\b|plafond/i },
  badkamer: { strong: /badkamer|\bdouche|\bligbad|wastafel/i },
  cv_installatie: { strong: /\bcv\b|cv-ketel|\bketel|radiator|warmtepomp|thermostaat|verwarming/i },
  schoonmaak: { strong: /schoonma|glazenwasser|ramen wassen|opleveringsschoonmaak/i },
  asbest: { strong: /asbest|eternit/i },
};

export function classifyCategory(text: string, categories: CategoryOption[]): { slug: string; confidence: number; runnerUp?: string } | null {
  const active = new Set(categories.map((c) => c.slug));
  // Customer typed a category name directly.
  const byName = categories.find((c) => text.toLowerCase().includes(c.name.toLowerCase()));
  if (byName) return { slug: byName.slug, confidence: 0.9 };
  const scored = Object.entries(CATEGORY_KEYWORDS)
    .filter(([slug]) => active.has(slug))
    .map(([slug, k]) => ({ slug, score: (k.strong.test(text) ? 2 : 0) + (k.weak?.test(text) ? 1 : 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  if (scored.some((s) => s.slug === 'asbest')) return { slug: 'asbest', confidence: 0.8 };
  const [top, second] = scored;
  if (!second) return { slug: top.slug, confidence: top.score >= 2 ? 0.75 : 0.55 };
  return { slug: top.slug, confidence: top.score > second.score ? 0.65 : 0.4, runnerUp: second.slug };
}

const SCOPE_RE = /(\d+(?:[.,]\d+)?)\s*(m2|m²|vierkante meter|meter|m1|strekkende meter|kamers?|ramen|deuren|kozijnen|bomen|radiatoren|stuks?)/i;

export class RulesProvider implements IntakeProvider {
  readonly name = 'rules' as const;
  readonly canSeeImages = false;

  async analyzeTurn(input: TurnInput) {
    const { message, pendingField, facts, categories } = input;
    const updates: TurnAnalysis['updates'] = {};
    let categoryConfidence: number | null = null;

    const pc = normalisePostcode(message);
    if (pc) updates.postcode = { value: pc, source: 'customer' };

    const timing = parseTiming(message);
    if (timing) updates.timing = { value: timing, source: 'customer' };

    if (pendingField === 'budget' || /€|\beuro\b|\bbudget\b/i.test(message)) {
      const budget = parseBudget(message);
      if (budget !== undefined) updates.budget = { value: budget, source: 'customer' };
    }

    // A direct answer to the scope question keeps the customer's own wording; otherwise extract a quantity.
    const scope = message.match(SCOPE_RE);
    if (pendingField === 'scope' && !updates.postcode) updates.scope = { value: message.trim(), source: 'customer' };
    else if (scope) updates.scope = { value: scope[0], source: 'customer' };

    if (pendingField === 'category' || !facts.category || facts.category.source === 'ai_inferred') {
      const cat = classifyCategory(message, categories);
      if (cat) {
        // If the customer is answering the category question directly, it is their statement.
        const direct = pendingField === 'category' && cat.confidence >= 0.7;
        updates.category = { value: cat.slug, source: direct ? 'customer' : 'ai_inferred' };
        categoryConfidence = cat.confidence;
      }
    }

    // Free-text answers to the question we just asked.
    const words = message.trim().split(/\s+/).length;
    if (pendingField === 'scope' && !updates.scope && words >= 1) updates.scope = { value: message.trim(), source: 'customer' };
    if (pendingField === 'problem' && words >= 3) updates.problem = { value: message.trim(), source: 'customer' };
    // The first descriptive message is the problem statement.
    if (!facts.problem && !updates.problem && words >= 4 && pendingField !== 'scope' && pendingField !== 'budget') {
      updates.problem = { value: message.trim(), source: 'customer' };
    }

    // Ambiguous between two trades: ask the customer to choose instead of guessing.
    let nextQuestion: TurnAnalysis['nextQuestion'] = null;
    const guess = updates.category ? null : classifyCategory(message, categories);
    if (!facts.category && guess?.runnerUp && guess.confidence < 0.6) {
      const name = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
      nextQuestion = { field: 'category', text: `Gaat het om ${name(guess.slug).toLowerCase()} of ${name(guess.runnerUp).toLowerCase()}? Of iets anders?` };
    }

    const analysis: TurnAnalysis = {
      updates,
      categoryConfidence,
      imageObservations: null,
      safety: { level: 'none', reason: null },
      nextQuestion,
      wantsCancel: false,
    };
    return { analysis, usage: { model: null, inputTokens: null, outputTokens: null } };
  }

  async draftJob({ facts, categories, region }: { facts: IntakeFacts; categories: CategoryOption[]; region: string }) {
    return { draft: buildTemplateDraft(facts, categories, region), usage: { model: null, inputTokens: null, outputTokens: null } };
  }
}

export function buildTemplateDraft(facts: IntakeFacts, categories: CategoryOption[], region: string): JobDraft {
  const cat = categories.find((c) => c.slug === facts.category?.value);
  const catName = cat?.name ?? 'Klus';
  const problem = facts.problem?.value ?? '';
  const title = `${catName}: ${shortTitle(problem)} — ${region}`.replace(/\s+/g, ' ');
  const pc4 = parsePostcode(facts.postcode?.value ?? '')?.postcode4 ?? '';
  const budget = facts.budget?.value;
  const lines = [
    `Klant zoekt een vakman voor ${catName.toLowerCase()} in de regio ${region} (${pc4}).`,
    '',
    `Omschrijving door de klant: ${problem}`,
    '',
    `• Omvang (schatting klant): ${facts.scope?.value ?? 'niet opgegeven'}`,
    `• Gewenste planning: ${facts.timing ? TIMING_LABELS[facts.timing.value] : 'niet opgegeven'}`,
    `• Maximaal budget: ${budget ? formatEuro(budget) : 'geen maximum opgegeven'}`,
  ];
  if (facts.imageObservations) lines.push('', `Op basis van de foto's (AI-inschatting, niet gecontroleerd): ${facts.imageObservations.value}`);
  lines.push('', 'Maten en hoeveelheden zijn schattingen van de klant. Controleer ter plaatse voordat je een definitieve prijs afgeeft.');
  return { title, description: lines.join('\n'), assumptions: assumptionsFor(facts, categories) };
}

/** First clause of the customer's description, cut on a word boundary. */
export function shortTitle(problem: string): string {
  let t = problem.split(/[.!?\n]/)[0].trim();
  if (t.length > 60) {
    const clause = t.split(/[,;:]/)[0].trim();
    if (clause.length >= 15) t = clause;
  }
  if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, '') + '…';
  if (t.length < 4) return 'klus';
  return t.charAt(0).toLowerCase() + t.slice(1);
}

export function assumptionsFor(facts: IntakeFacts, categories: CategoryOption[]): string[] {
  const out: string[] = [];
  const labels: Record<FieldKey, string> = { category: 'Categorie', problem: 'Omschrijving', postcode: 'Postcode', scope: 'Omvang', timing: 'Planning', budget: 'Budget' };
  for (const key of Object.keys(labels) as FieldKey[]) {
    const f = facts[key];
    if (f?.source === 'ai_inferred') {
      const shown = key === 'category' ? categories.find((c) => c.slug === f.value)?.name ?? String(f.value) : String(f.value);
      out.push(`${labels[key]} is door AI ingeschat: “${shown}”. Klopt dit niet? Laat het ons weten.`);
    }
  }
  if (facts.imageObservations) out.push(`Foto-analyse door AI: ${facts.imageObservations.value}`);
  return out;
}
