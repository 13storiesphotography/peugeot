-- Harden peugeot_connections: JWT clients must not touch this table.
-- The Next.js app uses the service-role client for all peugeot_connections I/O.
-- RLS policies remain as defense in depth for any future grants.

revoke all on table public.peugeot_connections from anon, authenticated;

-- Trigger function must not be callable via PostgREST.
revoke all on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Landing page no longer calls this RPC from the browser.
revoke all on function public.founder_spots_taken() from public;
revoke execute on function public.founder_spots_taken() from anon, authenticated;
grant execute on function public.founder_spots_taken() to service_role;

-- Defense in depth: force RLS for table owner paths (service_role still BYPASSRLS).
alter table public.peugeot_connections force row level security;
alter table public.vehicles force row level security;
alter table public.vehicle_state force row level security;
alter table public.vehicle_schedules force row level security;
alter table public.activity_log force row level security;
alter table public.charge_samples force row level security;
alter table public.entitlements force row level security;
alter table public.signups force row level security;
alter table public.page_views force row level security;
