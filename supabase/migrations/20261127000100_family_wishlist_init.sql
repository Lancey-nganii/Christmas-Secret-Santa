-- Family Christmas Wishlist: private tables + authenticated RPC boundary

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

create table if not exists app_private.families (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint families_name_length check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists app_private.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references app_private.families(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null constraint family_members_display_name_length check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  constraint family_members_family_id_id_key unique (family_id, id)
);

create table if not exists app_private.gifts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  owner_member_id uuid not null,
  name text not null constraint gifts_name_length check (char_length(btrim(name)) between 1 and 160),
  note text constraint gifts_note_length check (note is null or char_length(btrim(note)) between 1 and 500),
  store_url text constraint gifts_store_url_valid check (
    store_url is null
    or (char_length(store_url) <= 2048 and store_url ~* '^https?://[^\s]+$')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gifts_owner_family_fkey
    foreign key (family_id, owner_member_id)
    references app_private.family_members(family_id, id)
    on delete cascade,
  constraint gifts_family_id_owner_key unique (family_id, id, owner_member_id)
);

create table if not exists app_private.gift_picks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  gift_id uuid not null,
  giver_member_id uuid not null,
  recipient_member_id uuid not null,
  picked_at timestamptz not null default now(),
  constraint gift_picks_one_active_per_gift unique (gift_id),
  constraint gift_picks_one_per_giver_recipient unique (family_id, giver_member_id, recipient_member_id),
  constraint gift_picks_no_self_pick check (giver_member_id <> recipient_member_id),
  constraint gift_picks_gift_owner_match_fkey
    foreign key (family_id, gift_id, recipient_member_id)
    references app_private.gifts(family_id, id, owner_member_id)
    on delete restrict,
  constraint gift_picks_giver_family_fkey
    foreign key (family_id, giver_member_id)
    references app_private.family_members(family_id, id)
    on delete cascade
);

create index if not exists family_members_family_display_idx
  on app_private.family_members (family_id, lower(display_name), id);

create index if not exists gifts_owner_order_idx
  on app_private.gifts (owner_member_id, created_at asc, id asc);

create index if not exists gifts_family_owner_idx
  on app_private.gifts (family_id, owner_member_id);

create index if not exists gift_picks_family_gift_recipient_idx
  on app_private.gift_picks (family_id, gift_id, recipient_member_id);

create index if not exists gift_picks_recipient_idx
  on app_private.gift_picks (recipient_member_id);

create index if not exists gift_picks_giver_idx
  on app_private.gift_picks (giver_member_id);

-- Defense-in-depth: enable RLS with no public policies so direct table reads/writes stay closed.
alter table app_private.families enable row level security;
alter table app_private.family_members enable row level security;
alter table app_private.gifts enable row level security;
alter table app_private.gift_picks enable row level security;

revoke all on all tables in schema app_private from public, anon, authenticated;

-- Internal helpers
create or replace function app_private.require_current_member()
returns app_private.family_members
language plpgsql
stable
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_uid uuid;
  v_is_anonymous boolean;
  v_member app_private.family_members%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'ACCESS_DENIED: Sign in required.' using errcode = '42501';
  end if;

  v_is_anonymous := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  if v_is_anonymous then
    raise exception 'ACCESS_DENIED: Anonymous accounts cannot access family wishlists.' using errcode = '42501';
  end if;

  select fm.*
  into v_member
  from app_private.family_members fm
  where fm.auth_user_id = v_uid;

  if not found then
    raise exception 'ACCESS_DENIED: This account is not on the family roster.' using errcode = '42501';
  end if;

  return v_member;
end;
$$;

create or replace function app_private.normalize_gift_fields(
  p_name text,
  p_note text,
  p_store_url text
)
returns table (
  clean_name text,
  clean_note text,
  clean_store_url text
)
language plpgsql
immutable
set search_path = app_private, public, pg_temp
as $$
declare
  v_name text;
  v_note text;
  v_url text;
begin
  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null or char_length(v_name) > 160 then
    raise exception 'INVALID_GIFT_NAME: Gift name must be between 1 and 160 characters.' using errcode = '22023';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'INVALID_GIFT_NOTE: Gift note cannot exceed 500 characters.' using errcode = '22023';
  end if;

  v_url := nullif(btrim(coalesce(p_store_url, '')), '');
  if v_url is not null then
    if char_length(v_url) > 2048 or v_url !~* '^https?://[^\s]+$' then
      raise exception 'INVALID_STORE_URL: Store link must start with https:// or http://.' using errcode = '22023';
    end if;
  end if;

  return query select v_name, v_note, v_url;
end;
$$;

