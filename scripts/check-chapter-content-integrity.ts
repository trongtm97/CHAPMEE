/**
 * Verifies episodes.content_object_key against MinIO/S3 (no deletes).
 *
 *   npm run storage:check-chapters
 *   npm run storage:check-chapters -- --limit=100 --verify-hash
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { persistIntegrityRun } from "@/lib/storage/integrity-runs";
import { verifyChapterContentObject } from "@/lib/storage/storage-integrity";
import { writeIntegrityReport } from "@/lib/storage/write-integrity-report";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const verifyHash = process.argv.includes("--verify-hash");
const reportArg = process.argv.find((a) => a.startsWith("--report="));
const reportPath = reportArg?.split("=").slice(1).join("=") ?? null;
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;

type Row = {
  id: string;
  story_id: string;
  content_object_key: string;
  content_hash: string | null;
  content_size_bytes: string | null;
};

async function main() {
  const pool = getPgPool();
  const { rows } = await pool.query<Row>(
    `select id, story_id, content_object_key, content_hash, content_size_bytes::text
     from public.episodes
     where content_object_key is not null
       and trim(content_object_key) <> ''
       and coalesce(content_storage_type, 'db') in ('s3', 'hybrid')
     order by content_updated_at desc nulls last
     limit $1`,
    [limit]
  );

  let missing = 0;
  let hashMismatch = 0;
  let sizeMismatch = 0;
  const report: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    const issues = await verifyChapterContentObject({
      objectKey: row.content_object_key,
      expectedHash: verifyHash ? row.content_hash : null,
      expectedSizeBytes: row.content_size_bytes ? Number(row.content_size_bytes) : null
    });

    if (issues.length === 0) {
      continue;
    }

    for (const issue of issues) {
      if (issue.code === "missing_object") missing += 1;
      if (issue.code === "hash_mismatch") hashMismatch += 1;
      if (issue.code === "size_mismatch") sizeMismatch += 1;
      report.push({
        episode_id: row.id,
        story_id: row.story_id,
        ...issue
      });
      console.warn(issue.code, row.id, row.content_object_key, issue.message);
    }
  }

  const summary = {
    scanned: rows.length,
    missing,
    hash_mismatch: hashMismatch,
    size_mismatch: sizeMismatch,
    verify_hash: verifyHash
  };

  const payload = { summary, issues: report };
  console.log(JSON.stringify(payload, null, 2));
  writeIntegrityReport(reportPath, payload);

  const ok = missing === 0 && hashMismatch === 0 && sizeMismatch === 0;
  await persistIntegrityRun({ checkKind: "chapters", ok, summary });

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
