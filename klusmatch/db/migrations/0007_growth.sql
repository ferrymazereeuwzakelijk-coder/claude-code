-- Growth features: founding members, contractor referrals, WhatsApp job alerts for contractors.

-- Founding member number (1..N) is assigned when a contractor is verified, in order of verification.
alter table contractor_profiles add column founding_member_no int unique;
-- Personal referral code, shared by contractors with colleagues.
alter table contractor_profiles add column referral_code text unique;
-- Opt-in for new-job alerts via WhatsApp, with the moment of consent.
alter table contractor_profiles add column whatsapp_alerts boolean not null default false;
alter table contractor_profiles add column whatsapp_alerts_consent_at timestamptz;

-- Who referred this account (a contractor), set at registration via ?ref=CODE.
alter table users add column referred_by uuid references users(id) on delete set null;
create index users_referred_by_idx on users(referred_by) where referred_by is not null;

-- Backfill referral codes for existing contractors.
update contractor_profiles set referral_code = upper(substr(md5(random()::text || user_id::text), 1, 8)) where referral_code is null;
