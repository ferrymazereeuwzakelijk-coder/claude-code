import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { QUESTIONS, TIMING_LABELS } from '../fields';
import { assumptionsFor } from './rules';
import type { CategoryOption, IntakeFacts, IntakeProvider, JobDraft, TurnAnalysis, TurnInput } from '../types';
import { REQUIRED_FIELDS } from '../types';

export class AIRefusalError extends Error {}

const FIELD = z.enum(REQUIRED_FIELDS);

const TurnSchema = z.object({
  category_slug: z.string().nullable().describe('Slug from the category list, or null if unclear'),
  category_source: z.enum(['customer_stated', 'inferred']).nullable(),
  category_confidence: z.number().nullable().describe('0..1'),
  problem: z.string().nullable().describe("Customer's own description of the work, lightly cleaned up. Null if not given."),
  postcode: z.string().nullable().describe('Dutch postcode exactly as provided by the customer, or null'),
  scope: z.string().nullable().describe('Size/quantity ONLY if the customer stated it. Never estimate from photos.'),
  timing: z.enum(['spoed', 'binnen_2_weken', 'binnen_maand', 'flexibel']).nullable(),
  budget_status: z.enum(['not_mentioned', 'amount', 'no_maximum']),
  budget_eur: z.number().nullable(),
  image_observations: z.string().nullable().describe('Neutral Dutch description of what is visible in photos. No measurements, no prices.'),
  safety_level: z.enum(['none', 'caution', 'danger']),
  safety_reason: z.string().nullable(),
  wants_cancel: z.boolean(),
  next_question_field: FIELD.nullable(),
  next_question_text: z.string().nullable().describe('One short, friendly Dutch question for next_question_field'),
});

const DraftSchema = z.object({
  title: z.string().describe('Max 80 characters, Dutch, specific, no personal data'),
  description: z.string().describe('Dutch job description for contractors, 80–220 words'),
});

const TURN_SYSTEM = `Je bent de intake-assistent van KlusMatch, een Nederlandse marktplaats voor klussen in huis en tuin.
Je taak in deze stap: haal gestructureerde informatie uit het NIEUWE bericht (en eventuele foto's) van de klant.

Regels:
- Neem alleen informatie over die de klant echt heeft gegeven. Verzin nooit maten, oppervlaktes, hoeveelheden of prijzen.
- Foto's mag je beschrijven in image_observations (wat je ziet, neutraal), maar leid daar GEEN scope of budget uit af.
- Categorie: kies uitsluitend een slug uit de lijst. category_source = "customer_stated" alleen als de klant het type werk expliciet noemt; anders "inferred".
- Laat velden op null als het nieuwe bericht er niets over zegt. Bestaande feiten worden elders bewaard.
- Correcties: als de klant iets corrigeert, geef de nieuwe waarde.
- Veiligheid: "danger" bij acuut gevaar (gaslucht, rook/vonken uit elektra, instortingsgevaar, koolmonoxide, grote waterlekkage bij elektra). "caution" bij werk dat een gecertificeerde vakman vereist (asbest, groepenkast, werken op grote hoogte).
- next_question: kies het eerste ontbrekende veld uit de lijst die je krijgt (na dit bericht) en stel daar één korte, vriendelijke vraag over in het Nederlands. Null als er niets meer ontbreekt.
- Persoonsgegevens zoals telefoonnummers, e-mailadressen en huisnummers neem je NIET op in problem of scope.`;

const DRAFT_SYSTEM = `Je schrijft heldere Nederlandse klusomschrijvingen voor vakmensen op KlusMatch.
Regels:
- Gebruik alleen de aangeleverde feiten. Verzin geen maten, materialen of prijzen.
- Feiten met bron "ai_inferred" en foto-observaties benoem je expliciet als inschatting ("volgens de foto lijkt...").
- Geen persoonsgegevens, geen volledig adres, geen telefoonnummers.
- Structuur: korte inleiding, wat er moet gebeuren, omvang, planning, budget, en een zin dat maten ter plaatse gecontroleerd moeten worden.
- Toon: professioneel, zakelijk, vriendelijk.`;

function client() {
  return new Anthropic({ maxRetries: 2, timeout: 60_000 });
}

export class AnthropicProvider implements IntakeProvider {
  readonly name = 'anthropic' as const;
  readonly canSeeImages = true;
  constructor(private model: string) {}

