/**
 * Dry-run list of import raw/processed objects eligible for cleanup.
 * Default: dry-run. Pass --apply to delete (requires --confirm-delete).
 *
 *   npm run storage:cleanup-import-temp
 *   npm run storage:cleanup-import-temp -- --apply --confirm-delete
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { getImportRetentionDays } from "@/lib/import/pipeline/import-cleanup-policy";
import { getImportRawBucket } from "@/lib/import/pipeline/import-object-keys";
import { deleteObject } from "@/lib/storage/s3";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const dryRun = !process.argv.includes("--apply");
const confirmDelete = process.argv.includes("--confirm-delete");
const rawDays = getImportRetentionDays("raw_failed");
const processedDays = getImportRetentionDays("processed_temp");

async function main() {
  const pool = getPgPool();

  const { rows: failedJobs } = await pool.query<{
    id: string;
    raw_object_key: string;
    status: string;
  }>(
    `select id, raw_object_key, status
     from public.import_jobs
     where status in ('failed', 'cancelled')
       and created_at < now() - ($1::text || ' days')::interval`,
    [String(rawDays)]
  );

  const { rows: oldProcessed } = await pool.query<{
    id: string;
    parsed_content_object_key: string;
    import_job_id: string;
  }>(
    `select i.id, i.parsed_content_object_key, i.import_job_id
     from public.import_items i
     inner join public.import_jobs j on j.id = i.import_job_id
     where i.parsed_content_object_key is not null
       and j.status = 'published'
       and i.status = 'published'
       and i.updated_at < now() - ($1::text || ' days')::interval
     limit 500`,
    [String(processedDays)]
  );

  const targets = [
    ...failedJobs.map((j) => ({
      kind: "raw_failed" as const,
      key: j.raw_object_key,
      ref: j.id
    })),
    ...oldProcessed.map((i) => ({
      kind: "processed_published" as const,
      key: i.parsed_content_object_key,
      ref: i.id
    }))
  ];

  console.log(
    JSON.stringify(
      {
        dry_run: dryRun,
        raw_retention_days: rawDays,
        processed_retention_days: processedDays,
        target_count: targets.length
      },
      null,
      2
    )
  );

  const textBucket = getImportRawBucket();

  for (const t of targets) {
    console.log(`[${dryRun ? "dry-run" : "delete"}] ${t.kind} ${t.ref} ${t.key}`);
    if (!dryRun && confirmDelete) {
      await deleteObject(t.key, textBucket);
    }
  }

  if (!dryRun && !confirmDelete) {
    console.error("Refusing delete without --confirm-delete");
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
