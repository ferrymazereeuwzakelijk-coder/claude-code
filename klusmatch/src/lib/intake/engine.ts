import { sql, type Db } from '../db';
import { env } from '../env';
import { audit } from '../audit';
import { UserFacingError } from '../errors';
import { listCategories } from '../categories';
import { parsePostcode } from '../geo';
import { storage } from '../storage';
import { publishIntake } from '../jobs/publish';
import { formatEuro, isCancel, isConfirmation, missingFields, parseBudget, QUESTIONS, TIMING_LABELS } from './fields';
import { maxSafety, screenMessage, type SafetyResult } from './safety';
import { AnthropicProvider } from './providers/anthropic';
import { buildTemplateDraft, RulesProvider } from './providers/rules';
import type { CategoryOption, FieldKey, ImageInput, IntakeFacts, IntakeProvider, IntakeState, JobDraft, ProviderUsage, TurnAnalysis } from './types';
import { REQUIRED_FIELDS } from './types';

export const MAX_TURNS = 30;

export function selectProvider(): IntakeProvider {
  const e = env();
  if (e.AI_PROVIDER === 'rules') return new RulesProvider();
  if (e.AI_PROVIDER === 'anthropic' || e.ANTHROPIC_API_KEY) return new AnthropicProvider(e.AI_MODEL);
  return new RulesProvider();
}

export type IntakeRow = {
  id: string;
  channel: 'web' | 'whatsapp';
  customer_id: string | null;
  wa_contact_id: string | null;
  state: IntakeState;
  facts: IntakeFacts;
  pending_field: FieldKey | null;
  draft: JobDraft | null;
  escalation: { level: string; reason: string | null; advice: string | null } | null;
  job_id: string | null;
  provider: string;
  turn_count: number;
};

export type TurnResult = {
  intakeId: string;
  state: IntakeState;
  reply: string;
  draft: JobDraft | null;
  facts: IntakeFacts;
  published?: { jobId: string; ref: string; status: string };
  provider: string;
};

export async function createIntake(db: Db, opts: { channel: 'web' | 'whatsapp'; customerId?: string | null; waContactId?: string | null }) {
  const [row] = await db<{ id: string }[]>`
    insert into intake_sessions (channel, customer_id, wa_contact_id, provider)
    values (${opts.channel}, ${opts.customerId ?? null}, ${opts.waContactId ?? null}, ${selectProvider().name})
    returning id`;
  return row.id;
}

export async function getIntake(db: Db, id: string, lock = false): Promise<IntakeRow | null> {
  const rows = lock
    ? await db<IntakeRow[]>`select * from intake_sessions where id = ${id} for update`
    : await db<IntakeRow[]>`select * from intake_sessions where id = ${id}`;
  return rows[0] ?? null;
}

export async function intakeMessages(db: Db, id: string) {
  return db<{ id: string; role: 'customer' | 'assistant'; body: string; media_ids: string[]; created_at: Date }[]>`
    select id, role, body, media_ids, created_at from intake_messages where intake_id = ${id} order by id`;
}

// ───────────────────────── fact merging ─────────────────────────

const PII_RE = /(\+?31|0)[\s-]?6[\s-]?(\d[\s-]?){8}|\b[\w.+-]+@[\w-]+\.[\w.]+\b|(\+?31|0)\d{1,3}[\s-]?\d{6,7}/g;
const scrub = (s: string) => s.replace(PII_RE, '[verwijderd]').trim().slice(0, 1500);

/**
 * Validates and merges provider output into the fact sheet. Rules:
 * - every value is validated/normalised here, never trusted from the provider;
 * - AI-inferred values never overwrite something the customer said.
 */
