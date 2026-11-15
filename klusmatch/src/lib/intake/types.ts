/** Where a fact came from. AI-inferred facts are always shown to the customer as assumptions. */
export type FactSource = 'customer' | 'ai_inferred';
export type Fact<T> = { value: T; source: FactSource };

export const REQUIRED_FIELDS = ['category', 'problem', 'postcode', 'scope', 'timing', 'budget'] as const;
export type FieldKey = (typeof REQUIRED_FIELDS)[number];

export type TimingValue = 'spoed' | 'binnen_2_weken' | 'binnen_maand' | 'flexibel';

export type IntakeFacts = {
  category?: Fact<string>;
  problem?: Fact<string>;
  postcode?: Fact<string>;
  scope?: Fact<string>;
  timing?: Fact<TimingValue>;
  /** null value = customer explicitly has no maximum budget */
  budget?: Fact<number | null>;
  imageObservations?: Fact<string>;
};

export type IntakeState = 'collecting' | 'awaiting_confirmation' | 'published' | 'escalated' | 'cancelled';

export type SafetyAssessment = { level: 'none' | 'caution' | 'danger'; reason: string | null };

export type CategoryOption = { slug: string; name: string; description: string; risk: 'normal' | 'elevated' | 'specialist' };

export type ImageInput = { mimeType: string; base64: string };

export type HistoryItem = { role: 'customer' | 'assistant'; body: string };

export type TurnInput = {
  history: HistoryItem[];
  facts: IntakeFacts;
  pendingField: FieldKey | null;
  missingFields: FieldKey[];
  message: string;
  images: ImageInput[];
  categories: CategoryOption[];
};

/** Raw extraction result from a provider. The engine validates everything before using it. */
export type TurnAnalysis = {
  updates: Partial<Record<FieldKey, { value: string | number | null; source: FactSource }>>;
  categoryConfidence: number | null;
  imageObservations: string | null;
  safety: SafetyAssessment;
  nextQuestion: { field: FieldKey; text: string } | null;
  wantsCancel: boolean;
};

export type JobDraft = { title: string; description: string; assumptions: string[] };

export type ProviderUsage = { model: string | null; inputTokens: number | null; outputTokens: number | null };

export interface IntakeProvider {
  readonly name: 'anthropic' | 'rules';
  readonly canSeeImages: boolean;
  analyzeTurn(input: TurnInput): Promise<{ analysis: TurnAnalysis; usage: ProviderUsage }>;
  draftJob(input: { facts: IntakeFacts; categories: CategoryOption[]; region: string }): Promise<{ draft: JobDraft; usage: ProviderUsage }>;
}