revoke all on function app_private.require_current_member() from public, anon, authenticated;
revoke all on function app_private.normalize_gift_fields(text, text, text) from public, anon, authenticated;

-- Public authenticated RPC surface
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
      'gift_count', v_viewer_gift_count
    ),
    'relatives', v_relatives
  );
end;
$$;

create or replace function public.get_wishlist(member_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_target app_private.family_members%rowtype;
  v_is_own boolean;
  v_viewer_picked_gift_id uuid;
  v_gifts jsonb;
begin
  v_member := app_private.require_current_member();

  select fm.*
  into v_target
  from app_private.family_members fm
  where fm.id = get_wishlist.member_id
    and fm.family_id = v_member.family_id;

  if not found then
    raise exception 'MEMBER_NOT_FOUND: Relative was not found in your family.' using errcode = 'P0002';
  end if;

  v_is_own := (v_target.id = v_member.id);

  if not v_is_own then
    select gp.gift_id
    into v_viewer_picked_gift_id
    from app_private.gift_picks gp
    where gp.family_id = v_member.family_id
      and gp.giver_member_id = v_member.id
      and gp.recipient_member_id = v_target.id;
  else
    v_viewer_picked_gift_id := null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'note', g.note,
        'store_url', g.store_url,
        'created_at', g.created_at,
        'updated_at', g.updated_at,
        'status', case
          when gp.id is null then 'available'
          when gp.giver_member_id = v_member.id then 'picked_by_you'
          else 'already_picked'
        end,
        'can_pick', (not v_is_own) and gp.id is null and v_viewer_picked_gift_id is null,
        'can_edit', v_is_own and gp.id is null,
        'pick_id', case
          when gp.giver_member_id = v_member.id then gp.id
          else null
        end
      )
      order by g.created_at asc, g.id asc
    ),
    '[]'::jsonb
  )
  into v_gifts
  from app_private.gifts g
  left join app_private.gift_picks gp
    on gp.gift_id = g.id
  where g.owner_member_id = v_target.id
    and g.family_id = v_member.family_id;

  return jsonb_build_object(
    'member_id', v_target.id,
    'display_name', v_target.display_name,
    'is_own_wishlist', v_is_own,
    'viewer_picked_gift_id', v_viewer_picked_gift_id,
    'gifts', v_gifts
  );
end;
$$;