export function mergeFacts(
  facts: IntakeFacts,
  updates: TurnAnalysis['updates'],
  categories: CategoryOption[],
  categoryConfidence: number | null,
): { facts: IntakeFacts; rejected: FieldKey[] } {
  const next: IntakeFacts = { ...facts };
  const rejected: FieldKey[] = [];
  for (const key of REQUIRED_FIELDS) {
    const u = updates[key];
    if (!u) continue;
    const existing = next[key];
    if (existing?.source === 'customer' && u.source === 'ai_inferred') continue;
    switch (key) {
      case 'category': {
        const ok = typeof u.value === 'string' && categories.some((c) => c.slug === u.value);
        if (!ok) break;
        if (u.source === 'ai_inferred' && (categoryConfidence ?? 0) < 0.6) break;
        next.category = { value: u.value as string, source: u.source };
        break;
      }
      case 'postcode': {
        const pc = parsePostcode(String(u.value ?? ''));
        if (!pc) rejected.push('postcode');
        else next.postcode = { value: pc.postcodeFull ?? pc.postcode4, source: 'customer' };
        break;
      }
      case 'timing': {
        if (typeof u.value === 'string' && u.value in TIMING_LABELS) next.timing = { value: u.value as keyof typeof TIMING_LABELS, source: u.source };
        break;
      }
      case 'budget': {
        if (u.value === null) next.budget = { value: null, source: 'customer' };
        else {
          const n = typeof u.value === 'number' ? Math.round(u.value) : parseBudget(String(u.value));
          if (typeof n === 'number' && n >= 25 && n <= 500_000) next.budget = { value: n, source: 'customer' };
          else rejected.push('budget');
        }
        break;
      }
      case 'problem':
      case 'scope': {
        const v = scrub(String(u.value ?? ''));
        if (v.length >= 2) next[key] = { value: v, source: u.source };
        break;
      }
    }
  }
  return { facts: next, rejected };
}

// ───────────────────────── main turn handler ─────────────────────────

async function recordUsage(db: Db, intakeId: string, provider: string, operation: string, started: number, usage: ProviderUsage | null, error?: unknown) {
  await db`
    insert into ai_usage (intake_id, provider, model, operation, input_tokens, output_tokens, latency_ms, success, error)
    values (${intakeId}, ${provider}, ${usage?.model ?? null}, ${operation}, ${usage?.inputTokens ?? null}, ${usage?.outputTokens ?? null},
            ${Date.now() - started}, ${!error}, ${error ? String(error instanceof Error ? error.message : error).slice(0, 1000) : null})`;
}

async function loadImages(db: Db, mediaIds: string[]): Promise<ImageInput[]> {
  if (!mediaIds.length) return [];
  const rows = await db<{ storage_key: string; mime_type: string }[]>`
    select storage_key, mime_type from media where id = any(${mediaIds}::uuid[]) and mime_type like 'image/%'`;
  return Promise.all(rows.map(async (r) => ({ mimeType: r.mime_type, base64: (await storage().get(r.storage_key)).toString('base64') })));
}

export function confirmationText(draft: JobDraft, facts: IntakeFacts, categories: CategoryOption[]) {
  const cat = categories.find((c) => c.slug === facts.category?.value)?.name ?? '';
  const budget = facts.budget?.value ? formatEuro(facts.budget.value) : 'geen maximum';
  const parts = [
    'Dit is je klusomschrijving:',
    '',
    `*${draft.title}*`,
    draft.description,
    '',
    `Categorie: ${cat} · Planning: ${facts.timing ? TIMING_LABELS[facts.timing.value] : '-'} · Budget: ${budget}`,
  ];
  if (draft.assumptions.length) parts.push('', 'Aannames van de AI (graag controleren):', ...draft.assumptions.map((a) => `• ${a}`));
  parts.push('', 'Klopt alles? Antwoord *JA* om te plaatsen, of stuur een correctie. Je volledige adres en telefoonnummer blijven privé.');
  return parts.join('\n');
}

export type TurnOptions = {
  provider?: IntakeProvider;
  /** Resolves (or creates) the customer account that will own the job when the customer confirms. */
  resolveCustomerId?: () => Promise<string>;
};

