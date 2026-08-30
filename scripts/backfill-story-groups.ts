import { loadEnvLocal } from "./lib/load-env-local";
import { backfillStoryGroupsForPublishedStories } from "@/lib/community-sync/story-groups";

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  loadEnvLocal();

  const apply = hasFlag("--apply");
  const dryRun = !apply || hasFlag("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : undefined;

  console.log(
    `[backfill-story-groups] Mode: ${dryRun ? "DRY-RUN" : "APPLY"}${limit ? ` | limit=${limit}` : ""}`
  );

  const result = await backfillStoryGroupsForPublishedStories({
    dryRun,
    limit: Number.isFinite(limit) ? limit : undefined
  });

  console.log("\n[backfill-story-groups] Summary");
  console.log(`- candidates (missing group): ${result.candidates}`);
  console.log(`- ${dryRun ? "would create" : "created"}: ${result.created}`);
  console.log(`- skipped (already exists): ${result.skipped}`);
  console.log(`- errors: ${result.errors}`);
  console.log(
    dryRun
      ? "\nNo changes were written. Re-run with --apply to persist."
      : "\nChanges applied."
  );

  if (result.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    `[backfill-story-groups] Fatal: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
