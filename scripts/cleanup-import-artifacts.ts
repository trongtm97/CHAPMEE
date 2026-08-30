/**
 * Lists import S3 prefixes eligible for cleanup (dry-run by default).
 *
 *   npm run import:cleanup -- --dry-run
 *   npm run import:cleanup -- --apply   # not implemented — manual mc/aws delete only
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { getImportRetentionDays } from "@/lib/import/pipeline/import-cleanup-policy";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const dryRun = !process.argv.includes("--apply");

async function main() {
  const pool = getPgPool();
  const rawDays = getImportRetentionDays("raw_failed");
  const processedDays = getImportRetentionDays("processed_temp");

  const { rows } = await pool.query<{
    id: string;
    status: string;
    raw_object_key: string;
    created_at: Date;
  }>(
    `select id, status, raw_object_key, created_at
     from public.import_jobs
     where status in ('failed', 'cancelled')
       and created_at < now() - ($1::text || ' days')::interval
     order by created_at asc
     limit 200`,
    [String(rawDays)]
  );

  console.log(
    `[import:cleanup] dryRun=${dryRun} raw_failed_retention=${rawDays}d processed_temp=${processedDays}d`
  );
  console.log(`[import:cleanup] eligible failed/cancelled jobs: ${rows.length}`);

  for (const row of rows) {
    console.log(`  job=${row.id} status=${row.status} raw=${row.raw_object_key}`);
  }

  const { rows: publishedJobs } = await pool.query<{ count: string }>(
    `select count(*)::text as count from public.import_jobs where status = 'published'`
  );
  console.log(`[import:cleanup] published jobs (keep raw/processed): ${publishedJobs[0]?.count ?? 0}`);
  console.log("[import:cleanup] MVP: no auto-delete. Use MinIO console or mc rm after review.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
