-- Live updates: private per-family Realtime Broadcast invalidation signals.
-- Payloads only carry { scope, member_id } (never gift text or giver identities);
-- clients re-fetch via get_family()/get_wishlist() so server-side privacy rules still apply.

create or replace function app_private.broadcast_family_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_family_id uuid;
  v_member_id uuid;
  v_scope text;
begin
  v_row := coalesce(to_jsonb(new), to_jsonb(old));
  v_family_id := (v_row ->> 'family_id')::uuid;

  if tg_table_name = 'gifts' then
    v_scope := 'wishlist';
    v_member_id := (v_row ->> 'owner_member_id')::uuid;
  elsif tg_table_name = 'gift_picks' then
    v_scope := 'wishlist';
    v_member_id := (v_row ->> 'recipient_member_id')::uuid;
  else
    v_scope := 'family';
    v_member_id := (v_row ->> 'id')::uuid;
  end if;

  if v_family_id is not null then
    perform realtime.send(
      jsonb_build_object('scope', v_scope, 'member_id', v_member_id),
      'family_sync',
      'family:' || v_family_id::text,
      true
    );
  end if;

  return null;
end;
$$;

revoke all on function app_private.broadcast_family_change() from public, anon, authenticated;

create or replace trigger gifts_broadcast_family_change
after insert or update or delete on app_private.gifts
for each row execute function app_private.broadcast_family_change();

create or replace trigger gift_picks_broadcast_family_change
after insert or update or delete on app_private.gift_picks
for each row execute function app_private.broadcast_family_change();

create or replace trigger family_members_broadcast_family_change
after insert or update or delete on app_private.family_members
for each row execute function app_private.broadcast_family_change();

-- Authorization helper used by the realtime.messages RLS policy.
create or replace function app_private.can_receive_family_topic(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.family_members fm
    where fm.auth_user_id = (select auth.uid())
      and p_topic = 'family:' || fm.family_id::text
  );
$$;

revoke all on function app_private.can_receive_family_topic(text) from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.can_receive_family_topic(text) to authenticated;

create policy "family members receive their family broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and app_private.can_receive_family_topic((select realtime.topic()))
);
