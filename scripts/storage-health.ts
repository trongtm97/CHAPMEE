/**
 * Quick storage stack health (DB schema + optional S3 probe sample).
 *
 *   npm run storage:health
 *   npm run storage:health -- --probe-s3 --report=./storage-health.json
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { persistIntegrityRun } from "@/lib/storage/integrity-runs";
import { formatStorageHealthFailure } from "@/lib/storage/storage-health-checks";
import { writeIntegrityReport } from "@/lib/storage/write-integrity-report";
import { checkS3ObjectExists } from "@/lib/storage/storage-integrity";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const probeS3 = process.argv.includes("--probe-s3");
const reportArg = process.argv.find((a) => a.startsWith("--report="));
const reportPath = reportArg?.split("=").slice(1).join("=") ?? null;

async function columnExists(table: string, column: string) {
  const pool = getPgPool();
  const { rows } = await pool.query<{ exists: boolean }>(
    `select exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = $1 and column_name = $2
     ) as exists`,
    [table, column]
  );
  return Boolean(rows[0]?.exists);
}

async function routineExists(name: string) {
  const pool = getPgPool();
  const { rows } = await pool.query<{ exists: boolean }>(
    `select exists (
       select 1 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = $1
     ) as exists`,
    [name]
  );
  return Boolean(rows[0]?.exists);
}

async function main() {
  const pool = getPgPool();
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  const required = [
    ["episodes", "content_object_key"],
    ["episodes", "plain_text_preview"],
    ["episodes", "content_hash"],
    ["import_jobs", "raw_object_key"],
    ["import_items", "parsed_content_object_key"]
  ] as const;

  for (const [table, col] of required) {
    const ok = await columnExists(table, col);
    checks.push({
      name: `${table}.${col}`,
      ok,
      detail: ok ? undefined : "missing"
    });
  }

  checks.push({
    name: "rpc.search_public_episode_ids",
    ok: await routineExists("search_public_episode_ids")
  });

  checks.push({
    name: "rpc.search_public_story_ids",
    ok: await routineExists("search_public_story_ids")
  });

  let s3Probe: { sampled: number; missing: number } | null = null;
  if (probeS3) {
    const { rows } = await pool.query<{ content_object_key: string }>(
      `select content_object_key from public.episodes
       where content_object_key is not null and trim(content_object_key) <> ''
       order by content_updated_at desc nulls last
       limit 5`
    );
    let missing = 0;
    for (const row of rows) {
      const exists = await checkS3ObjectExists(row.content_object_key);
      if (!exists) missing += 1;
    }
    s3Probe = { sampled: rows.length, missing };
  }

  const failed = checks.filter((c) => !c.ok);
  const payload = {
    ok: failed.length === 0 && (s3Probe?.missing ?? 0) === 0,
    checks,
    s3_probe: s3Probe,
    redis_url_set: Boolean(process.env.REDIS_URL?.trim()),
    cache_ttl_ms: process.env.CHAPTER_CONTENT_CACHE_TTL_MS ?? "900000 (default)"
  };

  console.log(JSON.stringify(payload, null, 2));
  writeIntegrityReport(reportPath, payload);

  await persistIntegrityRun({
    checkKind: "health",
    ok: payload.ok,
    summary: {
      ok: payload.ok,
      failed_checks: failed.length,
      s3_probe: s3Probe,
      redis_url_set: payload.redis_url_set
    }
  });

  const hint = formatStorageHealthFailure(checks);
  if (hint) {
    console.error("\n" + hint);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
