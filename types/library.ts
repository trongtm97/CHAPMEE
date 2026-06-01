import type { CollectionSummary } from "@/types/collection";
import type { ContinueReadingItem } from "@/lib/reading/getContinueReading";

export type LibraryTab = "reading" | "saved" | "collections" | "following";

export type LibrarySortOption =
  | "recent"
  | "updated"
  | "title"
  | "progress";

export type LibraryFilterOption =
  | "all"
  | "new_chapters"
  | "reading"
  | "finished";

export type ContinueReadingEnriched = ContinueReadingItem & {
  hasNewChapter: boolean;
  isCaughtUp: boolean;
  lastReadAt: string | null;
};

export type LibrarySavedStory = {
  id: string;
  slug: string;
  publicCode: string;
  title: string;
  coverUrl: string | null;
  authorName: string | null;
  isCompleted: boolean;
  episodeCount: number;
  structureType: "chaptered" | "standalone";
  standaloneReadingTimeMinutes: number;
  savedAt: string;
  latestEpisodePublishedAt: string | null;
  hasReadingProgress: boolean;
  progressPercent: number | null;
  currentEpisodeNumber: number | null;
  currentEpisodeSlug: string | null;
  currentEpisodePublicCode: string | null;
};

export type LibraryFollowedAuthor = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  storyCount: number;
  hasNewChapter: boolean;
};

export type LibraryFollowedStory = {
  id: string;
  slug: string;
  publicCode: string;
  title: string;
  coverUrl: string | null;
  authorName: string | null;
  hasNewChapter: boolean;
  followedAt: string;
};

export type LibraryFollowedGroup = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  postCount: number;
  isHot: boolean;
  isNew: boolean;
};

export type LibraryPageData = {
  continueReading: ContinueReadingEnriched[];
  continueReadingTotal: number;
  savedStories: LibrarySavedStory[];
  savedStoriesTotal: number;
  collections: CollectionSummary[];
  followedAuthors: LibraryFollowedAuthor[];
  followedStories: LibraryFollowedStory[];
  followedGroups: LibraryFollowedGroup[];
};
