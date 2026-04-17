create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  first_name text not null,
  email text not null,
  style text not null,
  placement text not null,
  size text not null,
  is_color boolean not null,
  notes text,
  price_min integer not null,
  price_max integer not null,
  hours_min numeric(4,1) not null,
  hours_max numeric(4,1) not null,
  matched_artists text[],
  opted_in boolean not null default false,
  source text not null default 'estimator-v1'
);

-- Enable Row Level Security (service role bypasses this)
alter table leads enable row level security;

-- No public read/write — only service role can access
