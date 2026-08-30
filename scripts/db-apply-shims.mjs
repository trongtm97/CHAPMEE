#!/usr/bin/env node
/**
 * Applies drizzle extension SQL (0006+) after legacy schema exists.
 * Tracks applied files in public.schema_migrations.
 *
 * Run after: npm run db:migrate && npm run db:legacy
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

function isExtensionPhaseFile(filename) {
  const n = drizzleMigrationNumber(filename);
  return n !== null && n >= 6;
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

const BOOTSTRAP_SQL = `
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
`;

async function main() {
  const files = (await readdir(drizzleDir))
    .filter((name) => name.endsWith(".sql") && isExtensionPhaseFile(name))
    .sort();

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(BOOTSTRAP_SQL);

  if (statusOnly) {
    const { rows } = await client.query(
      "select filename, applied_at from public.schema_migrations order by filename"
    );
    const appliedSet = new Set(rows.map((r) => r.filename));
    console.log("Drizzle extension migrations (0006+):\n");
    for (const file of files) {
      const hit = rows.find((r) => r.filename === file);
      console.log(hit ? `  ✓ ${file}  (${hit.applied_at})` : `  · ${file}  (pending)`);
    }
    const pending = files.filter((f) => !appliedSet.has(f));
    console.log(`\n${files.length - pending.length}/${files.length} applied.`);
    if (pending.length) {
      console.log("Run: npm run db:shims");
    }
    await client.end();
    return;
  }

  const { rows: appliedRows } = await client.query(
    "select filename from public.schema_migrations"
  );
  const appliedSet = new Set(appliedRows.map((r) => r.filename));

  console.log(`Applying drizzle extensions (${files.length} files, 0006+)...`);

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`→ ${file} ... skip (already applied)`);
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
    } catch (error) {
      console.log("FAILED");
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }

  await client.end();

  if (process.exitCode) {
    console.error("\nExtension migration stopped. Fix the error and run npm run db:shims again.");
    process.exit(process.exitCode);
  }

  console.log("\nExtension drizzle migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
