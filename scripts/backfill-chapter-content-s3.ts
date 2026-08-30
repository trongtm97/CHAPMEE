/**
 * Migrates legacy inline episode bodies to MinIO/S3 (metadata on episodes row).
 *
 *   npm run backfill:chapter-content
 *   npm run backfill:chapter-content -- --dry-run
 *   npm run backfill:chapter-content -- --limit=50
 *   npm run backfill:chapter-content -- --story-id=<uuid>
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import {
  DEFAULT_INLINE_MIGRATE_THRESHOLD_CHARS,
  migrateInlineEpisodeContentToS3
} from "@/lib/chapters/migrate-inline-episode-to-s3";
import type { MigrateInlineEpisodeInput } from "@/lib/chapters/migrate-inline-episode-to-s3";
import { closePgPool, getPgPool } from "@/lib/db/pool";
import { createAdminClient } from "@/lib/data/admin";

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const storyIdArg = process.argv.find((arg) => arg.startsWith("--story-id="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 200;
const storyIdFilter = storyIdArg?.split("=")[1]?.trim() || null;

async function loadCandidates(): Promise<MigrateInlineEpisodeInput[]> {
  const pool = getPgPool();
  const params: unknown[] = [DEFAULT_INLINE_MIGRATE_THRESHOLD_CHARS];
  let storyClause = "";
  if (storyIdFilter) {
    params.push(storyIdFilter);
    storyClause = `and story_id = $${params.length}::uuid`;
  }
  params.push(limit);
  const limitParam = `$${params.length}`;

  const { rows } = await pool.query<MigrateInlineEpisodeInput>(
    `select
       id,
       story_id,
       content,
       structured_content,
       content_format,
       content_storage_type,
       content_object_key,
       excerpt
     from public.episodes
     where coalesce(content_storage_type, 'db') = 'db'
       and (content_object_key is null or trim(content_object_key) = '')
       and (
         length(trim(coalesce(content, ''))) >= $1::int
         or structured_content is not null
       )
       ${storyClause}
     order by created_at asc nulls last, id asc
     limit ${limitParam}::int`,
    params
  );
  return rows;
}

async function main() {
  const db = createAdminClient();
  const rows = await loadCandidates();
  console.log(
    `[backfill-chapter-content] candidates=${rows.length} dryRun=${dryRun} limit=${limit}`
  );

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const result = await migrateInlineEpisodeContentToS3(db, row, { dryRun });
    if (!result.ok) {
      failed += 1;
      console.error(`[fail] chapter=${row.id} story=${row.story_id}: ${result.error}`);
      continue;
    }
    if (result.skipped) {
      skipped += 1;
      console.log(`[skip] chapter=${row.id} reason=${result.reason}`);
      continue;
    }
    migrated += 1;
    console.log(`[ok] chapter=${row.id} key=${result.objectKey}`);
  }

  console.log(
    `[backfill-chapter-content] done migrated=${migrated} skipped=${skipped} failed=${failed}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePgPool());
