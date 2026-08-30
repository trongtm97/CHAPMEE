/**
 * Dry-run: episodes pointing at missing S3 keys, or DB rows without keys but s3 type.
 * Does not delete by default. --apply --confirm-delete quarantines via log only in MVP.
 *
 *   npm run storage:cleanup-orphan-chapters
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { checkS3ObjectExists } from "@/lib/storage/storage-integrity";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const dryRun = !process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 300;

async function main() {
  const pool = getPgPool();
  const { rows } = await pool.query<{
    id: string;
    story_id: string;
    content_object_key: string;
    content_storage_type: string;
  }>(
    `select id, story_id, content_object_key, coalesce(content_storage_type, 'db') as content_storage_type
     from public.episodes
     where content_object_key is not null and trim(content_object_key) <> ''
     limit $1`,
    [limit]
  );

  const missingInS3: typeof rows = [];
  const orphanDbRefs: typeof rows = [];

  for (const row of rows) {
    const exists = await checkS3ObjectExists(row.content_object_key);
    if (!exists) {
      missingInS3.push(row);
    }
  }

  const { rows: s3TypeNoKey } = await pool.query<{
    id: string;
    story_id: string;
  }>(
    `select id, story_id
     from public.episodes
     where content_storage_type = 's3'
       and (content_object_key is null or trim(content_object_key) = '')
     limit 100`
  );

  console.log(
    JSON.stringify(
      {
        dry_run: dryRun,
        scanned: rows.length,
        missing_s3_object: missingInS3.length,
        db_s3_without_key: s3TypeNoKey.length
      },
      null,
      2
    )
  );

  for (const row of missingInS3) {
    console.log("[quarantine-candidate] missing_object", row.id, row.content_object_key);
    orphanDbRefs.push(row);
  }

  for (const row of s3TypeNoKey) {
    console.log("[quarantine-candidate] db_s3_no_key", row.id, row.story_id);
  }

  if (!dryRun) {
    console.warn(
      "MVP: no automatic DB update. Mark episodes quarantined manually or via future admin job."
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
