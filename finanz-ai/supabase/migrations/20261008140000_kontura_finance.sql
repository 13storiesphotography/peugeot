-- Kontura finance schema (RLS on). Apply in a dedicated Supabase project — not the Peugeot one.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('finapi', 'tink', 'mock')),
  status text not null default 'not_connected',
  bank_label text,
  -- Encrypted provider tokens must live server-side only; never select from client.
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bank_connections enable row level security;

-- Clients may see connection status, not token columns (revoke later via view if needed).
create policy bank_connections_select_own on public.bank_connections
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid references public.bank_connections (id) on delete set null,
  name text not null,
  iban_masked text,
  bank_name text,
  balance_cents bigint not null default 0,
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy accounts_all_own on public.accounts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  booked_at date not null,
  amount_cents bigint not null,
  counterparty text,
  purpose text,
  category text not null default 'other',
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_booked_idx
  on public.transactions (user_id, booked_at desc);

alter table public.transactions enable row level security;

create policy transactions_all_own on public.transactions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  label text not null,
  limit_cents bigint not null,
  month text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category, month)
);

alter table public.budgets enable row level security;

create policy budgets_all_own on public.budgets
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Profile bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
