import type { CurrentUserProfile } from "@/lib/auth/getCurrentUser";
import { getReaderEarlyFanStories } from "@/lib/supabase/early-fans";
import { getUserTopFanHighlights } from "@/lib/supabase/fan-scores";
import {
  getUserMilestones,
  syncReaderMilestones,
  toMilestoneViewItems
} from "@/lib/supabase/milestones";
import {
  getUserBadges,
  syncReaderBadges,
  toBadgeViewItems,
  toProfileBadgeChips
} from "@/lib/supabase/badges";
import { createClient } from "@/lib/supabase/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { buildReaderAchievements } from "@/lib/profile/profileIdentity";
import type { EarlyFanStoryItem } from "@/types/early-fan";
import type { BadgeViewItem } from "@/types/badge";
import type { TopFanHighlight } from "@/types/fan";
import type { MilestoneViewItem } from "@/types/milestone";
import type { ProfileAchievement, ProfileBadge, ProfileStoryItem } from "@/types/profile";

type ReaderProfileMetricsRow = {
  saved_story_count: number | null;
  following_creator_count: number | null;
  comment_count: number | null;
  comment_like_count: number | null;
};

type StoryRelation = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  cover_url: string | null;
  hook: string | null;
  creator_profiles:
    | { pen_name: string | null }
    | { pen_name: string | null }[]
    | null;
};

type BookshelfRow = {
  status: "saved" | "reading" | "completed";
  stories: StoryRelation | StoryRelation[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function toStoryItem(
  story: StoryRelation,
  status: BookshelfRow["status"],
  genreName: string | null
): ProfileStoryItem {
  const creator = firstRelation(story.creator_profiles);

  return {
    id: story.id,
    slug: story.slug,
    publicCode: story.public_code,
    title: story.title,
    coverUrl: story.cover_url,
    subtitle: story.hook || creator?.pen_name || null,
    meta: status === "saved" ? genreName : `Đang ${status}`
  };
}

function buildFavoriteGenres(
  rows: BookshelfRow[],
  taxonomyByStory: Map<string, { mainGenreName: string | null }>
) {
  const genreCounts = new Map<string, number>();

  for (const row of rows) {
    const story = firstRelation(row.stories);
    const genreName = story ? taxonomyByStory.get(story.id)?.mainGenreName : null;

    if (!genreName) {
      continue;
    }

    genreCounts.set(genreName, (genreCounts.get(genreName) ?? 0) + 1);
  }

  return [...genreCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 3);
}

export type ReaderProfileData = {
  badges: ProfileBadge[];
  achievements: ProfileAchievement[];
  badgeItems: BadgeViewItem[];
  milestones: MilestoneViewItem[];
  topFanHighlights: TopFanHighlight[];
  favoriteGenres: { name: string; count: number }[];
  savedStories: ProfileStoryItem[];
  earlyFanStories: EarlyFanStoryItem[];
  metrics: {
    savedStoriesCount: number;
    followingAuthorsCount: number;
    commentCount: number;
    commentLikeCount: number;
  };
  error: string | null;
};

export async function getReaderProfile(
  profile: CurrentUserProfile
): Promise<ReaderProfileData> {
  try {
    const supabase = await createClient();

    const [
      { data: metricsRows, error: metricsError },
      { data: bookshelfRows, error: bookshelfError },
      earlyFanStories,
      topFanHighlights
    ] = await Promise.all([
      supabase.rpc("get_reader_profile_metrics", {
        input_user_id: profile.id
      }),
      supabase
        .from("bookshelf_items")
        .select(
          "status, stories(id, title, slug, public_code, cover_url, hook, creator_profiles(pen_name))"
        )
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false }),
      getReaderEarlyFanStories(profile.id),
      getUserTopFanHighlights(profile.id, 5)
    ]);

    if (metricsError) {
      throw metricsError;
    }

    if (bookshelfError) {
      throw bookshelfError;
    }

    const metrics = (Array.isArray(metricsRows) ? metricsRows[0] : metricsRows) as
      | ReaderProfileMetricsRow
      | null;

    const bookshelf = (bookshelfRows ?? []) as BookshelfRow[];
    const storyIds = [
      ...new Set(
        bookshelf
          .map((row) => firstRelation(row.stories)?.id)
          .filter((id): id is string => Boolean(id))
      )
    ];
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(supabase, storyIds);
    const savedStories = bookshelf
      .filter((row) => row.status === "saved")
      .map((row) => {
        const story = firstRelation(row.stories);

        if (!story) {
          return null;
        }

        return toStoryItem(
          story,
          row.status,
          taxonomyByStory.get(story.id)?.mainGenreName ?? null
        );
      })
      .filter((item): item is ProfileStoryItem => Boolean(item))
      .slice(0, 6);

    const savedStoriesCount = Number(metrics?.saved_story_count ?? 0);
    const followingAuthorsCount = Number(metrics?.following_creator_count ?? 0);
    const commentCount = Number(metrics?.comment_count ?? 0);
    const commentLikeCount = Number(metrics?.comment_like_count ?? 0);

    await syncReaderMilestones({
      commentCount,
      earlyFanStories: earlyFanStories.map((story) => ({
        slug: story.slug,
        storyId: story.storyId,
        title: story.title
      })),
      followingAuthorsCount,
      savedStoriesCount,
      userId: profile.id,
      topFanStories: topFanHighlights
        .filter((item) => item.kind === "story")
        .map((item) => {
          const storyId = item.id.split(":").pop() ?? item.id;

          return {
            rank: item.rank,
            storyId,
            storyTitle: item.title
          };
        })
    });

    await syncReaderBadges({
      userId: profile.id,
      createdAt: profile.created_at,
      savedStoriesCount,
      followingAuthorsCount,
      commentCount,
      commentLikeCount,
      earlyFanStories
    });

    const badgeRecords = await getUserBadges({
      userId: profile.id,
      type: ["reader", "general"]
    });
    const badgeItems = toBadgeViewItems(badgeRecords);
    const badgeChips = toProfileBadgeChips(badgeRecords);
    const milestoneRecords = await getUserMilestones({
      userId: profile.id,
      limit: 5
    });
    const milestones = toMilestoneViewItems(milestoneRecords);

    return {
      badges: badgeChips,
      achievements: buildReaderAchievements({
        commentCount,
        commentLikeCount,
        createdAt: profile.created_at,
        followingAuthorsCount,
        savedStoriesCount
      }),
      badgeItems,
      milestones,
      topFanHighlights,
      favoriteGenres: buildFavoriteGenres(bookshelf, taxonomyByStory),
      savedStories,
      earlyFanStories,
      metrics: {
        savedStoriesCount,
        followingAuthorsCount,
        commentCount,
        commentLikeCount
      },
      error: null
    };
  } catch (error) {
    return {
      badges: [],
      achievements: buildReaderAchievements({
        commentCount: 0,
        commentLikeCount: 0,
        createdAt: profile.created_at,
        followingAuthorsCount: 0,
        savedStoriesCount: 0
      }),
      badgeItems: [],
      milestones: [],
      topFanHighlights: [],
      favoriteGenres: [],
      savedStories: [],
      earlyFanStories: [],
      metrics: {
        savedStoriesCount: 0,
        followingAuthorsCount: 0,
        commentCount: 0,
        commentLikeCount: 0
      },
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải trang hồ sơ người đọc."
    };
  }
}
