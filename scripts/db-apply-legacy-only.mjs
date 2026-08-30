#!/usr/bin/env node
/**
 * Apply db/migrations/legacy/*.sql only — no drizzle shims.
 * Use on VPS when foundation 0000–0005 is done and compat shims would wrongly run 0006+.
 *
 *   node scripts/db-apply-legacy-only.mjs
 *   node scripts/db-apply-legacy-only.mjs --status
 */
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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
const LEGACY_PREFIX = "legacy/";
const statusOnly = process.argv.includes("--status");

const BOOTSTRAP_SQL = `
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
`;

function legacyKey(filename) {
  return `${LEGACY_PREFIX}${filename}`;
}

async function main() {
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.error(`No legacy SQL in ${migrationsDir}`);
    console.error("Upload db/migrations/legacy/ (~198 files) then retry.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(BOOTSTRAP_SQL);

  if (statusOnly) {
    const { rows } = await client.query(
      "select filename, applied_at from public.schema_migrations where filename like 'legacy/%' order by filename"
    );
    const appliedSet = new Set(rows.map((r) => r.filename.replace(LEGACY_PREFIX, "")));
    console.log(`Legacy migrations (${files.length} files):\n`);
    for (const file of files) {
      const hit = rows.find((r) => r.filename === legacyKey(file));
      console.log(hit ? `  ✓ ${file}` : `  · ${file}`);
    }
    console.log(`\n${appliedSet.size}/${files.length} applied.`);
    await client.end();
    return;
  }

  const { rows: appliedRows } = await client.query(
    "select filename from public.schema_migrations where filename like 'legacy/%'"
  );
  const appliedSet = new Set(appliedRows.map((r) => r.filename.replace(LEGACY_PREFIX, "")));

  console.log(`Applying legacy migrations (${files.length} files, no drizzle shims)...`);

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`→ ${file} ... skip (already applied)`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    try {
      await client.query(sql);
      await client.query(
        `insert into public.schema_migrations (filename, applied_at)
         values ($1, now()) on conflict (filename) do nothing`,
        [legacyKey(file)]
      );
      console.log("ok");
    } catch (error) {
      console.log("FAILED");
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }

  await client.end();
  if (process.exitCode) {
    console.error("\nStopped. Fix error and re-run: node scripts/db-apply-legacy-only.mjs");
    process.exit(process.exitCode);
  }
  console.log("\nLegacy done. Next: node scripts/db-apply-shims.mjs");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
