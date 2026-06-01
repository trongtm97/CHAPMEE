import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { DiscoverSectionKey } from "@/types/discover-sections";
import type { FeedCandidate } from "@/types/feed-mixer";

export type DiscoverSectionDraft = {
  key: DiscoverSectionKey;
  candidates: FeedCandidate[];
  limit: number;
};

export type DiscoverSectionResult = {
  key: DiscoverSectionKey;
  stories: DiscoverStory[];
};

function authorKey(candidate: FeedCandidate) {
  return candidate.authorUserId || candidate.creatorId || candidate.storyId;
}

export function pickSectionCandidates(
  allCandidates: FeedCandidate[],
  pools: string[],
  limit: number,
  usedStoryIds: Set<string>,
  globalAuthorCounts: Map<string, number>,
  options?: { maxPerAuthor?: number }
): FeedCandidate[] {
  const maxPerAuthor = options?.maxPerAuthor ?? 2;
  const picked: FeedCandidate[] = [];
  const sectionAuthors = new Map<string, number>();

  const sorted = allCandidates
    .filter((candidate) => pools.length === 0 || pools.includes(candidate.pool))
    .sort((a, b) => b.mixerScore - a.mixerScore);

  for (const candidate of sorted) {
    if (picked.length >= limit) break;
    if (usedStoryIds.has(candidate.storyId)) continue;

    const author = authorKey(candidate);
    if ((sectionAuthors.get(author) ?? 0) >= maxPerAuthor) continue;
    if ((globalAuthorCounts.get(author) ?? 0) >= 4) continue;

    picked.push(candidate);
    usedStoryIds.add(candidate.storyId);
    sectionAuthors.set(author, (sectionAuthors.get(author) ?? 0) + 1);
    globalAuthorCounts.set(author, (globalAuthorCounts.get(author) ?? 0) + 1);
  }

  return picked;
}

export function dedupeDiscoverItemsAcrossSections(
  sections: DiscoverSectionResult[]
): DiscoverSectionResult[] {
  const usedStoryIds = new Set<string>();
  const globalAuthorCounts = new Map<string, number>();

  return sections.map((section) => {
    const stories: DiscoverStory[] = [];
    const sectionAuthors = new Map<string, number>();

    for (const story of section.stories) {
      if (usedStoryIds.has(story.id)) continue;

      const author =
        story.creatorUserId ?? story.creatorUsername ?? story.creatorName ?? story.id;
      if ((sectionAuthors.get(author) ?? 0) >= 2) continue;
      if ((globalAuthorCounts.get(author) ?? 0) >= 4) continue;

      stories.push(story);
      usedStoryIds.add(story.id);
      sectionAuthors.set(author, (sectionAuthors.get(author) ?? 0) + 1);
      globalAuthorCounts.set(author, (globalAuthorCounts.get(author) ?? 0) + 1);
    }

    return { ...section, stories };
  });
}

export function mergeSectionStories(
  drafts: DiscoverSectionDraft[],
  storyById: Map<string, DiscoverStory>
): DiscoverSectionResult[] {
  return drafts.map((draft) => ({
    key: draft.key,
    stories: draft.candidates
      .map((candidate) => storyById.get(candidate.storyId))
      .filter(Boolean) as DiscoverStory[]
  }));
}
