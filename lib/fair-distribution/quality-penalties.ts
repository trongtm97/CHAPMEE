import type { DatabaseClient } from "@/lib/db/types";
import type { FairDistributionConfig } from "@/types/fair-distribution";
import type { FeedCandidate } from "@/types/feed-mixer";

const HIDDEN_QUALITY_STATUSES = new Set([
  "permanently_hidden_low_quality",
  "pending_quality_review",
  "low_quality_warning"
]);

export type StoryQualityFlag = {
  storyId: string;
  severity: string;
  status: string;
};

export async function loadStoryQualityFlags(
  db: DatabaseClient,
  storyIds: string[]
): Promise<Map<string, StoryQualityFlag[]>> {
  const map = new Map<string, StoryQualityFlag[]>();
  if (storyIds.length === 0) return map;

  const { data } = await db
    .from("content_taxonomy_quality_flags")
    .select("story_id, severity, status")
    .in("story_id", [...new Set(storyIds)])
    .in("status", ["open", "reviewing", "sent_to_creator"]);

  for (const row of data ?? []) {
    const storyId = String(row.story_id);
    const list = map.get(storyId) ?? [];
    list.push({
      storyId,
      severity: String(row.severity),
      status: String(row.status)
    });
    map.set(storyId, list);
  }
  return map;
}

export async function loadStoryQualityStatuses(
  db: DatabaseClient,
  storyIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (storyIds.length === 0) return map;

  const { data } = await db
    .from("stories")
    .select("id, quality_status")
    .in("id", [...new Set(storyIds)]);

  for (const row of data ?? []) {
    map.set(String(row.id), String(row.quality_status ?? "good"));
  }
  return map;
}

export function computeQualityPenalty(
  storyId: string,
  config: FairDistributionConfig,
  flags: Map<string, StoryQualityFlag[]>,
  qualityStatus: string | undefined
): { penalty: number; exclude: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let penalty = 0;
  let exclude = false;

  if (
    config.quality.hideLowQualityFromRecommendation &&
    qualityStatus &&
    HIDDEN_QUALITY_STATUSES.has(qualityStatus)
  ) {
    exclude = true;
    reasons.push("Ẩn do chất lượng nội dung thấp");
    return { penalty: 1, exclude, reasons };
  }

  const storyFlags = flags.get(storyId) ?? [];
  const hasCritical = storyFlags.some((f) => f.severity === "critical");
  const hasOpen = storyFlags.length > 0;

  if (hasCritical && config.quality.excludeSevereTaxonomyFlags) {
    exclude = true;
    reasons.push("Loại do taxonomy flag nghiêm trọng");
    return { penalty: 1, exclude, reasons };
  }

  if (hasOpen && config.quality.demoteUnresolvedTaxonomyFlags) {
    penalty += config.quality.taxonomyFlagDemotePenalty;
    reasons.push("Bị giảm do taxonomy flag chưa xử lý");
  }

  return { penalty: Math.min(1, penalty), exclude, reasons };
}

export function applyQualityPenalties(
  candidates: FeedCandidate[],
  config: FairDistributionConfig,
  flags: Map<string, StoryQualityFlag[]>,
  qualityStatuses: Map<string, string>
): FeedCandidate[] {
  return candidates.filter((candidate) => {
    const { exclude } = computeQualityPenalty(
      candidate.storyId,
      config,
      flags,
      qualityStatuses.get(candidate.storyId)
    );
    return !exclude;
  });
}

export async function loadQualityContextForCandidates(
  db: DatabaseClient,
  candidates: FeedCandidate[]
) {
  const storyIds = [...new Set(candidates.map((c) => c.storyId))];
  const [flags, qualityStatuses] = await Promise.all([
    loadStoryQualityFlags(db, storyIds),
    loadStoryQualityStatuses(db, storyIds)
  ]);
  return { flags, qualityStatuses };
}
