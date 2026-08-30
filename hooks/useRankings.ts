"use client";

import { useState, useEffect, useReducer, useCallback } from "react";
import type {
  RankingCategory,
  RankingTimePeriod,
  StoryRankingItem,
  AuthorRankingItem,
  FanRankingItem
} from "@/types/ranking";
import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { createClient } from "@/lib/data/client";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";

export type RankingData = {
  hotStories: StoryRankingItem[];
  risingStories: StoryRankingItem[];
  topAuthors: AuthorRankingItem[];
  topFans: FanRankingItem[];
};

type RankingState = {
  data: RankingData;
  loading: boolean;
  error: string | null;
};

type RankingAction =
  | { type: "loading" }
  | { type: "success"; data: RankingData }
  | { type: "error"; error: string };

const emptyData: RankingData = {
  hotStories: [],
  risingStories: [],
  topAuthors: [],
  topFans: []
};

const RANKING_CACHE_TTL_MS = 120_000;
const rankingCache = new Map<string, { data: RankingData; fetchedAt: number }>();

function rankingCacheKey(category: RankingCategory, period: RankingTimePeriod) {
  return `${category}:${period}`;
}

function rankingReducer(
  _state: RankingState,
  action: RankingAction
): RankingState {
  switch (action.type) {
    case "loading":
      return { data: emptyData, loading: true, error: null };
    case "success":
      return { data: action.data, loading: false, error: null };
    case "error":
      return { data: emptyData, loading: false, error: action.error };
  }
}

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
  short_description: string | null;
  published_at: string | null;
  creator_profiles:
    | {
        id: string | null;
        pen_name: string | null;
        profiles?: { display_name: string | null; username: string | null } | null;
      }
    | {
        id: string | null;
        pen_name: string | null;
        profiles?: { display_name: string | null; username: string | null } | null;
      }[]
    | null;
};

type ScoreRow = {
  story_id: string;
  score: number;
};

type AuthorRow = {
  author_id: string;
  user_id: string;
  pen_name: string;
  username?: string | null;
  avatar_url: string | null;
  follower_count: number;
  story_count: number;
  total_reads: number;
  score: number;
};

type FanRow = {
  rank: number;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_score: number;
  is_current_user: boolean;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function getTimePeriodStart(period: RankingTimePeriod): string | null {
  const now = Date.now();

  switch (period) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "week":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "all":
      return null;
  }
}

function toStoryRankingItem(
  row: StoryRow,
  score: number,
  rank: number,
  genreName: string | null
): StoryRankingItem {
  const creator = firstRelation(row.creator_profiles);

  return {
    id: row.id,
    rank,
    title: row.title,
    slug: row.slug,
    publicCode: row.public_code,
    hook: row.hook,
    shortDescription: row.short_description,
    genreName,
    creatorName: creator
      ? resolvePublicDisplayName(firstRelation(creator.profiles), creator)
      : null,
    creatorId: creator?.id ?? null,
    score
  };
}

async function fetchHotStories(
  db: ReturnType<typeof createClient>,
  windowStart: string | null,
  limit: number
): Promise<StoryRankingItem[]> {
  const { data: scoresData } = await db.rpc("get_public_story_rankings", {
    window_start: windowStart,
    ranking_limit: limit
  });

  const scoreRows = ((scoresData ?? []) as ScoreRow[]).filter(
    (row) => row.score > 0
  );

  if (scoreRows.length === 0) {
    const { data: recentData } = await db
      .from("stories")
      .select(
        `id, title, slug, public_code, hook, short_description, published_at, ${CREATOR_PROFILE_STORY_JOIN}`
      )
      .in("status", ["approved", "published"])
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(limit);

    const recentRows = (recentData ?? []) as unknown as StoryRow[];
    const recentTaxonomy = await getStoryTaxonomyLabelsByStoryIds(
      db,
      recentRows.map((row) => row.id)
    );

    return recentRows.map((row, index) =>
      toStoryRankingItem(
        row,
        0,
        index + 1,
        recentTaxonomy.get(row.id)?.mainGenreName ?? null
      )
    );
  }

  const storyIds = scoreRows.map((row) => row.story_id);
  const { data } = await db
    .from("stories")
    .select(
      `id, title, slug, public_code, hook, short_description, published_at, ${CREATOR_PROFILE_STORY_JOIN}`
    )
    .in("id", storyIds)
    .in("status", ["approved", "published"])
    .eq("visibility", "public");

  const rowsMap = new Map(
    ((data ?? []) as unknown as StoryRow[]).map((row) => [row.id, row])
  );
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

  return scoreRows
    .map((scoreRow, index) => {
      const row = rowsMap.get(scoreRow.story_id);
      return row
        ? toStoryRankingItem(
            row,
            Number(scoreRow.score),
            index + 1,
            taxonomyByStory.get(row.id)?.mainGenreName ?? null
          )
        : null;
    })
    .filter((item): item is StoryRankingItem => item !== null);
}

