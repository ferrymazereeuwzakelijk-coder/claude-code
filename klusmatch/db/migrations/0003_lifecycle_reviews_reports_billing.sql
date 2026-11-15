-- Job lifecycle tracking, reviews, portfolio, reports/disputes and billing preparation.

-- ───────────────────────── Job lifecycle ─────────────────────────
alter table jobs add column completed_at timestamptz;
alter table jobs add column cancelled_at timestamptz;
alter table jobs add column cancel_reason text;

-- Append-only status history for the timeline shown to customer and contractor.
create table job_events (
  id bigserial primary key,
  job_id uuid not null references jobs(id) on delete cascade,
  kind text not null,              -- published, quote_received, awarded, completed, cancelled, removed, disputed, reviewed
  actor_user_id uuid references users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index job_events_job_idx on job_events(job_id, id);

-- ───────────────────────── Reviews ─────────────────────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs(id) on delete cascade,   -- one review per job
  contractor_id uuid not null references contractor_profiles(user_id) on delete cascade,
  customer_id uuid not null references users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (length(body) between 10 and 2000),
  contractor_reply text check (contractor_reply is null or length(contractor_reply) between 2 and 1000),
  replied_at timestamptz,
  hidden boolean not null default false,                               -- moderated by admin
  created_at timestamptz not null default now()
);
create index reviews_contractor_idx on reviews(contractor_id, created_at desc) where not hidden;

-- ───────────────────────── Portfolio ─────────────────────────
create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractor_profiles(user_id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  caption text not null default '' check (length(caption) <= 200),
  category_slug text references categories(slug),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index portfolio_contractor_idx on portfolio_items(contractor_id, created_at desc);

-- ───────────────────────── Reports & disputes ─────────────────────────
create type report_kind as enum ('report', 'dispute');
create type report_status as enum ('open', 'in_progress', 'resolved', 'dismissed');

create table reports (
  id uuid primary key default gen_random_uuid(),
  kind report_kind not null,
  reporter_id uuid not null references users(id) on delete cascade,
  target_type text not null check (target_type in ('job', 'quote', 'review', 'user', 'message')),
  target_id text not null,
  job_id uuid references jobs(id) on delete set null,
  reason text not null check (reason in ('spam', 'fraud', 'inappropriate', 'unsafe', 'no_show', 'quality', 'payment', 'other')),
  body text not null check (length(body) between 10 and 4000),
  status report_status not null default 'open',
  resolution_note text,
  handled_by uuid references users(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on reports(status, created_at desc);
-- One open report per reporter per target prevents duplicate spam.
create unique index reports_open_unique on reports(reporter_id, target_type, target_id) where status in ('open', 'in_progress');

-- ───────────────────────── Billing preparation (FEATURE_BILLING) ─────────────────────────
create table subscriptions (
  contractor_id uuid primary key references contractor_profiles(user_id) on delete cascade,
  plan text not null check (plan in ('starter', 'pro')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Processed Stripe webhook events (idempotency).
create table stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- Backfill timeline for existing jobs.
insert into job_events (job_id, kind, created_at) select id, 'published', published_at from jobs;
insert into job_events (job_id, kind, created_at)
  select j.id, 'awarded', coalesce(q.decided_at, now()) from jobs j join quotes q on q.id = j.accepted_quote_id;
