import { logFairnessAdjustments } from "@/lib/fairness/adjustment-log";
import type { Exposure7dContext } from "@/types/fairness";
import type { FairnessAdjustmentLogInput } from "@/types/fairness";
import { buildScoringConfig } from "@/lib/scoring/config";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import type { FeedCandidate } from "@/types/feed-mixer";
import type { DatabaseClient } from "@/lib/db/types";

function isUnderExposedPool(pool: string) {
  return pool === "under_exposed";
}

function isLongTailPool(pool: string) {
  return pool === "long_tail_quality" || pool === "long_tail";
}

function isNewAuthorPool(pool: string) {
  return pool === "new_author";
}

export async function applyExposureCaps(
  items: FeedCandidate[],
  surface: string,
  exposure: Exposure7dContext,
  options?: {
    db?: DatabaseClient;
    requestId?: string;
  }
): Promise<FeedCandidate[]> {
  const config = buildScoringConfig(await getAlgorithmConfig());
  const fair = config.fairness;
  const cold = config.coldStart;
  const logs: FairnessAdjustmentLogInput[] = [];

  const adjusted = items.map((item) => {
    let score = item.mixerScore;
    const oldScore = score;

    const authorShare = exposure.authorSharePercent.get(item.authorUserId) ?? 0;
    const storyShare = exposure.storySharePercent.get(item.storyId) ?? 0;

    if (exposure.totalImpressions > 0 && authorShare > fair.authorExposureCap7dPercent) {
      const over =
        (authorShare - fair.authorExposureCap7dPercent) /
        Math.max(fair.authorExposureCap7dPercent, 1);
      score -= Math.min(0.45, over * fair.authorOverCapPenalty);
      logs.push({
        itemType: item.itemType,
        itemId: item.itemId,
        storyId: item.storyId,
        authorUserId: item.authorUserId,
        surface,
        adjustmentType: "author_cap_penalty",
        oldScore,
        newScore: score,
        reason: `Author exposure 7d ${authorShare.toFixed(1)}% > cap ${fair.authorExposureCap7dPercent}%`,
        metadata: { request_id: options?.requestId, author_share_percent: authorShare }
      });
    }

    if (exposure.totalImpressions > 0 && storyShare > fair.storyExposureCap7dPercent) {
      const over =
        (storyShare - fair.storyExposureCap7dPercent) /
        Math.max(fair.storyExposureCap7dPercent, 1);
      const beforeStory = score;
      score -= Math.min(0.4, over * fair.storyOverCapPenalty);
      logs.push({
        itemType: item.itemType,
        itemId: item.itemId,
        storyId: item.storyId,
        authorUserId: item.authorUserId,
        surface,
        adjustmentType: "story_cap_penalty",
        oldScore: beforeStory,
        newScore: score,
        reason: `Story exposure 7d ${storyShare.toFixed(1)}% > cap ${fair.storyExposureCap7dPercent}%`,
        metadata: { request_id: options?.requestId, story_share_percent: storyShare }
      });
    }

    const itemImpressions =
      exposure.storyImpressions.get(item.storyId) ??
      exposure.authorImpressions.get(item.authorUserId) ??
      0;

    if (
      isUnderExposedPool(item.pool) ||
      (itemImpressions < cold.newStoryInitialImpressions * 0.35 &&
        item.qualityScore >= 0.45)
    ) {
      const before = score;
      score += fair.underExposedBoost;
      logs.push({
        itemType: item.itemType,
        itemId: item.itemId,
        storyId: item.storyId,
        authorUserId: item.authorUserId,
        surface,
        adjustmentType: "under_exposed_boost",
        oldScore: before,
        newScore: score,
        reason: "Under-exposed quality boost",
        metadata: { request_id: options?.requestId, pool: item.pool }
      });
    }

    if (isLongTailPool(item.pool) || (item.qualityScore >= 0.5 && item.discoveryScore < 0.72)) {
      const before = score;
      score += fair.longTailQualityBoost;
      logs.push({
        itemType: item.itemType,
        itemId: item.itemId,
        storyId: item.storyId,
        authorUserId: item.authorUserId,
        surface,
        adjustmentType: "long_tail_boost",
        oldScore: before,
        newScore: score,
        reason: "Long-tail quality boost",
        metadata: { request_id: options?.requestId, pool: item.pool }
      });
    }

    if (isNewAuthorPool(item.pool)) {
      const before = score;
      score += fair.underExposedBoost * 0.5;
      logs.push({
        itemType: item.itemType,
        itemId: item.itemId,
        storyId: item.storyId,
        authorUserId: item.authorUserId,
        surface,
        adjustmentType: "new_author_boost",
        oldScore: before,
        newScore: score,
        reason: "New author discovery boost",
        metadata: { request_id: options?.requestId }
      });
    }

    return {
      ...item,
      mixerScore: Math.max(0, Math.min(2, score))
    };
  });

  const meaningfulLogs = logs.filter(
    (log) => Math.abs(log.newScore - log.oldScore) > 0.015
  );

  if (options?.db && meaningfulLogs.length > 0) {
    void logFairnessAdjustments(options.db, meaningfulLogs);
  }

  return adjusted.sort((a, b) => b.mixerScore - a.mixerScore);
}
