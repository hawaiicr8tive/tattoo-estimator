-- Tracks Google Gemini Batch API jobs for the Fusion Lab bulk-image flow.
-- Real-time image-gen results go straight into the fusion entry's images
-- array (admin_config[trends:fusion-history]), but batch jobs need a separate
-- table because they're long-running (0-24h) and need persistent status
-- across page reloads + cron polling.
create table if not exists fusion_batch_jobs (
  id text primary key,
  job_name text not null,              -- Google's batch job name, e.g. "batches/xyz"
  fusion_entry_id text not null,       -- which fusion entry this batch belongs to
  industry_id text not null,
  model text not null,                 -- gemini-3-pro-image-preview or gemini-3.1-flash-image-preview
  count integer not null,              -- number of images requested
  chaos_direction text,                -- optional user-provided creative direction
  prompts_jsonl text not null,         -- the JSONL that was uploaded (for audit/retry)
  status text not null default 'pending',
  -- pending|running|succeeded|failed|cancelled|expired
  error text,
  added_image_count integer default 0, -- images successfully attached so far
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_fusion_batch_jobs_status on fusion_batch_jobs(status);
create index if not exists idx_fusion_batch_jobs_fusion on fusion_batch_jobs(fusion_entry_id);
create index if not exists idx_fusion_batch_jobs_created on fusion_batch_jobs(created_at desc);

alter table fusion_batch_jobs enable row level security;

-- Only service role can read/write — same pattern as admin_config.
