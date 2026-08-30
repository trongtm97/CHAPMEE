#!/usr/bin/env node
/**
 * Quick health check for local ChapMee stack.
 * Usage: node scripts/verify-local.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

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
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ name, ok: false, message });
    console.error(`✗ ${name}: ${message}`);
  }
}

await check("BETTER_AUTH_SECRET set", async () => {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.includes("generate_with_openssl")) {
    throw new Error("Set a real BETTER_AUTH_SECRET in .env.local");
  }
});

await check("DATABASE_URL connects", async () => {
  const url = env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const r = await pool.query("select 1 as ok");
    if (r.rows[0]?.ok !== 1) throw new Error("unexpected result");
  } finally {
    await pool.end();
  }
});

await check("PostgREST responds", async () => {
  const url = (env.POSTGREST_URL ?? "http://127.0.0.1:54321").replace(/\/$/, "");
  const res = await fetch(`${url}/`);
  if (!res.ok && res.status !== 404) {
    throw new Error(`HTTP ${res.status}`);
  }
});

await check("POSTGREST_JWT_SECRET set", async () => {
  const secret =
    env.POSTGREST_JWT_SECRET ?? env.PGRST_JWT_SECRET ?? env.BETTER_AUTH_SECRET;
  if (!secret || secret.includes("generate_with_openssl")) {
    throw new Error(
      "Set POSTGREST_JWT_SECRET in .env.local (match PGRST_JWT_SECRET in docker-compose.local.yml)"
    );
  }
});

if (env.REDIS_URL) {
  await check("Redis PING", async () => {
    const { default: Redis } = await import("redis");
    const client = Redis.createClient({ url: env.REDIS_URL });
    client.on("error", () => {});
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    if (pong !== "PONG") throw new Error(`unexpected ${pong}`);
  });
} else {
  console.log("· REDIS_URL not set — chapter cache uses in-memory only");
}

await check("Storage schema (episodes S3 columns)", async () => {
  const url = env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const { rows } = await pool.query(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'episodes'
        and column_name in ('content_object_key', 'plain_text_preview', 'content_hash')
    `);
    if (rows.length < 3) {
      throw new Error("Missing episode storage columns — run npm run db:migrate");
    }
  } finally {
    await pool.end();
  }
});

await check("Import pipeline tables", async () => {
  const url = env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const { rows } = await pool.query(`
      select to_regclass('public.import_jobs') as jobs,
             to_regclass('public.import_items') as items
    `);
    const row = rows[0];
    if (!row?.jobs || !row?.items) {
      throw new Error("import_jobs/import_items missing — run npm run db:migrate");
    }
  } finally {
    await pool.end();
  }
});

await check("MinIO / S3 endpoint", async () => {
  const endpoint = env.S3_ENDPOINT ?? "http://127.0.0.1:9000";
  const res = await fetch(endpoint, { method: "GET" });
  if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
});

const failed = checks.filter((c) => !c.ok);
console.log("");
if (failed.length) {
  console.error(`${failed.length} check(s) failed. See LOCAL_SETUP.md`);
  process.exit(1);
}
console.log("All checks passed.");
