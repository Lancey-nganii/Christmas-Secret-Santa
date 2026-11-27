-- Minimal read-only heartbeat table queried by Vercel /api/keep-alive cron
-- so Supabase registers real Postgres activity and stays awake on Free Tier.

create table if not exists public.app_heartbeat (
  id integer primary key check (id = 1),
  status text not null default 'awake'
);

insert into public.app_heartbeat (id, status)
values (1, 'awake')
on conflict (id) do nothing;

alter table public.app_heartbeat enable row level security;

revoke all on table public.app_heartbeat from public, anon, authenticated;
grant select on table public.app_heartbeat to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_heartbeat'
      and policyname = 'allow public read heartbeat'
  ) then
    create policy "allow public read heartbeat"
    on public.app_heartbeat
    for select
    to anon, authenticated
    using (true);
  end if;
end
$$;
