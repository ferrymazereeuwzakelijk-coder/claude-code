# KlusMatch AI — Architecture

## 1. Overview

```
 Customer ─┬─ WhatsApp ──► Meta Cloud API ──► POST /api/whatsapp/webhook ──┐
           └─ Web (Next.js) ─► /api/intake/* , server actions ─────────────┤
 Contractor ── Web ─► server actions                                        │
 Admin ─────── Web ─► server actions                                        ▼
                                                    ┌───────────── Domain services (src/lib) ─────────────┐
                                                    │ intake engine · publish · matching · quotes ·      │
                                                    │ messages · contractors · notifications · audit     │
                                                    └──────┬──────────────────────────┬───────────────────┘
                                                           │                          │
                                                  PostgreSQL (Supabase)        background_jobs queue
                                                  migrations in db/migrations   (FOR UPDATE SKIP LOCKED)
                                                                                      │
                                              worker (npm run worker) ◄───────────────┘
                                              job.match · wa.process_inbound · wa.send · notify.*
```

* **Next.js 15 App Router** renders all UI on the server. Mutations go through server actions
  (built-in origin checks) or route handlers (explicit same-origin check in `lib/http.ts`).
* **All authorization is server-side** in the domain services and page guards. The browser never
  talks to the database. `middleware.ts` is only a cheap redirect for missing cookies.
* **PostgreSQL** is the single source of truth, including the job queue, rate limits and audit log,
  so the system has no extra infrastructure to run. It works on Supabase Postgres unchanged.

## 2. Key design decisions

| Decision | Why |
|---|---|
| Deterministic intake state machine around a pluggable AI provider | The model *extracts*; code *decides*. Confirmation, cancel, safety escalation and publishing are never left to the model. |
| Facts carry provenance (`customer` / `ai_inferred`) | AI assumptions are always visible as such. An AI guess can never overwrite something the customer said (`mergeFacts`). |
| Rules provider as offline default and as fallback | The whole product works without API keys, and an AI outage degrades instead of breaking. The UI states which mode is active. |
| Webhook = verify → store → enqueue → 200 | Fast acknowledgement; retries from Meta are idempotent through the message-id primary key; processing is retried with backoff. |
| Transactional outbox | `enqueue()` runs in the same transaction as the state change, so a published job always gets matched. |
| Public vs private job data | `jobs` holds only `postcode4`, the region and the description (contact details are scrubbed). `job_private_details` is revealed to the awarded contractor only. |
| Own session auth instead of Supabase Auth (for now) | Lets the full flow run and be tested offline, and supports phone-only WhatsApp customers. See §8. |

## 3. Intake state machine

```
            ┌────────────── customer message ──────────────┐
            ▼                                              │
  ┌──────────────┐ all required facts ┌───────────────────────┐ "JA"/confirm ┌───────────┐
  │  collecting  │ ─────────────────► │ awaiting_confirmation │ ───────────► │ published │
  └──────────────┘ ◄──── correction ── └───────────────────────┘              └───────────┘
       │   │ danger (gas, sparks, collapse, CO) │ "annuleer"
       │   └───────────────► escalated ◄────────┘     └──► cancelled
       └── > 30 turns ─────► escalated (human follow-up)
```

Required facts: category, problem, postcode, scope, timing and budget (or an explicit "no maximum").

* **Safety:** a deterministic keyword screen runs on every message. The AI can raise the level but
  never lower it. `danger` stops the flow and returns emergency advice (0800-9009 gas, 112).
  `specialist` categories (asbestos) are published as `under_review` and need admin approval
  before matching.
* **Loop guard:** if the category question goes unanswered twice, a numbered menu is shown, so a
  conversation can't get stuck.
* **Contact details** (phone numbers, e-mails) are scrubbed from the free-text facts.

## 4. WhatsApp

| Concern | Implementation |
|---|---|
| Signature | `X-Hub-Signature-256` HMAC-SHA256 over the raw body, compared in constant time (`whatsapp/signature.ts`) |
| Verification | `GET` handshake with `hub.verify_token` (constant-time compare) |
| Dedupe | `wa_inbound_events.wa_message_id` primary key; queue idempotency key `wa.in:<id>` |
| Retry-safety | Processing in `wa.process_inbound`; failures retry with exponential backoff; `processed` events are skipped |
| Consent | First contact gets a privacy notice and must reply **JA**. The first message is kept and replayed after consent |
| Opt-out | `STOP`/`AFMELDEN` → `opted_out`; one confirmation is allowed and nothing more is sent. `START` re-subscribes |
| 24h window | Free-form text only within 24h of the last inbound message; otherwise an approved template (`whatsapp/templates.ts`) or no send |
| Identification | `wa_contacts` ↔ `users`. A phone-only customer account is created on first publication. The web account can be linked with `KOPPEL <code>` |
| Quote acceptance | `OFFERTES` lists quotes; `ACCEPTEER Q7F3K` asks for explicit confirmation; `JA` accepts |
| Transport | `WhatsAppTransport` interface: `CloudApiTransport` (Graph API) or `SimulatorTransport`. The simulator still goes through the real webhook path |

## 5. Matching

`matchJob()` filters on category, distance ≤ the contractor's radius, `available`, verification
(configurable) and active account. It sorts by distance and caps the result at
`max_contractors_per_job`. Each contractor also has a cap on new-job notifications per 24h;
suppressed matches are still recorded (`suppressed_reason = 'daily_cap'`). The contractor feed
applies the same filters live, so it also shows jobs published before the contractor joined.

Distances use approximate centroids per 2-digit postcode region (`lib/geo.ts`). **Replace this
with the CBS/PDOK PC4 dataset for production accuracy.**

## 6. Security checklist

* scrypt password hashing; session tokens are stored as SHA-256 hashes; cookies are httpOnly,
  SameSite=Lax and Secure in production
* Rate limits (Postgres fixed window) on login (per IP and per e-mail), registration, intake,
  quotes, messages and WhatsApp per contact
* Upload validation by magic bytes plus size limits; media is served only to authorized viewers
  (`/api/media/[id]`)
* Security headers in `next.config.mjs`; startup refuses development WhatsApp secrets or
  simulator mode in production
* Audit log for auth, publishing, matching, quotes, verification, moderation, consent and settings

## 7. Lifecycle, trust & billing (migration 0003)

* `job_events` is an append-only timeline (published → quote_received → awarded → completed →
  reviewed, plus cancelled / removed / approved / disputed).
* Reviews are tied to a **completed** job: one per job, written by its customer about the awarded
  contractor; the contractor may reply once; admins can hide them through a report.
* Disputes can only be opened by the two parties of an awarded/completed job. Reports require a
  relation to the target. A partial unique index blocks duplicate open reports.
* Portfolio photos are the only media served without login (they appear on public profiles).
* Billing: `subscriptions` + `stripe_events` (idempotency). The webhook verifies `Stripe-Signature`
  (HMAC-SHA256, 5-minute tolerance). Everything is behind `FEATURE_BILLING`; plan limits are not
  enforced yet.

## 8. What's next (recommended order)

1. Live credentials: Claude key, Meta (number + templates), Supabase Storage bucket, Stripe.
2. PC4 centroid table, plus contractor availability calendars.
3. Enforce plan limits (e.g. quotes/month on Starter) once pricing is decided.
4. Supabase Realtime (or SSE) to replace polling and reloads for messages and quotes.
5. Optional: move to Supabase Auth. Map `users.id` to `auth.users.id`, keep the role/profile
   tables, and keep server-side authorization as is.
