/**
 * Reverse check: S3 keys under story-content/ with no matching episodes.content_object_key.
 * Sampled listing only (not full bucket scan).
 *
 *   npm run storage:check-s3-orphans
 *   npm run storage:check-s3-orphans -- --limit=300 --prefix=story-content/2026/
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { persistIntegrityRun } from "@/lib/storage/integrity-runs";
import { listObjectKeys } from "@/lib/storage/s3";
import { writeIntegrityReport } from "@/lib/storage/write-integrity-report";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const CHAPTER_PREFIX = "story-content/";
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 200;
const prefixArg = process.argv.find((a) => a.startsWith("--prefix="));
const prefix = prefixArg?.split("=").slice(1).join("=") ?? CHAPTER_PREFIX;
const reportArg = process.argv.find((a) => a.startsWith("--report="));
const reportPath = reportArg?.split("=").slice(1).join("=") ?? null;

async function main() {
  const listed = await listObjectKeys({ prefix, maxKeys: limit });
  const keys = listed.keys.filter((key) => key.includes("/chapters/"));

  const pool = getPgPool();
  const { rows } = await pool.query<{ content_object_key: string }>(
    `select content_object_key from public.episodes
     where content_object_key = any($1::text[])`,
    [keys]
  );
  const known = new Set(rows.map((r) => r.content_object_key));
  const orphans = keys.filter((key) => !known.has(key));

  const summary = {
    prefix,
    listed: keys.length,
    orphans: orphans.length,
    truncated: listed.isTruncated
  };

  const payload = { summary, orphan_keys: orphans.slice(0, 50) };
  console.log(JSON.stringify(payload, null, 2));
  writeIntegrityReport(reportPath, payload);

  await persistIntegrityRun({
    checkKind: "s3_orphans",
    ok: orphans.length === 0,
    summary
  });

  if (orphans.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
