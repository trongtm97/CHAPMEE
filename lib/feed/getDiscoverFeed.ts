import { getTagsByStory } from "@/lib/discover/tags";
import { enrichDiscoverCandidates } from "@/lib/feed/enrich-discover";
import { loadUserFeedExclusions } from "@/lib/feed/exclusions";
import { getCandidatesForSurface } from "@/lib/feed/pools";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import { createClient } from "@/lib/supabase/server";
import type { DiscoverSectionId } from "@/types/feed-mixer";

export type DiscoverFeedResult = {
  stories: DiscoverStory[];
  requestId: string;
  algorithmVersion: string;
  poolCounts: Record<string, number>;
  error: string | null;
};

const SECTION_LIMITS: Partial<Record<DiscoverSectionId, number>> = {
  recommended: 12,
  hot24h: 8,
  hot7d: 8,
  newStories: 8,
  updatedStories: 6,
  completedStories: 8,
  shortReads: 8,
  searchResults: 20
};

export async function getDiscoverFeed(
  userId: string | null,
  section: DiscoverSectionId = "recommended",
  limit?: number,
  genreSlug?: string | null
): Promise<DiscoverFeedResult> {
  const take = limit ?? SECTION_LIMITS[section] ?? 8;

  try {
    const supabase = await createClient();
    const { excludeKeys, recentlySeenKeys } = await loadUserFeedExclusions(
      supabase,
      userId
    );

    const mixed = await getCandidatesForSurface(supabase, "discover", userId, {
      limit: Math.max(take * 4, 40),
      genreSlug: genreSlug ?? undefined,
      excludeKeys,
      recentlySeenKeys
    });

    const poolFilter = sectionPoolPreference(section);
    const filtered =
      poolFilter.length > 0
        ? mixed.candidates.filter((c) => poolFilter.includes(c.pool))
        : mixed.candidates;

    const slice = (filtered.length > 0 ? filtered : mixed.candidates).slice(
      0,
      take
    );
    const storyIds = slice.map((c) => c.storyId);
    const tagsByStory = await getTagsByStory(storyIds);
    const stories = await enrichDiscoverCandidates(
      supabase,
      slice,
      {
        requestId: mixed.requestId,
        algorithmVersion: mixed.algorithmVersion
      },
      tagsByStory
    );

    return {
      stories,
      requestId: mixed.requestId,
      algorithmVersion: mixed.algorithmVersion,
      poolCounts: mixed.poolCounts,
      error: null
    };
  } catch (error) {
    return {
      stories: [],
      requestId: "",
      algorithmVersion: "1.0.0",
      poolCounts: {},
      error:
        error instanceof Error ? error.message : "Could not load discover feed."
    };
  }
}

function sectionPoolPreference(section: DiscoverSectionId) {
  switch (section) {
    case "newStories":
    case "updatedStories":
      return ["fresh", "personalized"];
    case "hot24h":
    case "hot7d":
      return ["growing", "trending_quality"];
    case "completedStories":
      return ["completed_story", "long_tail_quality"];
    case "shortReads":
      return ["fresh", "personalized", "long_tail_quality"];
    default:
      return [];
  }
}
