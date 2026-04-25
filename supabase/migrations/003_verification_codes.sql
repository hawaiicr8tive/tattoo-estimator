-- Stores 4-digit email verification codes used by the estimator before
-- a lead is allowed to submit. Codes expire after a short window and
-- can only be used once.

create table if not exists verification_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code        text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists idx_verification_codes_email_created
  on verification_codes (email, created_at desc);

alter table verification_codes enable row level security;
-- service role bypasses RLS; no public policies needed
