import { randomUUID } from "crypto";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { collectSearchCandidates } from "@/lib/search/collect-candidates";
import {
  applySearchFairness,
  filterResultsByType,
  loadSearchFairnessContext,
  loadSearchMaxSameAuthorTop
} from "@/lib/search/fairness";
import { resolveSearchWeights, scoreSearchCandidate } from "@/lib/search/ranking";
import { calculateTextRelevance } from "@/lib/search/relevance";
import { trackSearchResults } from "@/lib/search/track-search";
import { getLatestScoresForItems } from "@/lib/scoring/snapshots";
import { createPublicClient } from "@/lib/supabase/public-client";
import { createClient } from "@/lib/supabase/server";
import type { SearchAllResult, SearchFilters } from "@/types/search";
import type { SupabaseClient } from "@supabase/supabase-js";

function freshnessFromPublishedAt(publishedAt: string | null | undefined) {
  if (!publishedAt) return 0.35;
  const days = (Date.now() - new Date(publishedAt).getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 3) return 0.95;
  if (days <= 14) return 0.75;
  if (days <= 60) return 0.55;
  return 0.35;
}

function mapItemType(resultType: string) {
  if (resultType === "chapter") return "chapter" as const;
  if (resultType === "story") return "story" as const;
  return null;
}

async function resolveScoresForCandidates(
  supabase: SupabaseClient,
  candidates: Awaited<ReturnType<typeof collectSearchCandidates>>
) {
  const storyIds: string[] = [];
  const chapterIds: string[] = [];

  for (const candidate of candidates) {
    const itemType = mapItemType(candidate.resultType);
    if (itemType === "story") {
      storyIds.push(candidate.id);
    } else if (itemType === "chapter") {
      chapterIds.push(candidate.id);
    }
  }

  const [storyScores, chapterScores] = await Promise.all([
    getLatestScoresForItems(supabase, "story", storyIds, "7d"),
    getLatestScoresForItems(supabase, "chapter", chapterIds, "7d")
  ]);

  return { storyScores, chapterScores };
}

function pickCandidateScores(
  candidate: Awaited<ReturnType<typeof collectSearchCandidates>>[number],
  storyScores: Map<string, import("@/types/scoring").ContentScoreSnapshotRow>,
  chapterScores: Map<string, import("@/types/scoring").ContentScoreSnapshotRow>
) {
  const itemType = mapItemType(candidate.resultType);
  if (!itemType) {
    return { qualityScore: 0.4, freshnessScore: freshnessFromPublishedAt(candidate.publishedAt) };
  }

  const snapshot =
    itemType === "story"
      ? storyScores.get(candidate.id)
      : chapterScores.get(candidate.id);

  return {
    qualityScore: snapshot?.quality_score ?? 0.4,
    freshnessScore:
      snapshot?.freshness_score ?? freshnessFromPublishedAt(candidate.publishedAt)
  };
}

export async function searchAll(
  query: string,
  filters: SearchFilters = {},
  userId?: string | null
): Promise<SearchAllResult> {
  const trimmed = query.trim();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 5), 40);
  const requestId = randomUUID();

  if (!trimmed || trimmed.length < 2) {
    return {
      query: "",
      requestId,
      algorithmVersion: "1.0.0",
      items: [],
      totalCount: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      countsByType: {},
      error: null
    };
  }

  try {
    const supabase = createPublicClient();
    const weights = await resolveSearchWeights();
    const config = await getAlgorithmConfig();
    const algorithmVersion =
      typeof config["system.algorithm_version"] === "string"
        ? config["system.algorithm_version"]
        : "1.0.0";

    const raw = await collectSearchCandidates(supabase, trimmed, {
      genre: filters.genre
    });

    const scoreMaps = await resolveScoresForCandidates(supabase, raw);

    const scored = await Promise.all(
      raw.map(async (candidate) => {
        const textRelevance = calculateTextRelevance(trimmed, {
          title: candidate.title,
          slug: candidate.slug,
          description: candidate.description,
          tags: candidate.tags,
          genreName: candidate.genreName,
          genreSlug: candidate.genreSlug,
          authorDisplayName: candidate.authorDisplayName,
          authorUsername: candidate.authorUsername,
          chapterTitle: candidate.chapterTitle,
          resultType: candidate.resultType
        });

        if (textRelevance < 0.08) {
          return null;
        }

        const signal = pickCandidateScores(
          candidate,
          scoreMaps.storyScores,
          scoreMaps.chapterScores
        );
        const scoredItem = scoreSearchCandidate(
          trimmed,
          {
            title: candidate.title,
            slug: candidate.slug,
            description: candidate.description,
            tags: candidate.tags,
            genreName: candidate.genreName,
            genreSlug: candidate.genreSlug,
            authorDisplayName: candidate.authorDisplayName,
            authorUsername: candidate.authorUsername,
            chapterTitle: candidate.chapterTitle,
            resultType: candidate.resultType
          },
          { ...signal, fairnessScore: 1, safetyPenalty: 0 },
          weights
        );

        return {
          resultType: candidate.resultType,
          id: candidate.id,
          title: candidate.title,
          subtitle: candidate.subtitle,
          description: candidate.description,
          href: candidate.href,
          imageUrl: candidate.imageUrl,
          storyId: candidate.storyId,
          storySlug: candidate.storySlug,
          storyPublicCode: candidate.storyPublicCode ?? null,
          authorUserId: candidate.authorUserId,
          authorUsername: candidate.authorUsername,
          authorDisplayName: candidate.authorDisplayName,
          episodeNumber: candidate.episodeNumber,
          ...scoredItem
        };
      })
    );

    const filtered = scored.filter(Boolean) as SearchAllResult["items"];

    const exposure = await loadSearchFairnessContext();
    const maxSameAuthor = await loadSearchMaxSameAuthorTop();
    const scoringConfig = buildScoringConfig(config);
    const fairRanked = applySearchFairness(filtered, {
      query: trimmed,
      maxSameAuthorTop: maxSameAuthor,
      authorSharePercent: exposure?.authorSharePercent,
      storySharePercent: exposure?.storySharePercent,
      fairnessConfig: scoringConfig.fairness
    });

    const typeFiltered = filterResultsByType(
      fairRanked,
      filters.type === "all" ? undefined : filters.type
    );

    const countsByType = fairRanked.reduce<SearchAllResult["countsByType"]>((acc, item) => {
      acc[item.resultType] = (acc[item.resultType] ?? 0) + 1;
      return acc;
    }, {});

    const totalCount = typeFiltered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const pageItems = typeFiltered.slice(offset, offset + pageSize);

    const authClient = await createClient();
    const {
      data: { user }
    } = await authClient.auth.getUser();
    const resolvedUserId = userId ?? user?.id ?? null;

    void trackSearchResults(trimmed, pageItems, {
      requestId,
      algorithmVersion,
      userId: resolvedUserId
    });

    return {
      query: trimmed,
      requestId,
      algorithmVersion,
      items: pageItems,
      totalCount,
      page: safePage,
      pageSize,
      totalPages,
      countsByType,
      error: null
    };
  } catch (error) {
    return {
      query: trimmed,
      requestId,
      algorithmVersion: "1.0.0",
      items: [],
      totalCount: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      countsByType: {},
      error: error instanceof Error ? error.message : "Search failed."
    };
  }
}
