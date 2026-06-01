import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import type { FairnessAlertThresholds } from "@/types/fairness";

function num(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function loadFairnessAlertThresholds(): Promise<FairnessAlertThresholds> {
  const config = await getAlgorithmConfig();
  return {
    top1AuthorPercent: num(config, "fairness.alert_top1_author_percent", 50),
    top10StoryPercent: num(config, "fairness.alert_top10_story_percent", 70),
    minNewAuthorPercent: num(config, "fairness.alert_min_new_author_impression_percent", 5),
    minLongTailPercent: num(config, "fairness.alert_min_long_tail_impression_percent", 8),
    minNewAuthorSlotsPercent: num(config, "fairness.min_new_author_slots_percent", 8),
    minUnderExposedSlotsPercent: num(config, "fairness.min_under_exposed_slots_percent", 10),
    maxAuthorSharePerFeedPercent: num(config, "fairness.max_author_share_per_feed_percent", 25)
  };
}

export function resolveWarningLevel(
  share: ExposureShareForWarning,
  thresholds: FairnessAlertThresholds
): "ok" | "warn" | "critical" {
  let level: "ok" | "warn" | "critical" = "ok";

  const bump = (next: "warn" | "critical") => {
    if (next === "critical") level = "critical";
    else if (level === "ok") level = "warn";
  };

  if (share.top1PercentAuthorShare > thresholds.top1AuthorPercent) {
    bump(share.top1PercentAuthorShare > thresholds.top1AuthorPercent * 1.2 ? "critical" : "warn");
  }
  if (share.top10PercentStoryShare > thresholds.top10StoryPercent) {
    bump(share.top10PercentStoryShare > thresholds.top10StoryPercent * 1.15 ? "critical" : "warn");
  }
  if (
    share.totalImpressions > 100 &&
    share.newAuthorImpressionShare < thresholds.minNewAuthorPercent
  ) {
    bump("warn");
  }
  if (
    share.totalImpressions > 100 &&
    share.longTailImpressionShare < thresholds.minLongTailPercent
  ) {
    bump("warn");
  }

  return level;
}

type ExposureShareForWarning = {
  totalImpressions: number;
  top1PercentAuthorShare: number;
  top10PercentStoryShare: number;
  newAuthorImpressionShare: number;
  longTailImpressionShare: number;
};