export async function handleCustomerTurn(intakeId: string, input: { text: string; mediaIds?: string[] }, opts: TurnOptions = {}): Promise<TurnResult> {
  const db = sql();
  const text = (input.text ?? '').trim().slice(0, 4000);
  const mediaIds = input.mediaIds ?? [];
  if (!text && !mediaIds.length) throw new UserFacingError('Stuur een bericht of foto.');

  const intake = await getIntake(db, intakeId);
  if (!intake) throw new UserFacingError('Aanvraag niet gevonden.', 404);
  const result = (state: IntakeState, reply: string, extra: Partial<TurnResult> = {}): TurnResult => ({
    intakeId,
    state,
    reply,
    draft: extra.draft ?? intake.draft,
    facts: extra.facts ?? intake.facts,
    provider: intake.provider,
    ...extra,
  });

  if (intake.state === 'published') return result('published', 'Deze klus is al geplaatst. Start een nieuwe aanvraag voor een andere klus.');
  if (intake.state === 'escalated') return result('escalated', 'Je aanvraag wordt door een medewerker bekeken. We nemen contact met je op.');
  if (intake.state === 'cancelled') return result('cancelled', 'Deze aanvraag is geannuleerd. Start gerust een nieuwe aanvraag.');

  await db`insert into intake_messages (intake_id, role, body, media_ids) values (${intakeId}, 'customer', ${text || '[foto]'}, ${mediaIds}::uuid[])`;

  const finish = async (state: IntakeState, reply: string, patch: Partial<IntakeRow>) => {
    const updated = await db`
      update intake_sessions set
        state = ${state},
        facts = ${db.json((patch.facts ?? intake.facts) as never)},
        pending_field = ${patch.pending_field === undefined ? intake.pending_field : patch.pending_field},
        draft = ${patch.draft === undefined ? (intake.draft ? db.json(intake.draft as never) : null) : patch.draft ? db.json(patch.draft as never) : null},
        escalation = ${patch.escalation ? db.json(patch.escalation as never) : intake.escalation ? db.json(intake.escalation as never) : null},
        provider = ${patch.provider ?? intake.provider},
        turn_count = turn_count + 1,
        updated_at = now()
      where id = ${intakeId} and turn_count = ${intake.turn_count}
      returning id`;
    if (!updated.length) throw new UserFacingError('Je vorige bericht wordt nog verwerkt. Probeer het zo opnieuw.', 409);
    await db`insert into intake_messages (intake_id, role, body) values (${intakeId}, 'assistant', ${reply})`;
    return result(state, reply, { facts: patch.facts ?? intake.facts, draft: patch.draft === undefined ? intake.draft : patch.draft, provider: patch.provider ?? intake.provider });
  };

  // 1. Explicit cancel / confirmation are deterministic — never left to the model.
  if (isCancel(text)) {
    await audit(db, { action: 'intake.cancelled', entityType: 'intake', entityId: intakeId });
    return finish('cancelled', 'Je aanvraag is geannuleerd. Je kunt altijd een nieuwe klus starten.', {});
  }
  if (intake.state === 'awaiting_confirmation' && isConfirmation(text) && !mediaIds.length) {
    if (!opts.resolveCustomerId) throw new Error('resolveCustomerId is required to publish');
    const customerId = await opts.resolveCustomerId();
    const published = await confirmAndPublish(intakeId, customerId);
    const reply =
      published.status === 'under_review'
        ? `Bedankt! Je klus (${published.ref}) vraagt om een gespecialiseerd bedrijf en wordt eerst door ons gecontroleerd. Daarna sturen we hem naar gecertificeerde vakmensen.`
        : `Je klus is geplaatst! Referentie: ${published.ref}. We sturen hem nu naar geverifieerde vakmensen in jouw regio. Je krijgt bericht zodra er offertes binnenkomen.`;
    await db`insert into intake_messages (intake_id, role, body) values (${intakeId}, 'assistant', ${reply})`;
    return result('published', reply, { published });
  }
  if (intake.turn_count >= MAX_TURNS) {
    return finish('escalated', 'Dit gesprek is wat lang geworden. Een medewerker neemt je aanvraag over en neemt contact met je op.', {
      escalation: { level: 'caution', reason: 'Maximaal aantal beurten bereikt', advice: null },
    });
  }

  // 2. Deterministic safety screen.
  let safety: SafetyResult = screenMessage(text);
  if (safety.level === 'danger') {
    await audit(db, { action: 'intake.escalated', entityType: 'intake', entityId: intakeId, metadata: { reason: safety.reason } });
    return finish('escalated', `${safety.advice}\n\nWe plaatsen deze aanvraag niet automatisch. Een medewerker van KlusMatch bekijkt hem en neemt contact op.`, {
      escalation: { level: 'danger', reason: safety.reason, advice: safety.advice },
    });
  }

  // 3. Provider extraction (falls back to rules on any failure).
  const categories = await listCategories(db);
  let provider = opts.provider ?? selectProvider();
  const missingBefore = missingFields(intake.facts);
  const history = (await intakeMessages(db, intakeId)).slice(0, -1).map((m) => ({ role: m.role, body: m.body }));
  const images = provider.canSeeImages ? await loadImages(db, mediaIds) : [];
  let analysis: TurnAnalysis;
  let started = Date.now();
  try {
    const out = await provider.analyzeTurn({ history, facts: intake.facts, pendingField: intake.pending_field, missingFields: missingBefore, message: text, images, categories });
    analysis = out.analysis;
    await recordUsage(db, intakeId, provider.name, 'analyze_turn', started, out.usage);
  } catch (err) {
    await recordUsage(db, intakeId, provider.name, 'analyze_turn', started, null, err);
    provider = new RulesProvider();
    started = Date.now();
    analysis = (await provider.analyzeTurn({ history, facts: intake.facts, pendingField: intake.pending_field, missingFields: missingBefore, message: text, images: [], categories })).analysis;
  }

  safety = maxSafety(safety, analysis.safety);
  if (safety.level === 'danger') {
    return finish('escalated', `${safety.advice}\n\nWe plaatsen deze aanvraag niet automatisch. Een medewerker van KlusMatch bekijkt hem.`, {
      escalation: { level: 'danger', reason: safety.reason, advice: safety.advice },
      provider: provider.name,
    });
  }

  const { facts, rejected } = mergeFacts(intake.facts, analysis.updates, categories, analysis.categoryConfidence);
  if (analysis.imageObservations) {
    const prev = facts.imageObservations?.value;
    facts.imageObservations = { value: prev ? `${prev} ${analysis.imageObservations}` : analysis.imageObservations, source: 'ai_inferred' };
  }

  const notes: string[] = [];
  if (mediaIds.length && !provider.canSeeImages) notes.push('Foto ontvangen, dank je! Vakmensen zien je foto bij de klus. (Automatische foto-analyse staat in deze omgeving uit.)');
  else if (mediaIds.length && analysis.imageObservations) notes.push(`Ik zie op de foto: ${analysis.imageObservations}`);
  if (rejected.includes('postcode')) notes.push('Die postcode herken ik niet. Een Nederlandse postcode ziet eruit als 1234 AB.');
  if (rejected.includes('budget')) notes.push('Dat bedrag kon ik niet goed lezen.');
  const escalation = safety.level === 'caution' ? { level: 'caution', reason: safety.reason, advice: null } : intake.escalation;
  if (safety.level === 'caution' && intake.escalation?.reason !== safety.reason) notes.push(`Let op: ${safety.reason}. We stemmen de klus daarop af.`);

  const missing = missingFields(facts);
  if (missing.length === 0) {
    const region = parsePostcode(facts.postcode!.value)!.region;
    let draft: JobDraft;
    started = Date.now();
    try {
      const out = await provider.draftJob({ facts, categories, region });
      draft = out.draft;
      await recordUsage(db, intakeId, provider.name, 'draft_job', started, out.usage);
    } catch (err) {
      await recordUsage(db, intakeId, provider.name, 'draft_job', started, null, err);
      draft = buildTemplateDraft(facts, categories, region);
    }
    const reply =
      intake.channel === 'web'
        ? [...notes, 'Ik heb een klusomschrijving voor je opgesteld. Controleer hem hieronder: klopt alles, bevestig dan om te plaatsen. Iets aanpassen? Typ gewoon je correctie.'].join('\n\n')
        : [...notes, confirmationText(draft, facts, categories)].join('\n\n');
    return finish('awaiting_confirmation', reply, { facts, draft, pending_field: null, escalation: escalation as IntakeRow['escalation'], provider: provider.name });
  }

  const field = missing[0];
  const question = analysis.nextQuestion?.field === field ? analysis.nextQuestion.text : QUESTIONS[field];
  return finish('collecting', [...notes, question].join('\n\n'), {
    facts,
    pending_field: field,
    draft: null,
    escalation: escalation as IntakeRow['escalation'],
    provider: provider.name,
  });
}

/** Publishes an intake after explicit customer confirmation. Idempotent under concurrent confirms (row lock). */
export async function confirmAndPublish(intakeId: string, customerId: string) {
  return sql().begin(async (tx) => {
    const intake = await getIntake(tx, intakeId, true);
    if (!intake) throw new UserFacingError('Aanvraag niet gevonden.', 404);
    if (intake.customer_id && intake.customer_id !== customerId) throw new UserFacingError('Je hebt geen toegang tot deze aanvraag.', 403);
    if (intake.state === 'published' && intake.job_id) {
      const [j] = await tx<{ ref: string; status: string }[]>`select ref, status from jobs where id = ${intake.job_id}`;
      return { jobId: intake.job_id, ref: j.ref, status: j.status };
    }
    return publishIntake(tx, intake, customerId);
  });
}
