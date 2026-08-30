/**
 * Backfill stories.public_code and canonical_url for production.
 *
 * Usage (local):
 *   npx tsx scripts/backfill-story-public-urls.ts
 *
 * Usage (VPS docker):
 *   dcp exec -T web npx tsx scripts/backfill-story-public-urls.ts
 */
import { createClient } from "@/lib/data/server";
import { ensureStoryPublicUrl } from "@/lib/stories/ensure-story-public-url";

async function main() {
  const db = await createClient();
  const { data, error } = await db.from("stories").select("id, title, slug, public_code, canonical_url");

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  let fixed = 0;

  for (const row of rows) {
    const beforeCode = String((row as { public_code?: string | null }).public_code ?? "");
    const beforeCanonical = String((row as { canonical_url?: string | null }).canonical_url ?? "");
    const result = await ensureStoryPublicUrl(db, String((row as { id: string }).id));
    if (!result) {
      continue;
    }

    if (result.public_code !== beforeCode || result.canonical_url !== beforeCanonical) {
      fixed += 1;
      console.log(
        `✓ ${(row as { title: string }).title} → ${result.canonical_url}`
      );
    }
  }

  console.log(`\nDone. Updated ${fixed}/${rows.length} stories.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
