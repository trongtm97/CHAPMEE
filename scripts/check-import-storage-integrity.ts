/**
 * Verifies import_jobs / import_items S3 keys exist (no deletes).
 *
 *   npm run storage:check-imports
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { persistIntegrityRun } from "@/lib/storage/integrity-runs";
import { checkS3ObjectExists } from "@/lib/storage/storage-integrity";
import { writeIntegrityReport } from "@/lib/storage/write-integrity-report";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const reportArg = process.argv.find((a) => a.startsWith("--report="));
const reportPath = reportArg?.split("=").slice(1).join("=") ?? null;

type JobRow = {
  id: string;
  status: string;
  raw_object_key: string;
};

type ItemRow = {
  id: string;
  import_job_id: string;
  status: string;
  parsed_content_object_key: string | null;
};

async function main() {
  const pool = getPgPool();
  const { rows: jobs } = await pool.query<JobRow>(
    `select id, status, raw_object_key from public.import_jobs order by created_at desc limit 200`
  );

  const { rows: items } = await pool.query<ItemRow>(
    `select id, import_job_id, status, parsed_content_object_key
     from public.import_items
     where parsed_content_object_key is not null
     order by created_at desc
     limit 500`
  );

  let missingRaw = 0;
  let missingProcessed = 0;
  const issues: Array<Record<string, unknown>> = [];

  for (const job of jobs) {
    const exists = await checkS3ObjectExists(job.raw_object_key);
    if (!exists) {
      missingRaw += 1;
      issues.push({
        kind: "raw",
        job_id: job.id,
        status: job.status,
        object_key: job.raw_object_key
      });
    }
  }

  for (const item of items) {
    const key = item.parsed_content_object_key?.trim();
    if (!key) continue;
    const exists = await checkS3ObjectExists(key);
    if (!exists) {
      missingProcessed += 1;
      issues.push({
        kind: "processed",
        item_id: item.id,
        job_id: item.import_job_id,
        status: item.status,
        object_key: key
      });
    }
  }

  const summary = {
    jobs_scanned: jobs.length,
    items_scanned: items.length,
    missing_raw: missingRaw,
    missing_processed: missingProcessed,
    failed_jobs: jobs.filter((j) => j.status === "failed").length
  };

  const payload = { summary, issues };
  console.log(JSON.stringify(payload, null, 2));
  writeIntegrityReport(reportPath, payload);

  const ok = missingRaw === 0 && missingProcessed === 0;
  await persistIntegrityRun({ checkKind: "imports", ok, summary });

  if (!ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
