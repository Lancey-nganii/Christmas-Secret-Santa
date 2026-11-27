-- Add public.get_my_picks() RPC and viewer.pick_count in public.get_family()
-- Strictly returns only picks belonging to the authenticated giver (never other givers).

create or replace function public.get_family()
returns jsonb
language plpgsql
stable
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_family app_private.families%rowtype;
  v_viewer_gift_count integer;
  v_viewer_pick_count integer;
  v_relatives jsonb;
begin
  v_member := app_private.require_current_member();

  select f.*
  into v_family
  from app_private.families f
  where f.id = v_member.family_id;

  select count(*)::int
  into v_viewer_gift_count
  from app_private.gifts g
  where g.owner_member_id = v_member.id;

  select count(*)::int
  into v_viewer_pick_count
  from app_private.gift_picks gp
  where gp.family_id = v_member.family_id
    and gp.giver_member_id = v_member.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member_id', fm.id,
        'display_name', fm.display_name,
        'gift_count', coalesce(gc.gift_count, 0),
        'has_wishlist', coalesce(gc.gift_count, 0) > 0,
        'picked_by_viewer', vp.id is not null
      )
      order by lower(fm.display_name) asc, fm.id asc
    ),
    '[]'::jsonb
  )
  into v_relatives
  from app_private.family_members fm
  left join lateral (
    select count(*)::int as gift_count
    from app_private.gifts g
    where g.owner_member_id = fm.id
  ) gc on true
  left join app_private.gift_picks vp
    on vp.family_id = v_member.family_id
    and vp.giver_member_id = v_member.id
    and vp.recipient_member_id = fm.id
  where fm.family_id = v_member.family_id
    and fm.id <> v_member.id;

  return jsonb_build_object(
    'family', jsonb_build_object(
      'id', v_family.id,
      'name', v_family.name
    ),
    'viewer', jsonb_build_object(
      'member_id', v_member.id,
      'display_name', v_member.display_name,
      'username', v_member.username,
      'is_organizer', v_member.is_organizer,
      'gift_count', v_viewer_gift_count,
      'pick_count', v_viewer_pick_count
    ),
    'relatives', v_relatives
  );
end;
$$;

create or replace function public.get_my_picks()
returns jsonb
language plpgsql
stable
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_picks jsonb;
begin
  v_member := app_private.require_current_member();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'pick_id', gp.id,
        'picked_at', gp.picked_at,
        'recipient_member_id', recipient.id,
        'recipient_display_name', recipient.display_name,
        'gift_id', g.id,
        'gift_name', g.name,
        'gift_note', g.note,
        'store_url', g.store_url
      )
      order by lower(recipient.display_name) asc, gp.picked_at asc, gp.id asc
    ),
    '[]'::jsonb
  )
  into v_picks
  from app_private.gift_picks gp
  join app_private.gifts g
    on g.id = gp.gift_id
    and g.family_id = gp.family_id
  join app_private.family_members recipient
    on recipient.id = gp.recipient_member_id
    and recipient.family_id = gp.family_id
  where gp.family_id = v_member.family_id
    and gp.giver_member_id = v_member.id;

  return jsonb_build_object('picks', v_picks);
end;
$$;

revoke all on function public.get_family() from public, anon;
grant execute on function public.get_family() to authenticated;

revoke all on function public.get_my_picks() from public, anon;
grant execute on function public.get_my_picks() to authenticated;
