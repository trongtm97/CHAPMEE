import { randomUUID } from "crypto";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { collectSearchCandidates } from "@/lib/search/collect-candidates";
import {
  applySearchFairness,
  applySearchOriginBalance,
  filterResultsByType,
  loadSearchFairnessContext,
  loadSearchMaxSameAuthorTop
} from "@/lib/search/fairness";
import { loadContentOriginMixSettings } from "@/lib/algorithm/content-origin-mix";
import { resolveSearchWeights, scoreSearchCandidate } from "@/lib/search/ranking";
import { calculateTextRelevance } from "@/lib/search/relevance";
import { trackSearchResults } from "@/lib/search/track-search";
import { getLatestScoresForItems } from "@/lib/scoring/snapshots";
import { createPublicClient } from "@/lib/data/public-client";
import { createClient } from "@/lib/data/server";
import { checkScopedRateLimitFromSettings } from "@/lib/security/rate-limit";
import { getSecurityRequestContext } from "@/lib/security/request-context";
import type { SearchAllResult, SearchFilters } from "@/types/search";
import type { DatabaseClient } from "@/lib/db/types";

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
  db: DatabaseClient,
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
    getLatestScoresForItems(db, "story", storyIds, "7d"),
    getLatestScoresForItems(db, "chapter", chapterIds, "7d")
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

  const searchCtx = await getSecurityRequestContext("/search");
  const rateSubject = userId ?? searchCtx.ipHash ?? "anon";
  const searchRate = await checkScopedRateLimitFromSettings({
    scope: "search",
    subjectKey: rateSubject,
    ctx: searchCtx,
    profileId: userId ?? null,
    path: "/search"
  });

  if (!searchRate.allowed) {
    return {
      query: trimmed,
      requestId,
      algorithmVersion: "1.0.0",
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      countsByType: {},
      error: "Bạn tìm kiếm quá nhanh. Thử lại sau."
    };
  }

  try {
    const db = createPublicClient();
    const weights = await resolveSearchWeights();
    const config = await getAlgorithmConfig();
    const algorithmVersion =
      typeof config["system.algorithm_version"] === "string"
        ? config["system.algorithm_version"]
        : "1.0.0";

    const raw = await collectSearchCandidates(db, trimmed, {
      genre: filters.genre
    });

    const scoreMaps = await resolveScoresForCandidates(db, raw);

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
          contentOrigin: candidate.contentOrigin,
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
    const mixSettings = await loadContentOriginMixSettings();
    const fairRankedWithOrigin = applySearchOriginBalance(fairRanked, {
      enabled: mixSettings.contentOriginFairnessEnabled,
      originalMinPercent: mixSettings.originalMinExposurePercent,
      translationMaxPercent: mixSettings.translationMaxExposurePercent,
      topWindow: 10
    });

    const typeFiltered = filterResultsByType(
      fairRankedWithOrigin,
      filters.type === "all" ? undefined : filters.type
    );
    const originFiltered =
      filters.origin && filters.origin !== "all"
        ? typeFiltered.filter((item) => item.contentOrigin === filters.origin)
        : typeFiltered;

    const countsByType = fairRankedWithOrigin.reduce<SearchAllResult["countsByType"]>((acc, item) => {
      acc[item.resultType] = (acc[item.resultType] ?? 0) + 1;
      return acc;
    }, {});

    const totalCount = originFiltered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const pageItems = originFiltered.slice(offset, offset + pageSize);

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
