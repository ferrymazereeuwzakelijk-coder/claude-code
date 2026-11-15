-- KlusMatch AI — initial schema
-- Compatible with Supabase Postgres (no extensions beyond pgcrypto / citext).
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ───────────────────────── Identity ─────────────────────────
create type user_role as enum ('customer', 'contractor', 'admin');
create type user_status as enum ('active', 'suspended');

create table users (
  id uuid primary key default gen_random_uuid(),
  email citext unique,
  password_hash text,
  role user_role not null,
  full_name text not null,
  phone_e164 text unique,
  status user_status not null default 'active',
  created_via text not null default 'web' check (created_via in ('web', 'whatsapp', 'seed')),
  created_at timestamptz not null default now(),
  check (email is not null or phone_e164 is not null)
);

create table sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions(user_id);

-- ───────────────────────── Catalogue ─────────────────────────
create type category_risk as enum ('normal', 'elevated', 'specialist');

create table categories (
  slug text primary key,
  name_nl text not null,
  description_nl text not null default '',
  risk category_risk not null default 'normal',
  active boolean not null default true,
  sort_order int not null default 100
);

-- ───────────────────────── Contractors ─────────────────────────
create type verification_status as enum ('unsubmitted', 'pending', 'verified', 'rejected');

create table contractor_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  company_name text not null,
  kvk_number text check (kvk_number ~ '^[0-9]{8}$'),
  description text not null default '',
  base_postcode text not null check (base_postcode ~ '^[1-9][0-9]{3}$'),
  base_lat double precision not null,
  base_lng double precision not null,
  service_radius_km int not null default 25 check (service_radius_km between 1 and 200),
  available boolean not null default true,
  verification verification_status not null default 'unsubmitted',
  verification_note text,
  verified_at timestamptz,
  verified_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contractor_categories (
  contractor_id uuid not null references contractor_profiles(user_id) on delete cascade,
  category_slug text not null references categories(slug),
  primary key (contractor_id, category_slug)
);
create index contractor_categories_cat_idx on contractor_categories(category_slug);

-- ───────────────────────── WhatsApp ─────────────────────────
create type wa_consent as enum ('unknown', 'pending', 'granted', 'opted_out');

create table wa_contacts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  profile_name text,
  user_id uuid references users(id) on delete set null,
  consent wa_consent not null default 'unknown',
  consent_at timestamptz,
  opted_out_at timestamptz,
  last_inbound_at timestamptz,
  pending_action jsonb,              -- e.g. {"type":"accept_quote","quote_id":...}
  link_code_hash text,               -- not used for WA side; codes live on users
  created_at timestamptz not null default now()
);

