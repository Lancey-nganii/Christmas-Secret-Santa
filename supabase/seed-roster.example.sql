-- Example organizer SQL to create a family and link pre-created auth.users accounts.
-- Run as postgres / service role in the Supabase SQL Editor after creating the Auth users
-- (or use the in-app Manage family screen / scripts/setup-roster.mjs).

begin;

with new_family as (
  insert into app_private.families (name)
  values ('Macorol Family')
  returning id
),
invited(email, display_name, username, is_organizer) as (
  values
    ('lance@macorol.wishlist', 'Lance', 'lance', true),
    ('marianne@macorol.wishlist', 'Marianne', 'marianne', false)
)
insert into app_private.family_members (
  family_id,
  auth_user_id,
  display_name,
  username,
  is_organizer
)
select nf.id, u.id, i.display_name, i.username, i.is_organizer
from new_family nf
cross join invited i
join auth.users u on lower(u.email) = lower(i.email)
on conflict (auth_user_id) do update
set
  display_name = excluded.display_name,
  username = excluded.username,
  is_organizer = excluded.is_organizer;

commit;
