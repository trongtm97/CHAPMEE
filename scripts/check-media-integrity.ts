/**
 * Lists storage_assets and optionally checks S3 object existence.
 * Run: npx tsx scripts/check-media-integrity.ts [--check-s3]
 */
import { loadEnvLocal } from "./lib/load-env-local";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { objectExists } from "../lib/storage/s3";

loadEnvLocal();

type Row = {
  id: string;
  bucket: string;
  path: string;
  status: string;
  usage_type: string;
};

async function main() {
  const checkS3 = process.argv.includes("--check-s3");
  const result = await db.execute(sql`
    select id, bucket, path, status, usage_type
    from public.storage_assets
    order by created_at desc
  `);

  const rows = result.rows as Row[];
  let missing = 0;
  let orphan = 0;

  for (const row of rows) {
    if (row.status === "orphan_detected" || row.status === "orphan_candidate") {
      orphan += 1;
    }

    if (checkS3 && row.status === "active") {
      const exists = await objectExists(row.path);
      if (!exists) {
        missing += 1;
        console.warn("MISSING_OBJECT", row.id, row.bucket, row.path);
      }
    }
  }

  const manifest = rows.map((row) => ({
    id: row.id,
    bucket: row.bucket,
    object_key: row.path,
    status: row.status,
    usage_type: row.usage_type
  }));

  console.log(JSON.stringify({ total: rows.length, orphan, missing, manifest }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
