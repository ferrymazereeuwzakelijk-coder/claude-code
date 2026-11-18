import { z } from 'zod';

const schema = z.object({
  APP_ENV: z.enum(['development', 'demo', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-opus-5-5'),
  AI_PROVIDER: z.enum(['auto', 'anthropic', 'rules']).default('auto'),
  WHATSAPP_MODE: z.enum(['simulator', 'cloud_api', 'disabled']).default('simulator'),
  WHATSAPP_APP_SECRET: z.string().min(8),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_GRAPH_VERSION: z.string().default('v21.0'),
  STORAGE_DRIVER: z.enum(['local', 'supabase']).default('local'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('klusmatch-media'),
  FEATURE_BILLING: z.string().optional().transform((v) => v === 'true'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  INLINE_WORKER: z.string().optional().transform((v) => v !== 'false'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const e = parsed.data;
  if (e.APP_ENV === 'production') {
    if (e.WHATSAPP_APP_SECRET.startsWith('dev-') || e.WHATSAPP_VERIFY_TOKEN.startsWith('dev-')) {
      throw new Error('Refusing to start in production with development WhatsApp secrets.');
    }
    if (e.WHATSAPP_MODE === 'simulator') {
      throw new Error('WHATSAPP_MODE=simulator is not allowed in production.');
    }
  }
  cached = e;
  return e;
}

export function isSimulatorEnabled(): boolean {
  return env().APP_ENV !== 'production';
}

export function isWhatsAppEnabled(): boolean {
  return env().WHATSAPP_MODE !== 'disabled';
}

export function resetEnvCache() {
  cached = undefined;
}