create or replace function public.add_gift(
  name text,
  note text default null,
  store_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_clean_name text;
  v_clean_note text;
  v_clean_store_url text;
  v_gift app_private.gifts%rowtype;
begin
  v_member := app_private.require_current_member();

  select f.clean_name, f.clean_note, f.clean_store_url
  into v_clean_name, v_clean_note, v_clean_store_url
  from app_private.normalize_gift_fields(add_gift.name, add_gift.note, add_gift.store_url) f;

  insert into app_private.gifts (family_id, owner_member_id, name, note, store_url)
  values (v_member.family_id, v_member.id, v_clean_name, v_clean_note, v_clean_store_url)
  returning * into v_gift;

  return jsonb_build_object(
    'gift', jsonb_build_object(
      'id', v_gift.id,
      'name', v_gift.name,
      'note', v_gift.note,
      'store_url', v_gift.store_url,
      'created_at', v_gift.created_at,
      'updated_at', v_gift.updated_at,
      'status', 'available',
      'can_pick', false,
      'can_edit', true,
      'pick_id', null
    )
  );
end;
$$;

create or replace function public.update_gift(
  gift_id uuid,
  name text,
  note text default null,
  store_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_gift app_private.gifts%rowtype;
  v_clean_name text;
  v_clean_note text;
  v_clean_store_url text;
begin
  v_member := app_private.require_current_member();

  select g.*
  into v_gift
  from app_private.gifts g
  where g.id = update_gift.gift_id
    and g.family_id = v_member.family_id
  for update;

  if not found then
    raise exception 'GIFT_NOT_FOUND: Gift was not found.' using errcode = 'P0002';
  end if;

  if v_gift.owner_member_id <> v_member.id then
    raise exception 'NOT_GIFT_OWNER: You can only edit gifts on your own wishlist.' using errcode = '42501';
  end if;

  if exists (select 1 from app_private.gift_picks gp where gp.gift_id = v_gift.id) then
    raise exception 'GIFT_LOCKED_BY_PICK: This gift has already been picked and cannot be edited.' using errcode = 'P0001';
  end if;

  select f.clean_name, f.clean_note, f.clean_store_url
  into v_clean_name, v_clean_note, v_clean_store_url
  from app_private.normalize_gift_fields(update_gift.name, update_gift.note, update_gift.store_url) f;

  update app_private.gifts g
  set name = v_clean_name,
      note = v_clean_note,
      store_url = v_clean_store_url,
      updated_at = now()
  where g.id = v_gift.id
  returning * into v_gift;

  return jsonb_build_object(
    'gift', jsonb_build_object(
      'id', v_gift.id,
      'name', v_gift.name,
      'note', v_gift.note,
      'store_url', v_gift.store_url,
      'created_at', v_gift.created_at,
      'updated_at', v_gift.updated_at,
      'status', 'available',
      'can_pick', false,
      'can_edit', true,
      'pick_id', null
    )
  );
end;
$$;

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

create or replace function public.pick_gift(gift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  v_member app_private.family_members%rowtype;
  v_gift app_private.gifts%rowtype;
  v_existing app_private.gift_picks%rowtype;
  v_other app_private.gift_picks%rowtype;
  v_new_pick_id uuid;
  v_constraint text;
begin
  v_member := app_private.require_current_member();

  select g.*
  into v_gift
  from app_private.gifts g
  where g.id = pick_gift.gift_id
    and g.family_id = v_member.family_id
  for update;

  if not found then
    raise exception 'GIFT_NOT_FOUND: Gift was not found.' using errcode = 'P0002';
  end if;

  if v_gift.owner_member_id = v_member.id then
    raise exception 'CANNOT_PICK_OWN_GIFT: You cannot pick a gift from your own wishlist.' using errcode = '42501';
  end if;

  select gp.*
  into v_existing
  from app_private.gift_picks gp
  where gp.gift_id = v_gift.id;

  if found then
    if v_existing.giver_member_id = v_member.id then
      return jsonb_build_object(
        'outcome', 'picked',
        'idempotent', true,
        'pick_id', v_existing.id,
        'gift_id', v_gift.id,
        'recipient_member_id', v_gift.owner_member_id
      );
    end if;

    return jsonb_build_object(
      'outcome', 'already_picked',
      'gift_id', v_gift.id,
      'recipient_member_id', v_gift.owner_member_id
    );
  end if;

  select gp.*
  into v_other
  from app_private.gift_picks gp
  where gp.family_id = v_member.family_id
    and gp.giver_member_id = v_member.id
    and gp.recipient_member_id = v_gift.owner_member_id;

  if found then
    return jsonb_build_object(
      'outcome', 'recipient_limit',
      'gift_id', v_gift.id,
      'recipient_member_id', v_gift.owner_member_id,
      'existing_pick_id', v_other.id,
      'existing_gift_id', v_other.gift_id
    );
  end if;

  begin
    insert into app_private.gift_picks (family_id, gift_id, giver_member_id, recipient_member_id)
    values (v_member.family_id, v_gift.id, v_member.id, v_gift.owner_member_id)
    returning id into v_new_pick_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'gift_picks_one_active_per_gift' then
        select gp.*
        into v_existing
        from app_private.gift_picks gp
        where gp.gift_id = v_gift.id;

        if found and v_existing.giver_member_id = v_member.id then
          return jsonb_build_object(
            'outcome', 'picked',
            'idempotent', true,
            'pick_id', v_existing.id,
            'gift_id', v_gift.id,
            'recipient_member_id', v_gift.owner_member_id
          );
        end if;

        return jsonb_build_object(
          'outcome', 'already_picked',
          'gift_id', v_gift.id,
          'recipient_member_id', v_gift.owner_member_id
        );
      elsif v_constraint = 'gift_picks_one_per_giver_recipient' then
        return jsonb_build_object(
          'outcome', 'recipient_limit',
          'gift_id', v_gift.id,
          'recipient_member_id', v_gift.owner_member_id
        );
      else
        raise;
      end if;
  end;

  return jsonb_build_object(
    'outcome', 'picked',
    'idempotent', false,
    'pick_id', v_new_pick_id,
    'gift_id', v_gift.id,
    'recipient_member_id', v_gift.owner_member_id
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

revoke all on function public.get_family() from public, anon;
revoke all on function public.get_wishlist(uuid) from public, anon;
revoke all on function public.add_gift(text, text, text) from public, anon;
revoke all on function public.update_gift(uuid, text, text, text) from public, anon;
revoke all on function public.remove_gift(uuid) from public, anon;
revoke all on function public.pick_gift(uuid) from public, anon;
revoke all on function public.undo_pick(uuid) from public, anon;

grant execute on function public.get_family() to authenticated;
grant execute on function public.get_wishlist(uuid) to authenticated;
grant execute on function public.add_gift(text, text, text) to authenticated;
grant execute on function public.update_gift(uuid, text, text, text) to authenticated;
grant execute on function public.remove_gift(uuid) to authenticated;
grant execute on function public.pick_gift(uuid) to authenticated;
grant execute on function public.undo_pick(uuid) to authenticated;
