-- Run this once in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/xjaucojgcuogzsjxtbds/sql)
-- to deploy the two row-removing RPCs (public.remove_gift and public.undo_pick).

create or replace function public.remove_gift(gift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_gift app_private.gifts%rowtype;
begin
  v_member := app_private.require_current_member();

  select g.*
  into v_gift
  from app_private.gifts g
  where g.id = remove_gift.gift_id
    and g.family_id = v_member.family_id
  for update;

  if not found then
    raise exception 'GIFT_NOT_FOUND: Gift was not found.' using errcode = 'P0002';
  end if;

  if v_gift.owner_member_id <> v_member.id then
    raise exception 'NOT_GIFT_OWNER: You can only remove gifts from your own wishlist.' using errcode = '42501';
  end if;

  if exists (select 1 from app_private.gift_picks gp where gp.gift_id = v_gift.id) then
    raise exception 'GIFT_LOCKED_BY_PICK: This gift has already been picked and cannot be removed.' using errcode = 'P0001';
  end if;

  delete from app_private.gifts g
  where g.id = v_gift.id;

  return jsonb_build_object(
    'removed', true,
    'gift_id', v_gift.id
  );
end;
$$;

create or replace function public.undo_pick(pick_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_pick app_private.gift_picks%rowtype;
begin
  v_member := app_private.require_current_member();

  select gp.*
  into v_pick
  from app_private.gift_picks gp
  where gp.id = undo_pick.pick_id
    and gp.family_id = v_member.family_id
  for update;

  if not found then
    return jsonb_build_object(
      'outcome', 'already_undone',
      'pick_id', undo_pick.pick_id
    );
  end if;

  if v_pick.giver_member_id <> v_member.id then
    raise exception 'NOT_PICK_GIVER: You can only undo your own gift pick.' using errcode = '42501';
  end if;

  delete from app_private.gift_picks gp
  where gp.id = v_pick.id;

  return jsonb_build_object(
    'outcome', 'undone',
    'pick_id', v_pick.id,
    'gift_id', v_pick.gift_id,
    'recipient_member_id', v_pick.recipient_member_id
  );
end;
$$;

revoke all on function public.remove_gift(uuid) from public, anon;
revoke all on function public.undo_pick(uuid) from public, anon;

grant execute on function public.remove_gift(uuid) to authenticated;
grant execute on function public.undo_pick(uuid) to authenticated;
