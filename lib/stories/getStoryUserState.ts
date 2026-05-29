import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

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
      supabase
        .from("bookshelf_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("story_id", storyId)
        .maybeSingle(),
      creatorId
        ? supabase
            .from("follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("creator_id", creatorId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("story_id", storyId)
        .maybeSingle(),
      supabase
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
