# KlusMatch AI

A marketplace for home and garden jobs in the Netherlands. Customers describe a job via
**WhatsApp** or the website, an AI intake turns it into a clear job description, and verified
contractors in the region send quotes.

The architecture and design decisions are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Status of this build

| Area | Status |
|---|---|
| Customer intake → AI job → confirmation → publication → matching → quote → acceptance | ✅ Working end to end (web **and** WhatsApp simulator), persisted in Postgres, covered by tests |
| Auth & roles (customer / contractor / admin), rate limits, audit log | ✅ Working |
| Contractor onboarding, verification, feed with filters, saved jobs, quotes, messaging | ✅ Working |
| Admin: verification, moderation, escalations, abuse signals, matching rules, categories, AI/queue monitoring, audit log | ✅ Working |
| AI intake with Claude (image analysis, structured output) | ⚙️ Implemented, **needs `ANTHROPIC_API_KEY`**; not yet run against the live API. Without a key the rule-based provider runs (no image analysis, clearly shown in the UI) |
| WhatsApp Cloud API | ⚙️ Adapter implemented, **needs Meta credentials + approved templates**; fully testable through the local simulator |
| Supabase Storage driver | ⚙️ Implemented, untested against a live bucket (local disk is the default) |
| Reviews, portfolio, disputes, billing (Stripe) | ⏳ Not built yet (billing flag reserved) |
| Photography on the landing page | ⏳ Needs licensed photos; the page currently uses product illustrations |

## Run locally

Requirements: Node 20+ and PostgreSQL 14+ (or a Supabase project).

```bash
cd klusmatch
npm install
cp .env.example .env.local          # adjust DATABASE_URL if needed
createdb klusmatch_dev              # or use Supabase
npm run db:migrate
npm run db:seed:demo                # demo accounts (development/demo only)
npm run dev                         # http://localhost:3000
```

Demo accounts (password `demo-wachtwoord-2026`): `admin@`, `klant@`, `schilder@`, `hovenier@`,
`loodgieter@`, `dakdekker@` and `nieuw@demo.klusmatch.test`.

**WhatsApp simulator:** http://localhost:3000/dev/whatsapp (disabled when `APP_ENV=production`).

## Tests

```bash
createdb klusmatch_test
npm test                 # 26 unit + integration tests against a real Postgres database
npm run typecheck
# Browser E2E (needs a running server and demo data):
npm run build && npm start &   npm run test:e2e
```

The integration tests cover the full vertical slice. Among other things:
* contact details never appear in public text, and nothing is published without confirmation
* matching on category, distance and verification, plus the daily notification cap
* quote authorization (outside the area, unverified, double quotes, another customer accepting)
* gas leak → escalation; asbestos → review; category disambiguation without loops
* webhook signatures, deduplication, consent replay, opt-out/opt-in, account linking via `KOPPEL`,
  the 24h window and templates, and quote acceptance via WhatsApp

## Deploy to production

1. **Database:** create a Supabase project and run
   `DATABASE_URL=<connection string> npm run db:migrate`. Use the pooled string (port 6543) for
   the app and the direct string for migrations.
2. **App:** deploy to Vercel or any Node host (`npm run build && npm start`). Set every variable
   from `.env.example`, with `APP_ENV=production`, `INLINE_WORKER=false` and strong random values
   for `WHATSAPP_APP_SECRET` (from Meta) and `WHATSAPP_VERIFY_TOKEN`.
3. **Worker:** run `npm run worker` as a separate, always-on process (Railway, Fly.io, Render or a
   container). Multiple instances are safe (`SKIP LOCKED`).
4. **Admin:** `npm run admin:create -- you@company.nl "Your Name"`.
5. **AI:** set `ANTHROPIC_API_KEY` (and optionally `AI_MODEL`, default `claude-opus-5-5`). Intake
   requests use structured outputs and server-side refusal fallbacks (`fallbacks: "default"`).
6. **WhatsApp:** in Meta Business Manager:
   * connect a phone number and set `WHATSAPP_PHONE_NUMBER_ID` and a permanent `WHATSAPP_ACCESS_TOKEN`
   * webhook URL `https://<domain>/api/whatsapp/webhook`, verify token = `WHATSAPP_VERIFY_TOKEN`,
     subscribe to `messages`
   * get the templates in `src/lib/whatsapp/templates.ts` approved (name, language `nl`, parameters)
   * set `WHATSAPP_MODE=cloud_api`
7. **Storage:** create a private Supabase Storage bucket and set `STORAGE_DRIVER=supabase`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`.

## Project layout

```
db/migrations/         SQL migrations (run in order, recorded in schema_migrations)
scripts/               migrate, worker, seed-demo, create-admin, e2e-smoke
src/lib/intake/        state machine, safety, field parsing, AI providers (Claude / rules)
src/lib/whatsapp/      signature, payload, transport, inbound router, outbound rules, templates
src/lib/jobs/          publishing, matching
src/lib/*.ts           quotes, contractors, messages, queue, storage, auth, audit, rate limits
src/app/               pages (klant / vakman / admin / dev), API routes, server actions
tests/                 vitest unit + integration tests
```
