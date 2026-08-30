/**
 * Export storage_assets manifest JSON for backup / migration planning.
 * Run: npx tsx scripts/export-media-manifest.ts > backups/media-manifest.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { loadEnvLocal } from "./lib/load-env-local";
import { db } from "../lib/db";

loadEnvLocal();

async function main() {
  const result = await db.execute(sql`
    select id, bucket, path, status, usage_type, owner_id, size_bytes, created_at
    from public.storage_assets
    order by created_at asc
  `);

  const manifest = {
    exportedAt: new Date().toISOString(),
    total: result.rows.length,
    assets: result.rows
  };

  const outDir = resolve(process.cwd(), "backups");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `media-manifest-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Wrote ${manifest.total} assets to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
