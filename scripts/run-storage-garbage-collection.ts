/**
 * Scheduled storage garbage collection (imports, failed uploads, pending-delete media).
 *
 *   npm run storage:garbage-collect              # dry-run
 *   npm run storage:garbage-collect -- --apply   # delete eligible artifacts
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { createAdminClient } from "@/lib/data/admin";
import { runStorageGarbageCollection } from "@/lib/storage/garbage-collection";

loadEnvLocal();

const dryRun = !process.argv.includes("--apply");

async function main() {
  const db = createAdminClient();
  const result = await runStorageGarbageCollection(db, { dryRun });

  console.log(JSON.stringify(result, null, 2));

  const totalErrors =
    result.importArtifacts.errors.length +
    result.staleUploads.errors.length +
    result.pendingDeleteMedia.errors.length +
    result.studioJobHistory.errors.length;

  if (totalErrors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
