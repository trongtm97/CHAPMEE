/**
 * Gán username cho mọi profile thiếu / không hợp lệ / trùng.
 *
 * Usage:
 *   npm run profiles:backfill-usernames
 *   npm run profiles:backfill-usernames -- --dry-run
 */

import { loadEnvLocal } from "./lib/load-env-local";
import {
  allocateProfileUsername,
  applyProfileUsername,
  profileNeedsUsername
} from "@/lib/profile/allocate-profile-username";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  created_at: Date;
};

const dryRun = process.argv.includes("--dry-run");

async function loadProfiles(): Promise<ProfileRow[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<ProfileRow>(
    `select id, username, display_name, created_at
     from public.profiles
     order by created_at asc nulls last, id asc`
  );
  return rows;
}

/** Giữ profile tạo sớm nhất; các bản trùng username sẽ được gán lại. */
async function findDuplicateUsernameUserIds(): Promise<Set<string>> {
  const pool = getPgPool();
  const { rows } = await pool.query<{ username: string; ids: string[] }>(
    `select lower(trim(username)) as username, array_agg(id::text order by created_at asc, id asc) as ids
     from public.profiles
     where username is not null and trim(username) <> ''
     group by lower(trim(username))
     having count(*) > 1`
  );

  const reassign = new Set<string>();
  for (const row of rows) {
    const [, ...duplicates] = row.ids;
    for (const id of duplicates) {
      reassign.add(id);
    }
  }
  return reassign;
}

async function main() {
  const duplicateIds = await findDuplicateUsernameUserIds();
  const profiles = await loadProfiles();

  let skipped = 0;
  let updated = 0;
  let failed = 0;

  console.log(
    dryRun
      ? "[dry-run] Backfill profile usernames…"
      : "Backfill profile usernames…"
  );
  console.log(`Profiles: ${profiles.length}, duplicate slots: ${duplicateIds.size}`);

  for (const profile of profiles) {
    const mustReassign =
      duplicateIds.has(profile.id) || profileNeedsUsername(profile.username);

    if (!mustReassign) {
      skipped += 1;
      continue;
    }

    const allocated = await allocateProfileUsername(profile.id, profile.display_name);
    if (!allocated) {
      failed += 1;
      console.warn(`  ! ${profile.id} — could not allocate username`);
      continue;
    }

    const previous = profile.username?.trim() || "(empty)";
    if (dryRun) {
      console.log(`  ~ ${profile.id}: ${previous} → ${allocated}`);
      updated += 1;
      continue;
    }

    const ok = await applyProfileUsername(profile.id, allocated);
    if (!ok) {
      failed += 1;
      console.warn(`  ! ${profile.id} — update failed`);
      continue;
    }

    console.log(`  + ${profile.id}: ${previous} → ${allocated}`);
    updated += 1;
  }

  console.log(`Done. updated=${updated} skipped=${skipped} failed=${failed}`);
  await closePgPool();
}

main().catch((error) => {
  console.error(error);
  void closePgPool();
  process.exit(1);
});
