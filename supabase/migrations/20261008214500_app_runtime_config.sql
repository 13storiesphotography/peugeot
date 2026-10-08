-- App-side runtime config readable only via service role (no client grants).
-- Used as a fallback cron auth secret when Vercel CRON_SECRET drifts from
-- the value embedded in Supabase pg_cron jobs.
create table if not exists public.app_runtime_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_runtime_config enable row level security;
alter table public.app_runtime_config force row level security;

revoke all on table public.app_runtime_config from anon, authenticated;
grant select, insert, update, delete on table public.app_runtime_config to service_role;
