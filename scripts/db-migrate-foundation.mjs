#!/usr/bin/env node
/**
 * Applies drizzle/*.sql in order. Tracks applied files in public.schema_migrations.
 *
 *   npm run db:migrate
 *   node scripts/db-migrate-foundation.mjs --status
 *   node scripts/db-migrate-foundation.mjs --force   # re-run all SQL (idempotent files only)
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

function isFoundationPhaseFile(filename) {
  const n = drizzleMigrationNumber(filename);
  return n !== null && n >= 0 && n <= 5;
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

const drizzleDir = path.join(root, "drizzle");
const statusOnly = process.argv.includes("--status");
const force = process.argv.includes("--force");

const BOOTSTRAP_SQL = `
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
comment on table public.schema_migrations is 'Tracks applied drizzle/*.sql foundation migrations.';
`;

async function listApplied(client) {
  const { rows } = await client.query(
    "select filename, applied_at from public.schema_migrations order by filename"
  );
  return rows;
}

async function main() {
  const allFiles = (await readdir(drizzleDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const files = allFiles.filter(isFoundationPhaseFile);
  const extensionPending = allFiles.filter((name) => !isFoundationPhaseFile(name));

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(BOOTSTRAP_SQL);

  if (statusOnly) {
    const applied = await listApplied(client);
    const appliedSet = new Set(applied.map((r) => r.filename));
    console.log("Drizzle migrations:\n");
    for (const file of files) {
      const hit = applied.find((r) => r.filename === file);
      console.log(hit ? `  ✓ ${file}  (${hit.applied_at})` : `  · ${file}  (pending)`);
    }
    const pending = files.filter((f) => !appliedSet.has(f));
    console.log(`\n${applied.length}/${files.length} applied, ${pending.length} pending.`);
    if (extensionPending.length) {
      console.log(
        `\nExtension drizzle (${extensionPending.length} files, 0006+): run after npm run db:legacy → npm run db:shims`
      );
    }
    if (pending.length) {
      console.log("Run: npm run db:migrate");
    }
    await client.end();
    return;
  }

  const appliedRows = await listApplied(client);
  const appliedSet = new Set(appliedRows.map((r) => r.filename));

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file) && !force) {
      console.log(`→ ${file} ... skip (already applied)`);
      skippedCount += 1;
      continue;
    }

    const sql = await readFile(path.join(drizzleDir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    try {
      await client.query(sql);
      await client.query(
        `insert into public.schema_migrations (filename, applied_at)
         values ($1, now())
         on conflict (filename) do update set applied_at = excluded.applied_at`,
        [file]
      );
      console.log("ok");
      appliedCount += 1;
    } catch (error) {
      console.log("FAILED");
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }

  await client.end();

  if (process.exitCode) {
    console.error("\nMigration stopped. Fix the error and run npm run db:migrate again.");
    process.exit(process.exitCode);
  }

  console.log(
    `\nDone: ${appliedCount} applied, ${skippedCount} skipped (${files.length} foundation files).`
  );
  if (extensionPending.length) {
    console.log(
      `Next: npm run db:legacy && npm run db:shims  (${extensionPending.length} extension drizzle files, 0006+).`
    );
  }
  if (skippedCount === files.length && appliedCount === 0) {
    console.log("All migrations already applied. Use --status to list.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
