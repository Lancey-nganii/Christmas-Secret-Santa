/**
 * Organizer roster setup helper for Username + Password authentication.
 *
 * Usage:
 *   SUPABASE_URL="https://xjaucojgcuogzsjxtbds.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="..." \
 *   node scripts/setup-roster.mjs path/to/roster.json
 *
 * roster.json shape:
 * {
 *   "familyName": "Macorol Family",
 *   "members": [
 *     { "displayName": "Lance", "username": "lance", "password": "...", "isOrganizer": true },
 *     { "displayName": "Marianne", "username": "marianne", "password": "..." }
 *   ]
 * }
 */

import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const INTERNAL_AUTH_DOMAIN = 'macorol.wishlist';
const [, , rosterPath] = process.argv;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!rosterPath || !supabaseUrl || !serviceRoleKey) {
  console.error(
    'Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setup-roster.mjs <roster.json>'
  );
  process.exit(1);
}

const raw = await readFile(rosterPath, 'utf8');
const roster = JSON.parse(raw);

if (!roster?.familyName || !Array.isArray(roster.members) || roster.members.length === 0) {
  console.error('roster.json must include "familyName" and a non-empty "members" array.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const existingUsersByEmail = new Map();
let page = 1;
while (true) {
  const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  for (const user of data.users) {
    if (user.email) existingUsersByEmail.set(user.email.toLowerCase(), user);
  }
  if (data.users.length < 200) break;
  page += 1;
}

const resolvedMembers = [];
for (const member of roster.members) {
  const username = String(member.username || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
  const displayName = String(member.displayName || '').trim();
  const password = String(member.password || '');
  const isOrganizer = Boolean(member.isOrganizer);

  if (!username || !displayName || password.length < 6) {
    throw new Error(`Invalid member entry (need displayName, username, password >= 6): ${JSON.stringify(member)}`);
  }

  const internalEmail = `${username}@${INTERNAL_AUTH_DOMAIN}`;
  let user = existingUsersByEmail.get(internalEmail);
  if (!user) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, username },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created Auth user for ${displayName} (@${username}) (${user.id})`);
  } else {
    console.log(`Found existing Auth user for ${displayName} (@${username}) (${user.id})`);
  }
  resolvedMembers.push({ displayName, username, isOrganizer, authUserId: user.id });
}

const esc = (value) => value.replace(/'/g, "''");
const valuesSql = resolvedMembers
  .map(
    (m) =>
      `  ('${m.authUserId}'::uuid, '${esc(m.displayName)}', '${esc(m.username)}', ${m.isOrganizer})`
  )
  .join(',\n');

console.log('\nRun the SQL below in Supabase SQL Editor (keeps app_private unexposed):\n');
console.log(`begin;
with target_family as (
  insert into app_private.families (name)
  values ('${esc(roster.familyName.trim())}')
  returning id
),
roster(auth_user_id, display_name, username, is_organizer) as (
  values
${valuesSql}
)
insert into app_private.family_members (family_id, auth_user_id, display_name, username, is_organizer)
select tf.id, r.auth_user_id, r.display_name, r.username, r.is_organizer
from target_family tf
cross join roster r
on conflict (auth_user_id) do update
set
  display_name = excluded.display_name,
  username = excluded.username,
  is_organizer = excluded.is_organizer;
commit;`);