async function fetchRisingStories(
  db: ReturnType<typeof createClient>,
  windowStart: string | null,
  limit: number
): Promise<StoryRankingItem[]> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: scoresData } = await db.rpc("get_public_story_rankings", {
    window_start: windowStart ?? thirtyDaysAgo,
    ranking_limit: limit * 2
  });

  const scoreRows = ((scoresData ?? []) as ScoreRow[]).filter(
    (row) => row.score > 0
  );

  if (scoreRows.length === 0) return [];

  const storyIds = scoreRows.map((row) => row.story_id);
  const { data } = await db
    .from("stories")
    .select(
      `id, title, slug, public_code, hook, short_description, published_at, ${CREATOR_PROFILE_STORY_JOIN}`
    )
    .in("id", storyIds)
    .in("status", ["approved", "published"])
    .eq("visibility", "public")
    .gte("published_at", thirtyDaysAgo);

  const rowsMap = new Map(
    ((data ?? []) as unknown as StoryRow[]).map((row) => [row.id, row])
  );
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

  return scoreRows
    .map((scoreRow, index) => {
      const row = rowsMap.get(scoreRow.story_id);
      return row
        ? toStoryRankingItem(
            row,
            Number(scoreRow.score),
            index + 1,
            taxonomyByStory.get(row.id)?.mainGenreName ?? null
          )
        : null;
    })
    .filter((item): item is StoryRankingItem => item !== null)
    .slice(0, limit);
}

async function fetchTopAuthors(
  db: ReturnType<typeof createClient>,
  windowStart: string | null,
  limit: number
): Promise<AuthorRankingItem[]> {
  const { data, error } = await db.rpc("get_top_authors", {
    window_start: windowStart,
    ranking_limit: limit
  });

  if (error || !data) return [];

  return (data as AuthorRow[]).map((row, index) => ({
    id: row.author_id,
    rank: index + 1,
    userId: row.user_id,
    displayName: row.pen_name ?? "Tác giả",
    username: row.username ?? null,
    avatarUrl: row.avatar_url,
    followerCount: Number(row.follower_count),
    totalReads: Number(row.total_reads),
    storyCount: Number(row.story_count),
    score: Number(row.score)
  }));
}

async function fetchTopFans(
  db: ReturnType<typeof createClient>,
  limit: number
): Promise<FanRankingItem[]> {
  const { data, error } = await db.rpc("get_app_top_fans", {
    ranking_limit: limit,
    input_user_id: null
  });

  if (error || !data) return [];

  return (data as FanRow[]).map((row) => ({
    id: row.user_id,
    rank: Number(row.rank),
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    totalScore: Number(row.total_score),
    isCurrentUser: Boolean(row.is_current_user)
  }));
}

export function useRankings(
  initialCategory: RankingCategory = "hot_stories",
  initialPeriod: RankingTimePeriod = "week"
) {
  const [activeTab, setActiveTab] = useState<RankingCategory>(initialCategory);
  const [timePeriod, setTimePeriod] = useState<RankingTimePeriod>(initialPeriod);
  const [state, dispatch] = useReducer(rankingReducer, {
    data: emptyData,
    loading: true,
    error: null
  });

  const fetchData = useCallback(
    async (category: RankingCategory, period: RankingTimePeriod) => {
      const cacheKey = rankingCacheKey(category, period);
      const cached = rankingCache.get(cacheKey);
      const hasStaleCache =
        cached !== undefined && Date.now() - cached.fetchedAt < RANKING_CACHE_TTL_MS;

      if (hasStaleCache) {
        dispatch({ type: "success", data: cached.data });
      } else {
        dispatch({ type: "loading" });
      }

      const db = createClient();

      try {
        const windowStart = getTimePeriodStart(period);
        const results: RankingData = { ...emptyData };

        if (category === "hot_stories") {
          results.hotStories = await fetchHotStories(db, windowStart, 20);
        }

        if (category === "rising_stories") {
          results.risingStories = await fetchRisingStories(
            db,
            windowStart,
            20
          );
        }

        if (category === "top_authors") {
          results.topAuthors = await fetchTopAuthors(db, windowStart, 20);
        }

        if (category === "top_fans") {
          results.topFans = await fetchTopFans(db, 20);
        }

        rankingCache.set(cacheKey, { data: results, fetchedAt: Date.now() });
        dispatch({ type: "success", data: results });
      } catch {
        if (!hasStaleCache) {
          dispatch({
            type: "error",
            error: "Không thể tải dữ liệu xếp hạng."
          });
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchData(activeTab, timePeriod);
  }, [activeTab, timePeriod, fetchData]);

  return {
    activeTab,
    setActiveTab,
    timePeriod,
    setTimePeriod,
    ...state
  };
}
