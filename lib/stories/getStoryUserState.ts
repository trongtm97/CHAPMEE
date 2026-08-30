import { createClient } from "@/lib/data/server";

export type StoryUserState = {
  userId: string | null;
  isLoggedIn: boolean;
  isSaved: boolean;
  isFollowingCreator: boolean;
  isFollowingStory: boolean;
  isEarlyFan: boolean;
  error: string | null;
};

export async function getStoryUserState(
  storyId: string,
  creatorId: string | null
): Promise<StoryUserState> {
  try {
    const db = await createClient();
    const {
      data: { user },
      error: userError
    } = await db.auth.getUser();

    if (userError || !user) {
      return {
        userId: null,
        isLoggedIn: false,
        isSaved: false,
        isFollowingCreator: false,
        isFollowingStory: false,
        isEarlyFan: false,
        error: userError?.message ?? null
      };
    }

    const [bookshelf, followCreator, followStory, earlyFan] = await Promise.all([
      db
        .from("bookshelf_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("story_id", storyId)
        .maybeSingle(),
      creatorId
        ? db
            .from("follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("creator_id", creatorId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      db
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("story_id", storyId)
        .maybeSingle(),
      db
        .from("story_early_fans")
        .select("id")
        .eq("user_id", user.id)
        .eq("story_id", storyId)
        .maybeSingle()
    ]);

    return {
      userId: user.id,
      isLoggedIn: true,
      isSaved: Boolean(bookshelf.data),
      isFollowingCreator: Boolean(followCreator.data),
      isFollowingStory: Boolean(followStory.data),
      isEarlyFan: Boolean(earlyFan.data),
      error:
        bookshelf.error?.message ??
        followCreator.error?.message ??
        followStory.error?.message ??
        earlyFan.error?.message ??
        null
    };
  } catch (error) {
    return {
      userId: null,
      isLoggedIn: false,
      isSaved: false,
      isFollowingCreator: false,
      isFollowingStory: false,
      isEarlyFan: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load story user state."
    };
  }
}
