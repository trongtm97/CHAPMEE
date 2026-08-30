import { calculateExposureShare } from "@/lib/fairness/exposure-share";
import { loadFairnessAlertThresholds, resolveWarningLevel } from "@/lib/fairness/thresholds";
import type { FairnessExposureWindow } from "@/types/fairness";
import type { DatabaseClient } from "@/lib/db/types";

const SNAPSHOT_SURFACES = ["reels", "discover", "search", "ranking"] as const;

export async function persistExposureDistributionSnapshot(
  db: DatabaseClient,
  surface: string,
  window: FairnessExposureWindow = "7d",
  snapshotDate = new Date().toISOString().slice(0, 10)
) {
  const share = await calculateExposureShare(db, surface, window);
  const thresholds = await loadFairnessAlertThresholds();
  const warningLevel = resolveWarningLevel(share, thresholds);

  const row = {
    snapshot_date: snapshotDate,
    surface,
    total_impressions: share.totalImpressions,
    top_1_percent_author_impression_share: share.top1PercentAuthorShare,
    top_5_percent_author_impression_share: share.top5PercentAuthorShare,
    top_10_percent_author_impression_share: share.top10PercentAuthorShare,
    top_1_percent_story_impression_share: share.top1PercentStoryShare,
    top_10_percent_story_impression_share: share.top10PercentStoryShare,
    gini_author_exposure: share.giniAuthor,
    gini_story_exposure: share.giniStory,
    new_author_impression_share: share.newAuthorImpressionShare,
    under_exposed_impression_share: share.underExposedImpressionShare,
    long_tail_impression_share: share.longTailImpressionShare,
    warning_level: warningLevel,
    metadata: {
      window,
      pool_shares: share.poolImpressionShares,
      thresholds
    }
  };

  const { error } = await db
    .from("exposure_distribution_snapshots")
    .upsert(row, { onConflict: "snapshot_date,surface" });

  if (error) throw error;
  return { surface, warningLevel, totalImpressions: share.totalImpressions };
}

export async function generateAllExposureSnapshots(
  db: DatabaseClient,
  window: FairnessExposureWindow = "7d"
) {
  const results = [];
  for (const surface of SNAPSHOT_SURFACES) {
    try {
      const result = await persistExposureDistributionSnapshot(db, surface, window);
      results.push({ ...result, ok: true });
    } catch (error) {
      results.push({
        surface,
        ok: false,
        error: error instanceof Error ? error.message : "snapshot_failed"
      });
    }
  }
  return results;
}
