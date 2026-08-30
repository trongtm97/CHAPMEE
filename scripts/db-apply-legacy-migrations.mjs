#!/usr/bin/env node
/**
 * Applies SQL files from db/migrations/legacy in lexical order.
 * Tracks applied files in public.schema_migrations (prefix legacy/).
 *
 * Run after drizzle foundation (npm run db:migrate) on a fresh local Postgres.
 *
 *   npm run db:legacy
 *   npm run db:legacy:status
 *   npm run db:legacy:stamp   # DB already had legacy schema (e.g. Supabase) before tracking
 *
 * Resume from a file (ignores tracking for files before LEGACY_FROM):
 *   $env:LEGACY_FROM="067_messages_realtime.sql"; npm run db:legacy
 */
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

function drizzleMigrationNumber(filename) {
  const match = filename.match(/^(\d{4})_.+\.sql$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function isPreLegacyCompatShim(filename) {
  const n = drizzleMigrationNumber(filename);
  return n !== null && n >= 1 && n <= 5;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://chapmee:chapmee_local_password@127.0.0.1:5432/chapmee_local";

const migrationsDir = path.join(root, "db", "migrations", "legacy");
const drizzleDir = path.join(root, "drizzle");
const legacyFrom = process.env.LEGACY_FROM?.trim() || null;

const statusOnly = process.argv.includes("--status");
const stampBaseline = process.argv.includes("--stamp-baseline");

const LEGACY_PREFIX = "legacy/";

const BOOTSTRAP_SQL = `
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
comment on table public.schema_migrations is 'Tracks applied drizzle/*.sql and legacy/*.sql migrations.';
`;

function legacyKey(filename) {
  return `${LEGACY_PREFIX}${filename}`;
}

function isCompatShim(name) {
  return isPreLegacyCompatShim(name);
}

async function listLegacyFiles() {
  return (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

async function listAppliedLegacy(client) {
  const { rows } = await client.query(
    "select filename, applied_at from public.schema_migrations where filename like 'legacy/%' order by filename"
  );
  return rows;
}

async function markLegacyApplied(client, file) {
  await client.query(
    `insert into public.schema_migrations (filename, applied_at)
     values ($1, now())
     on conflict (filename) do nothing`,
    [legacyKey(file)]
  );
}

async function applyCompatShims(client) {
  if (
    process.env.CHAPMEE_SKIP_DB_COMPAT_SHIMS === "true" ||
    process.argv.includes("--skip-pre-legacy-shims")
  ) {
    console.log("Skipping pre-legacy drizzle shims (0001–0005 already applied via db:migrate).");
    return;
  }

  const files = (await readdir(drizzleDir))
    .filter(isCompatShim)
    .sort();

  if (!files.length) return;

  console.log("Applying db-compat shims...");
  for (const file of files) {
    const sql = await readFile(path.join(drizzleDir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    await client.query(sql);
    console.log("ok");
  }
}

async function profilesTableExists(client) {
  const { rows } = await client.query(
    "select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles' limit 1"
  );
  return rows.length > 0;
}

async function stampAllLegacy(client, files) {
  if (!(await profilesTableExists(client))) {
    console.error(
      "Cannot stamp: public.profiles does not exist. Run npm run db:migrate && npm run db:legacy on a fresh DB instead."
    );
    process.exit(1);
  }

  let stamped = 0;
  for (const file of files) {
    const key = legacyKey(file);
    const { rowCount } = await client.query(
      `insert into public.schema_migrations (filename, applied_at)
       values ($1, now())
       on conflict (filename) do nothing`,
      [key]
    );
    if (rowCount > 0) stamped += 1;
  }

  console.log(
    `Stamped ${stamped} legacy migration(s) (${files.length} total in db/migrations/legacy).`
  );
  console.log("Run npm run db:legacy to apply any new legacy files added after the stamp.");
}

async function main() {
  const files = await listLegacyFiles();
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(BOOTSTRAP_SQL);

  if (statusOnly) {
    const applied = await listAppliedLegacy(client);
    const appliedSet = new Set(applied.map((r) => r.filename.replace(LEGACY_PREFIX, "")));
    console.log("Legacy migrations:\n");
    for (const file of files) {
      const hit = applied.find((r) => r.filename === legacyKey(file));
      console.log(hit ? `  ✓ ${file}  (${hit.applied_at})` : `  · ${file}  (pending)`);
    }
    const pending = files.filter((f) => !appliedSet.has(f));
    console.log(`\n${applied.length}/${files.length} applied, ${pending.length} pending.`);
    if (pending.length) {
      console.log("Run: npm run db:legacy");
    }
    await client.end();
    return;
  }

  if (stampBaseline) {
    await stampAllLegacy(client, files);
    await client.end();
    return;
  }

  await applyCompatShims(client);

  const appliedRows = await listAppliedLegacy(client);
  const appliedSet = new Set(
    appliedRows.map((r) => r.filename.replace(LEGACY_PREFIX, ""))
  );

  if (legacyFrom && !files.includes(legacyFrom)) {
    console.error(`LEGACY_FROM not found: ${legacyFrom}`);
    process.exit(1);
  }

  let startApplying = !legacyFrom;
  const pendingCount = legacyFrom
    ? files.length - files.indexOf(legacyFrom)
    : files.filter((f) => !appliedSet.has(f)).length;

  console.log(
    legacyFrom
      ? `Resuming legacy migrations from ${legacyFrom} (${pendingCount} file(s) in tail)...`
      : `Applying legacy migrations (${pendingCount} pending of ${files.length})...`
  );

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (!startApplying) {
      if (file === legacyFrom) {
        startApplying = true;
      } else {
        continue;
      }
    }

    if (!legacyFrom && appliedSet.has(file)) {
      console.log(`→ ${file} ... skip (already applied)`);
      skippedCount += 1;
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    try {
      await client.query(sql);
      await markLegacyApplied(client, file);
      console.log("ok");
      appliedCount += 1;
    } catch (error) {
      console.log("failed");
      console.error(error);
      if (error.code === "42710" && file === "001_initial_schema.sql") {
        console.error(
          "\nHint: schema objects already exist (typical after Supabase or a prior legacy run)."
        );
        console.error("Stamp tracking then retry: npm run db:legacy:stamp && npm run db:legacy");
      }
      process.exitCode = 1;
      break;
    }
  }

  await client.end();

  if (process.exitCode) {
    console.error("\nLegacy migration stopped. Fix the error and run npm run db:legacy again.");
    process.exit(process.exitCode);
  }

  console.log(
    `\nDone: ${appliedCount} applied, ${skippedCount} skipped (${files.length} total).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