  async analyzeTurn(input: TurnInput) {
    const categoryList = input.categories.map((c) => `- ${c.slug}: ${c.name} (${c.description})`).join('\n');
    const known = JSON.stringify(input.facts, null, 1);
    const history = input.history.slice(-12).map((h) => `${h.role === 'customer' ? 'Klant' : 'Assistent'}: ${h.body}`).join('\n');
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      ...input.images.slice(0, 4).map(
        (img) =>
          ({
            type: 'image',
            source: { type: 'base64', media_type: img.mimeType as 'image/jpeg', data: img.base64 },
          }) as Anthropic.Beta.BetaImageBlockParam,
      ),
      {
        type: 'text',
        text: [
          `Categorieën:\n${categoryList}`,
          `Bekende feiten tot nu toe (met bron):\n${known}`,
          `Velden die nog ontbreken vóór dit bericht: ${input.missingFields.join(', ') || 'geen'}`,
          `Laatste gevraagde veld: ${input.pendingField ?? 'geen'}`,
          `Gesprek tot nu toe:\n${history || '(nog geen)'}`,
          `NIEUW bericht van de klant:\n"""${input.message}"""`,
          input.images.length ? `De klant heeft ${input.images.length} foto('s) meegestuurd (zie boven).` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ];

    const res = await client().beta.messages.parse({
      model: this.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: TURN_SYSTEM,
      output_config: { effort: 'low', format: betaZodOutputFormat(TurnSchema) },
      messages: [{ role: 'user', content }],
    });
    if (res.stop_reason === 'refusal') throw new AIRefusalError('Model declined the intake turn');
    const out = res.parsed_output;
    if (!out) throw new Error('AI returned no parseable output');

    const validSlug = out.category_slug && input.categories.some((c) => c.slug === out.category_slug) ? out.category_slug : null;
    const updates: TurnAnalysis['updates'] = {};
    if (validSlug) updates.category = { value: validSlug, source: out.category_source === 'customer_stated' ? 'customer' : 'ai_inferred' };
    if (out.problem) updates.problem = { value: out.problem, source: 'customer' };
    if (out.postcode) updates.postcode = { value: out.postcode, source: 'customer' };
    if (out.scope) updates.scope = { value: out.scope, source: 'customer' };
    if (out.timing) updates.timing = { value: out.timing, source: 'customer' };
    if (out.budget_status === 'no_maximum') updates.budget = { value: null, source: 'customer' };
    if (out.budget_status === 'amount' && out.budget_eur) updates.budget = { value: out.budget_eur, source: 'customer' };

    const analysis: TurnAnalysis = {
      updates,
      categoryConfidence: out.category_confidence,
      imageObservations: out.image_observations,
      safety: { level: out.safety_level, reason: out.safety_reason },
      nextQuestion: out.next_question_field && out.next_question_text ? { field: out.next_question_field, text: out.next_question_text } : null,
      wantsCancel: out.wants_cancel,
    };
    return { analysis, usage: { model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
  }

  async draftJob({ facts, categories, region }: { facts: IntakeFacts; categories: CategoryOption[]; region: string }) {
    const cat = categories.find((c) => c.slug === facts.category?.value);
    const payload = {
      categorie: cat?.name,
      regio: region,
      omschrijving_klant: facts.problem,
      omvang: facts.scope,
      planning: facts.timing ? { ...facts.timing, label: TIMING_LABELS[facts.timing.value] } : null,
      max_budget_eur: facts.budget,
      foto_observaties: facts.imageObservations ?? null,
    };
    const res = await client().beta.messages.parse({
      model: this.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: DRAFT_SYSTEM,
      output_config: { effort: 'medium', format: betaZodOutputFormat(DraftSchema) },
      messages: [{ role: 'user', content: `Schrijf de klusomschrijving op basis van deze feiten:\n${JSON.stringify(payload, null, 1)}` }],
    });
    if (res.stop_reason === 'refusal') throw new AIRefusalError('Model declined to draft');
    const out = res.parsed_output;
    if (!out) throw new Error('AI returned no parseable draft');
    const draft: JobDraft = { title: out.title.slice(0, 90), description: out.description, assumptions: assumptionsFor(facts, categories) };
    return { draft, usage: { model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
  }
}

export { QUESTIONS };
