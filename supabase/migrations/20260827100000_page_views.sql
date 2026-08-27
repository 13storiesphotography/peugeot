-- First-party website traffic for the owner stats dashboard
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  visitor_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx
  on public.page_views (created_at desc);

create index if not exists page_views_path_created_at_idx
  on public.page_views (path, created_at desc);

create index if not exists page_views_visitor_created_at_idx
  on public.page_views (visitor_id, created_at desc);

alter table public.page_views enable row level security;

-- No client policies: inserts/selects go through service role only.
