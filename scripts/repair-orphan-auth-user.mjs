#!/usr/bin/env node
/**
 * Backfill auth.users + profiles for Better Auth users created before the sync hook.
 * Usage: node scripts/repair-orphan-auth-user.mjs [userId]
 */
import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const pool = new pg.Pool({
  connectionString:
    env.DATABASE_URL ??
    "postgresql://chapmee:chapmee_local_password@localhost:5432/chapmee_local"
});

const userId = process.argv[2];
const query = userId
  ? pool.query('select id, email, name from "user" where id = $1', [userId])
  : pool.query(
      `select u.id, u.email, u.name
       from "user" u
       left join auth.users au on au.id = u.id::uuid
       left join public.profiles p on p.id = u.id::uuid
       where au.id is null or p.id is null`
    );

const { rows } = await query;
if (!rows.length) {
  console.log("No orphan users found.");
  await pool.end();
  process.exit(0);
}

for (const row of rows) {
  await pool.query(
    `insert into auth.users (id, email, created_at, updated_at)
     values ($1::uuid, $2, now(), now())
     on conflict (id) do update set email = excluded.email, updated_at = now()`,
    [row.id, row.email]
  );
  const displayName = row.name?.trim() || row.email.split("@")[0] || "Reader";
  await pool.query(
    `insert into public.profiles (id, display_name, username, role, created_at, updated_at)
     values ($1::uuid, $2, null, 'user'::public.profile_role, now(), now())
     on conflict (id) do update set
       display_name = coalesce(public.profiles.display_name, excluded.display_name),
       updated_at = now()`,
    [row.id, displayName]
  );
  console.log("Repaired", row.id, row.email);
}

if (rows.length) {
  console.log("\nTip: npm run profiles:backfill-usernames — gán username cho profile vừa sửa.");
}

await pool.end();
