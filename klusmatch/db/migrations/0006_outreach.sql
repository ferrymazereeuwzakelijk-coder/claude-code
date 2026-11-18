-- Contractor outreach (B2B acquisition). One row per company; never mailed twice unsolicited.
create type outreach_status as enum ('new', 'contacted', 'replied', 'signed_up', 'not_interested', 'opted_out', 'bounced');

create table outreach_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  legal_form text not null check (legal_form in ('B.V.', 'N.V.', 'Coöperatie', 'Stichting')),  -- legal persons only
  email citext not null unique,
  website text,
  city text,
  trades text[] not null default '{}',
  source_url text not null,              -- where the business address and legal form were found
  invite_code text not null unique,      -- personal sign-up link: /registreren?rol=vakman&uitnodiging=CODE
  status outreach_status not null default 'new',
  contacted_at timestamptz,
  last_status_at timestamptz,
  signed_up_user_id uuid references users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index outreach_status_idx on outreach_leads(status, created_at);

-- Addresses that must never be contacted again (kept even if the lead row is deleted).
create table outreach_suppressions (
  email citext primary key,
  reason text not null,
  created_at timestamptz not null default now()
);
