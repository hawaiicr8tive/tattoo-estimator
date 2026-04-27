create table if not exists admin_config (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table admin_config enable row level security;

-- Only service role can read/write
