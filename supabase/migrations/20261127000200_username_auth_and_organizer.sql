-- Family Christmas Wishlist: Username + Password Auth & Organizer Management

alter table app_private.family_members
  add column if not exists username text;

alter table app_private.family_members
  add column if not exists is_organizer boolean not null default false;

update app_private.family_members
set
  username = 'lance',
  is_organizer = true
where id = 'b5b10c27-bdd5-4530-9e13-8a9b92d29627';

update app_private.family_members
set
  username = 'marianne',
  is_organizer = false
where id = '1368d4af-5b3e-4410-8272-7f491869374b';

alter table app_private.family_members
  alter column username set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'family_members_username_format'
      and conrelid = 'app_private.family_members'::regclass
  ) then
    alter table app_private.family_members
      add constraint family_members_username_format
      check (username ~ '^[a-z0-9][a-z0-9._-]{1,31}$');
  end if;
end
$$;

create unique index if not exists family_members_username_lower_uidx
  on app_private.family_members (lower(username));

-- Include viewer username and organizer flag in public.get_family()
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
      'gift_count', v_viewer_gift_count
    ),
    'relatives', v_relatives
  );
end;
$$;

revoke all on function public.get_family() from public, anon;
grant execute on function public.get_family() to authenticated;

-- Service-role-only organizer helpers (inaccessible to anon and authenticated roles)
create or replace function public.admin_get_organizer_context(p_auth_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
begin
  select fm.*
  into v_member
  from app_private.family_members fm
  where fm.auth_user_id = p_auth_user_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'member_id', v_member.id,
    'family_id', v_member.family_id,
    'display_name', v_member.display_name,
    'username', v_member.username,
    'is_organizer', v_member.is_organizer
  );
end;
$$;

create or replace function public.admin_list_family_members(p_family_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_members jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member_id', fm.id,
        'auth_user_id', fm.auth_user_id,
        'display_name', fm.display_name,
        'username', fm.username,
        'is_organizer', fm.is_organizer,
        'created_at', fm.created_at
      )
      order by fm.is_organizer desc, lower(fm.display_name) asc, fm.id asc
    ),
    '[]'::jsonb
  )
  into v_members
  from app_private.family_members fm
  where fm.family_id = p_family_id;

  return v_members;
end;
$$;

create or replace function public.admin_create_family_member(
  p_family_id uuid,
  p_auth_user_id uuid,
  p_display_name text,
  p_username text,
  p_is_organizer boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_display_name text;
  v_trimmed_username text;
  v_username text;
  v_row app_private.family_members%rowtype;
begin
  v_display_name := nullif(btrim(coalesce(p_display_name, '')), '');
  if v_display_name is null or char_length(v_display_name) > 80 then
    raise exception 'INVALID_DISPLAY_NAME: Display name must be between 1 and 80 characters.' using errcode = '22023';
  end if;

  v_trimmed_username := btrim(coalesce(p_username, ''));
  if left(v_trimmed_username, 1) = '@' then
    v_trimmed_username := substr(v_trimmed_username, 2);
  end if;
  v_username := lower(v_trimmed_username);

  if v_username !~ '^[a-z0-9][a-z0-9._-]{1,31}$' then
    raise exception 'INVALID_USERNAME: Username must be 2 to 32 characters using letters, numbers, periods, underscores, or hyphens.' using errcode = '22023';
  end if;

  insert into app_private.family_members (
    family_id,
    auth_user_id,
    display_name,
    username,
    is_organizer
  )
  values (
    p_family_id,
    p_auth_user_id,
    v_display_name,
    v_username,
    coalesce(p_is_organizer, false)
  )
  returning *
  into v_row;

  return jsonb_build_object(
    'member_id', v_row.id,
    'display_name', v_row.display_name,
    'username', v_row.username,
    'is_organizer', v_row.is_organizer
  );
end;
$$;

revoke all on function public.admin_get_organizer_context(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_organizer_context(uuid) to service_role;

revoke all on function public.admin_list_family_members(uuid) from public, anon, authenticated;
grant execute on function public.admin_list_family_members(uuid) to service_role;

revoke all on function public.admin_create_family_member(uuid, uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_create_family_member(uuid, uuid, text, text, boolean) to service_role;
