-- Pro entitlements for Stripe / Founder checkout
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  source text not null default 'stripe' check (source in ('stripe', 'founder', 'manual')),
  status text not null default 'active' check (status in ('active', 'expired', 'canceled')),
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
  on public.entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.founder_spots_taken()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.entitlements
  where source = 'founder'
    and status = 'active'
    and (current_period_end is null or current_period_end > now());
$$;

revoke all on function public.founder_spots_taken() from public;
grant execute on function public.founder_spots_taken() to anon, authenticated;
