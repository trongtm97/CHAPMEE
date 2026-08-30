import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig, type ScoringConfig } from "@/lib/scoring/config";
import { loadExposure7dContext } from "@/lib/fairness/load-exposure-7d";
import { createAdminClient } from "@/lib/data/admin";
import { isBroadSearchQuery } from "@/lib/search/normalize-query";
import type { SearchResultItem } from "@/types/search";

const EXACT_MATCH_FLOOR = 0.88;
const MAX_SAME_STORY_BROAD = 5;

function mapResultTypeToFilter(type: SearchResultItem["resultType"]) {
  if (type === "author") return "author";
  if (type === "chapter") return "chapter";
  if (type === "content_post") return "content_post";
  if (type === "story") return "story";
  return "all";
}

export async function loadSearchFairnessContext() {
  try {
    const admin = createAdminClient();
    return await loadExposure7dContext(admin, "search");
  } catch {
    return null;
  }
}

export async function loadSearchMaxSameAuthorTop() {
  const config = buildScoringConfig(await getAlgorithmConfig());
  const key = "search.max_same_author_top_results";
  const raw = (await getAlgorithmConfig())[key];
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 3;
}

function fairnessMultiplierForItem(
  item: SearchResultItem,
  authorShare: Map<string, number>,
  storyShare: Map<string, number>,
  fair: ScoringConfig["fairness"]
) {
  let multiplier = 1;
  const authorPct = authorShare.get(item.authorUserId ?? "") ?? 0;
  const storyPct = item.storyId ? (storyShare.get(item.storyId) ?? 0) : 0;

  if (authorPct > fair.authorExposureCap7dPercent) {
    const over =
      (authorPct - fair.authorExposureCap7dPercent) /
      Math.max(fair.authorExposureCap7dPercent, 1);
    multiplier -= Math.min(0.35, over * fair.authorOverCapPenalty);
  }

  if (storyPct > fair.storyExposureCap7dPercent) {
    const over =
      (storyPct - fair.storyExposureCap7dPercent) /
      Math.max(fair.storyExposureCap7dPercent, 1);
    multiplier -= Math.min(0.3, over * fair.storyOverCapPenalty);
  }

  return Math.max(0.55, multiplier);
}

export function applySearchFairness(
  results: SearchResultItem[],
  options: {
    query: string;
    maxSameAuthorTop?: number;
    authorSharePercent?: Map<string, number>;
    storySharePercent?: Map<string, number>;
    fairnessConfig?: ScoringConfig["fairness"];
  }
): SearchResultItem[] {
  const maxAuthor = options.maxSameAuthorTop ?? 3;
  const broad = isBroadSearchQuery(options.query);
  const fairRules = options.fairnessConfig;

  const exactTier = results.filter((item) => item.exactMatchScore >= EXACT_MATCH_FLOOR);
  const exactIds = new Set(exactTier.map((item) => `${item.resultType}:${item.id}`));
  const rest = results
    .filter((item) => !exactIds.has(`${item.resultType}:${item.id}`))
    .sort((a, b) => b.searchScore - a.searchScore);

  const authorShare = options.authorSharePercent ?? new Map();
  const storyShare = options.storySharePercent ?? new Map();

  const adjustedRest = rest.map((item) => {
    const multiplier = fairRules
      ? fairnessMultiplierForItem(item, authorShare, storyShare, fairRules)
      : 1;
    return {
      ...item,
      fairnessScore: item.fairnessScore * multiplier,
      searchScore: item.searchScore * multiplier
    };
  });

  adjustedRest.sort((a, b) => b.searchScore - a.searchScore);

  const picked: SearchResultItem[] = [...exactTier.sort((a, b) => b.searchScore - a.searchScore)];
  const deferred: SearchResultItem[] = [];
  const authorCountTop10 = new Map<string, number>();
  const storyCounts = new Map<string, number>();

  for (const item of adjustedRest) {
    const authorKey = item.authorUserId ?? item.id;
    const top10Authors = picked.length < 10 ? authorCountTop10 : null;

    let authorViolation = false;
    if (top10Authors && picked.length < 10) {
      const count = top10Authors.get(authorKey) ?? 0;
      authorViolation = count >= maxAuthor;
    }

    let storyViolation = false;
    if (broad && item.storyId) {
      storyViolation = (storyCounts.get(item.storyId) ?? 0) >= MAX_SAME_STORY_BROAD;
    }

    if (authorViolation || storyViolation) {
      deferred.push(item);
      continue;
    }

    picked.push(item);
    if (picked.length <= 10) {
      authorCountTop10?.set(authorKey, (authorCountTop10.get(authorKey) ?? 0) + 1);
    }
    if (item.storyId) {
      storyCounts.set(item.storyId, (storyCounts.get(item.storyId) ?? 0) + 1);
    }
  }

  for (const item of deferred) {
    picked.push(item);
  }

  return picked;
}

export function applySearchOriginBalance(
  items: SearchResultItem[],
  options: {
    enabled: boolean;
    originalMinPercent: number;
    translationMaxPercent: number;
    topWindow?: number;
  }
) {
  if (!options.enabled) return items;
  const topWindow = Math.max(4, options.topWindow ?? 10);
  const head = items.slice(0, topWindow);
  const tail = items.slice(topWindow);
  if (head.length === 0) return items;

  const originals = head.filter((item) => item.contentOrigin !== "translation");
  const translations = head.filter((item) => item.contentOrigin === "translation");
  const minOriginal = Math.ceil((head.length * options.originalMinPercent) / 100);
  const maxTranslation = Math.floor((head.length * options.translationMaxPercent) / 100);

  const balanced: SearchResultItem[] = [];
  balanced.push(...originals.slice(0, minOriginal));
  balanced.push(...translations.slice(0, Math.max(0, maxTranslation)));

  const used = new Set(balanced.map((item) => `${item.resultType}:${item.id}`));
  for (const item of head) {
    if (balanced.length >= head.length) break;
    const key = `${item.resultType}:${item.id}`;
    if (used.has(key)) continue;
    used.add(key);
    balanced.push(item);
  }

  return [...balanced, ...tail];
}

export function filterResultsByType(
  items: SearchResultItem[],
  type: string | undefined
) {
  if (!type || type === "all") return items;
  return items.filter((item) => mapResultTypeToFilter(item.resultType) === type);
}
