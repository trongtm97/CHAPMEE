/**
 * Script: cleanup-soft-deleted-content.ts
 *
 * Permanently deletes stories and episodes that have been soft-deleted
 * for more than 3 days. Run on a cron schedule (e.g. daily).
 *
 * Usage:
 *   npx tsx scripts/cleanup-soft-deleted-content.ts
 */
import { permanentlyDeleteExpiredContent } from "@/lib/cleanup/permanent-delete";

async function main() {
  console.log("[cleanup] Starting permanent delete of expired soft-deleted content...");

  const result = await permanentlyDeleteExpiredContent();

  console.log(`[cleanup] Deleted ${result.deletedStories} stories, ${result.deletedEpisodes} episodes.`);

  if (result.errors.length > 0) {
    console.error("[cleanup] Errors encountered:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
  }

  console.log("[cleanup] Done.");
  process.exit(result.errors.length > 0 ? 1 : 0);
}

main();
