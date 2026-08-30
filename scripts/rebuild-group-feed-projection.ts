import { loadEnvLocal } from "./lib/load-env-local";
import { rebuildGroupFeedProjection } from "@/lib/community-sync/projection/rebuild-projection";

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function readNumberArg(prefix: string, fallback: number) {
  const arg = process.argv.find((entry) => entry.startsWith(`${prefix}=`));
  if (!arg) {
    return fallback;
  }
  const parsed = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  loadEnvLocal();

  const apply = hasFlag("--apply");
  const dryRun = !apply || hasFlag("--dry-run");
  const batchSize = readNumberArg("--batch-size", 500);
  const offset = readNumberArg("--offset", 0);
  const maxBatches = readNumberArg("--max-batches", 20);

  console.log(
    `[rebuild-group-feed-projection] Mode: ${dryRun ? "DRY-RUN" : "APPLY"} | batch-size=${batchSize} | offset=${offset} | max-batches=${maxBatches}`
  );

  if (!dryRun) {
    console.warn(
      "[rebuild-group-feed-projection] APPLY mode upserts feed items. Backup DB on VPS before running."
    );
  }

  const result = await rebuildGroupFeedProjection({
    dryRun,
    batchSize,
    offset,
    maxBatches,
    onProgress: (progress) => {
      console.log(
        `[rebuild-group-feed-projection] batch=${progress.batch} offset=${progress.offset} scanned=${progress.totalScanned} projected=${progress.projected} aggregated=${progress.aggregated} individual=${progress.individual} skipped=${progress.skipped} errors=${progress.errors}`
      );
    }
  });

  console.log("\n[rebuild-group-feed-projection] Summary");
  console.log(`- events scanned: ${result.eventsScanned}`);
  console.log(`- projected: ${result.projected}`);
  console.log(`- aggregated: ${result.aggregated}`);
  console.log(`- individual: ${result.individual}`);
  console.log(`- created/updated (apply): ${result.created}/${result.updated}`);
  console.log(`- skipped: ${result.skipped}`);
  console.log(`- errors: ${result.errors}`);
  console.log(`- has more: ${result.hasMore}`);
  console.log(`- next offset: ${result.nextOffset}`);

  if (result.hasMore) {
    console.log(
      `\nMore events remain. Re-run with --offset=${result.nextOffset} (and same batch flags).`
    );
  }

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
    `[rebuild-group-feed-projection] Fatal: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
