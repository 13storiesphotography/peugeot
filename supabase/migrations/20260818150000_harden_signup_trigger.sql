-- Signup must succeed even if the audit insert fails.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.signups (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user failed: %', sqlerrm;
    return new;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant insert, select on table public.signups to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;