-- Raw inbound events: primary key = provider message id ⇒ deduplication.
create table wa_inbound_events (
  wa_message_id text primary key,
  phone_e164 text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table wa_outbound_messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references wa_contacts(id) on delete cascade,
  kind text not null check (kind in ('text', 'template')),
  template_name text,
  body text not null,
  payload jsonb not null,
  transport text not null check (transport in ('cloud_api', 'simulator')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);
create index wa_outbound_contact_idx on wa_outbound_messages(contact_id, created_at);

-- Media uploaded to the simulator stands in for Meta's media store.
create table wa_simulator_media (
  id text primary key,
  storage_key text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

-- Short-lived codes so a WhatsApp number can be linked to a web account.
create table account_link_codes (
  code_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- ───────────────────────── Media ─────────────────────────
create table media (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id) on delete set null,
  wa_contact_id uuid references wa_contacts(id) on delete set null,
  storage_key text not null,
  mime_type text not null,
  size_bytes int not null,
  sha256 text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── AI intake ─────────────────────────
create type intake_channel as enum ('web', 'whatsapp');
create type intake_state as enum ('collecting', 'awaiting_confirmation', 'published', 'escalated', 'cancelled');

create table intake_sessions (
  id uuid primary key default gen_random_uuid(),
  channel intake_channel not null,
  customer_id uuid references users(id) on delete set null,
  wa_contact_id uuid references wa_contacts(id) on delete set null,
  state intake_state not null default 'collecting',
  facts jsonb not null default '{}'::jsonb,       -- each fact carries {value, source}
  pending_field text,                              -- field the assistant last asked about
  draft jsonb,                                     -- {title, description, assumptions[]}
  escalation jsonb,                                -- {reason, severity, advice}
  job_id uuid,
  provider text not null default 'rules',
  turn_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id is not null or wa_contact_id is not null)
);
create index intake_wa_active_idx on intake_sessions(wa_contact_id) where state in ('collecting', 'awaiting_confirmation');

create table intake_messages (
  id bigserial primary key,
  intake_id uuid not null references intake_sessions(id) on delete cascade,
  role text not null check (role in ('customer', 'assistant')),
  body text not null,
  media_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index intake_messages_intake_idx on intake_messages(intake_id, id);

-- ───────────────────────── Jobs ─────────────────────────
create type job_status as enum ('published', 'awarded', 'completed', 'cancelled', 'removed', 'under_review');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,                       -- human-friendly reference e.g. KM-4F7Q2
  customer_id uuid not null references users(id),
  intake_id uuid references intake_sessions(id),
  category_slug text not null references categories(slug),
  title text not null,
  description text not null,
  postcode4 text not null check (postcode4 ~ '^[1-9][0-9]{3}$'),   -- public: 4 digits only
  region_name text not null,
  lat double precision not null,
  lng double precision not null,
  timing text not null,
  budget_max_cents int check (budget_max_cents is null or budget_max_cents > 0),
  facts jsonb not null,                           -- provenance-tagged
  ai_assumptions jsonb not null default '[]'::jsonb,
  status job_status not null default 'published',
  accepted_quote_id uuid,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index jobs_cat_status_idx on jobs(category_slug, status);
create index jobs_customer_idx on jobs(customer_id);

-- Private details: only owner, admin and the awarded contractor may read.
create table job_private_details (
  job_id uuid primary key references jobs(id) on delete cascade,
  postcode_full text,
  contact_phone text,
  contact_name text
);

create table job_media (
  job_id uuid not null references jobs(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  primary key (job_id, media_id)
);

create table job_matches (
  job_id uuid not null references jobs(id) on delete cascade,
  contractor_id uuid not null references contractor_profiles(user_id) on delete cascade,
  distance_km numeric(6,1) not null,
  score numeric(6,3) not null,
  notified boolean not null default false,
  suppressed_reason text,
  created_at timestamptz not null default now(),
  primary key (job_id, contractor_id)
);

create table saved_jobs (
  contractor_id uuid not null references contractor_profiles(user_id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contractor_id, job_id)
);

-- ───────────────────────── Quotes ─────────────────────────
create type quote_status as enum ('submitted', 'withdrawn', 'accepted', 'declined');
create type price_type as enum ('fixed', 'estimate', 'hourly');

create table quotes (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,                        -- short code for WhatsApp, e.g. Q7F3K
  job_id uuid not null references jobs(id) on delete cascade,
  contractor_id uuid not null references contractor_profiles(user_id),
  amount_cents int not null check (amount_cents > 0),
  price_type price_type not null,
  message text not null check (length(message) between 20 and 4000),
  earliest_start date,
  status quote_status not null default 'submitted',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, contractor_id)
);
create index quotes_job_idx on quotes(job_id);
alter table jobs add constraint jobs_accepted_quote_fk foreign key (accepted_quote_id) references quotes(id);

create table job_messages (
  id bigserial primary key,
  job_id uuid not null references jobs(id) on delete cascade,
  contractor_id uuid not null references contractor_profiles(user_id),
  sender_id uuid not null references users(id),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index job_messages_thread_idx on job_messages(job_id, contractor_id, id);

-- ───────────────────────── Notifications ─────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

-- ───────────────────────── Platform ─────────────────────────
create table background_jobs (
  id bigserial primary key,
  kind text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index background_jobs_ready_idx on background_jobs(run_at) where status = 'pending';

create table audit_log (
  id bigserial primary key,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log(entity_type, entity_id);

create table ai_usage (
  id bigserial primary key,
  intake_id uuid references intake_sessions(id) on delete set null,
  provider text not null,
  model text,
  operation text not null,
  input_tokens int,
  output_tokens int,
  latency_ms int not null,
  success boolean not null,
  error text,
  created_at timestamptz not null default now()
);

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

-- Single-row matching configuration, editable by admins.
create table matching_rules (
  id boolean primary key default true check (id),
  max_contractors_per_job int not null default 12 check (max_contractors_per_job between 1 and 100),
  max_new_job_notifications_per_day int not null default 15 check (max_new_job_notifications_per_day between 1 and 200),
  require_verified boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);
insert into matching_rules default values;

-- Reference categories (product data, not demo data).
insert into categories (slug, name_nl, description_nl, risk, sort_order) values
  ('schilderwerk',   'Schilderwerk',            'Binnen- en buitenschilderwerk, kozijnen, plafonds', 'normal', 10),
  ('tuinonderhoud',  'Tuinonderhoud',           'Snoeien, maaien, onkruid, tuin opruimen',          'normal', 20),
  ('bestrating',     'Bestrating',              'Terras, oprit, tegels en klinkers',                'normal', 30),
  ('loodgieter',     'Loodgieterswerk',         'Lekkages, kranen, afvoer, sanitair',               'normal', 40),
  ('elektra',        'Elektra',                 'Groepenkast, stopcontacten, verlichting',          'elevated', 50),
  ('dakwerk',        'Dakwerk',                 'Dakpannen, dakgoten, platte daken',                'elevated', 60),
  ('timmerwerk',     'Timmerwerk',              'Deuren, kozijnen, schuttingen, vloeren',           'normal', 70),
  ('stukadoor',      'Stukadoorswerk',          'Muren en plafonds stucen, sauzen',                 'normal', 80),
  ('badkamer',       'Badkamer renovatie',      'Complete of gedeeltelijke badkamerverbouwing',     'normal', 90),
  ('cv_installatie', 'CV en verwarming',        'CV-ketel, radiatoren, warmtepompen',               'elevated', 100),
  ('schoonmaak',     'Schoonmaak',              'Glazenwassen, opleveringsschoonmaak',              'normal', 110),
  ('asbest',         'Asbestinventarisatie en -sanering', 'Alleen door gecertificeerde bedrijven (SC-530)', 'specialist', 120);
