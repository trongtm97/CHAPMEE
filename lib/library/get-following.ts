import { createClient } from "@/lib/supabase/server";
import { getMyCommunityGroups } from "@/lib/community/get-community-groups";
import type {
  LibraryFollowedAuthor,
  LibraryFollowedGroup,
  LibraryFollowedStory
} from "@/types/library";

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

async function getLatestEpisodeNumbers(storyIds: string[]) {
  if (storyIds.length === 0) {
    return new Map<string, number>();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("episodes")
    .select("story_id, episode_number")
    .in("story_id", storyIds)
    .order("episode_number", { ascending: false });

  const latestByStory = new Map<string, number>();
  for (const row of data ?? []) {
    const storyId = row.story_id as string;
    if (!latestByStory.has(storyId)) {
      latestByStory.set(storyId, Number(row.episode_number));
    }
  }
  return latestByStory;
}

export async function getFollowingForLibrary(userId: string) {
  try {
    const supabase = await createClient();
    const [{ data: creatorFollows }, { data: storyFollows }, communityResult] =
      await Promise.all([
        supabase
          .from("follows")
          .select("created_at, creator_id, creator_profiles(id, pen_name, avatar_url)")
          .eq("follower_id", userId)
          .not("creator_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("follows")
          .select(
            "created_at, story_id, stories(id, title, slug, cover_url, creator_profiles(pen_name))"
          )
          .eq("follower_id", userId)
          .not("story_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(20),
        getMyCommunityGroups(userId)
      ]);

    const followedStoryIds = (storyFollows ?? [])
      .map((row) => row.story_id as string | null)
      .filter((id): id is string => Boolean(id));

    const readEpisodeByStory = new Map<string, number>();
    if (followedStoryIds.length > 0) {
      const { data: progressRows } = await supabase
        .from("reading_progress")
        .select("story_id, episodes(episode_number)")
        .eq("user_id", userId)
        .in("story_id", followedStoryIds);

      for (const row of progressRows ?? []) {
        const episode = firstRelation(
          (row as { episodes: { episode_number: number } | { episode_number: number }[] })
            .episodes
        );
        if (episode) {
          readEpisodeByStory.set(row.story_id as string, Number(episode.episode_number));
        }
      }
    }

    const latestByStory = await getLatestEpisodeNumbers(followedStoryIds);

    const creatorIds = (creatorFollows ?? [])
      .map((row) => (row as { creator_id: string | null }).creator_id)
      .filter((id): id is string => Boolean(id));

    const storyCountByCreator = new Map<string, number>();
    if (creatorIds.length > 0) {
      const { data: storyCounts } = await supabase
        .from("stories")
        .select("creator_id")
        .in("creator_id", creatorIds)
        .in("status", ["approved", "published"]);

      for (const story of storyCounts ?? []) {
        const cid = story.creator_id as string;
        storyCountByCreator.set(cid, (storyCountByCreator.get(cid) ?? 0) + 1);
      }
    }

    const followedAuthors: LibraryFollowedAuthor[] = (creatorFollows ?? [])
      .map((row) => {
        const creator = firstRelation(
          (
            row as {
              creator_profiles:
                | {
                    id: string;
                    pen_name: string | null;
                    avatar_url: string | null;
                  }
                | {
                    id: string;
                    pen_name: string | null;
                    avatar_url: string | null;
                  }[]
                | null;
            }
          ).creator_profiles
        );
        if (!creator?.id || !creator.pen_name) {
          return null;
        }

        return {
          id: creator.id,
          penName: creator.pen_name,
          avatarUrl: creator.avatar_url,
          storyCount: storyCountByCreator.get(creator.id) ?? 0,
          hasNewChapter: false
        };
      })
      .filter((item): item is LibraryFollowedAuthor => Boolean(item));

    const followedStories: LibraryFollowedStory[] = (storyFollows ?? [])
      .map((row) => {
        const story = firstRelation(
          (
            row as {
              created_at: string;
              stories:
                | {
                    id: string;
                    title: string;
                    slug: string;
                    cover_url: string | null;
                    creator_profiles:
                      | { pen_name: string | null }
                      | { pen_name: string | null }[]
                      | null;
                  }
                | {
                    id: string;
                    title: string;
                    slug: string;
                    cover_url: string | null;
                    creator_profiles:
                      | { pen_name: string | null }
                      | { pen_name: string | null }[]
                      | null;
                  }[]
                | null;
            }
          ).stories
        );
        if (!story) {
          return null;
        }
        const creator = firstRelation(story.creator_profiles);
        const latestEpisode = latestByStory.get(story.id) ?? 0;
        const readEpisode = readEpisodeByStory.get(story.id);
        const hasNewChapter =
          latestEpisode > 0 && (readEpisode == null || readEpisode < latestEpisode);

        return {
          id: story.id,
          slug: story.slug,
          title: story.title,
          coverUrl: story.cover_url,
          authorName: creator?.pen_name ?? null,
          hasNewChapter,
          followedAt: (row as { created_at: string }).created_at
        };
      })
      .filter((item): item is LibraryFollowedStory => Boolean(item));

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const followedGroups: LibraryFollowedGroup[] = communityResult.groups
      .slice(0, 12)
      .map((group) => {
        const lastActivity = group.lastActivityAt
          ? new Date(group.lastActivityAt).getTime()
          : 0;
        const isNew = lastActivity >= weekAgo;
        return {
          id: group.storyId,
          slug: group.slug,
          title: group.storyTitle || group.name,
          coverUrl: group.coverUrl,
          postCount: group.postCount,
          isHot: group.postCount >= 5 || group.badge === "hot",
          isNew: isNew || group.badge === "new_chapter"
        };
      });

    return {
      followedAuthors,
      followedStories,
      followedGroups,
      error: null as string | null
    };
  } catch (error) {
    return {
      followedAuthors: [] as LibraryFollowedAuthor[],
      followedStories: [] as LibraryFollowedStory[],
      followedGroups: [] as LibraryFollowedGroup[],
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách theo dõi."
    };
  }
}
