import { getMyCollections } from "@/lib/supabase/collections";
import { getContinueReadingForLibrary } from "@/lib/library/get-continue-reading";
import { getFollowingForLibrary } from "@/lib/library/get-following";
import { getSavedStoriesForLibrary } from "@/lib/library/get-saved-stories";
import type { LibraryPageData } from "@/types/library";

const PAGE_SIZE = 30;

export async function getLibraryPageData(userId: string): Promise<LibraryPageData> {
  const [
    continueResult,
    savedResult,
    collections,
    followingResult
  ] = await Promise.all([
    getContinueReadingForLibrary(userId, { limit: PAGE_SIZE }),
    getSavedStoriesForLibrary(userId, { limit: PAGE_SIZE }),
    getMyCollections(50),
    getFollowingForLibrary(userId)
  ]);

  return {
    continueReading: continueResult.items,
    continueReadingTotal: continueResult.total,
    savedStories: savedResult.items,
    savedStoriesTotal: savedResult.total,
    collections,
    followedAuthors: followingResult.followedAuthors,
    followedStories: followingResult.followedStories,
    followedGroups: followingResult.followedGroups
  };
}
