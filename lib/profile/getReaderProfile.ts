import type { CurrentUserProfile } from "@/lib/auth/getCurrentUser";
import { getReaderEarlyFanStories } from "@/lib/data/early-fans";
import { getUserTopFanHighlights } from "@/lib/data/fan-scores";
import {
  getUserMilestones,
  syncReaderMilestones,
  toMilestoneViewItems
} from "@/lib/data/milestones";
import {
  getUserBadges,
  syncReaderBadges,
  toBadgeViewItems,
  toProfileBadgeChips
} from "@/lib/data/badges";
import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
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
  story_id?: string | null;
  stories?: StoryRelation | StoryRelation[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

async function loadReaderProfileMetrics(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ data: ReaderProfileMetricsRow | null; error: string | null }> {
  const rpcResult = await db.rpc("get_reader_profile_metrics", {
    input_user_id: userId
  });

  if (!rpcResult.error) {
    const metrics = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;

    return { data: (metrics as ReaderProfileMetricsRow | null) ?? null, error: null };
  }

  if (!isMissingSchemaError(rpcResult.error)) {
    return {
      data: null,
      error: rpcResult.error.message ?? "Could not load reader profile metrics."
    };
  }

  const [savedStoriesResult, followingResult, commentsResult, commentRowsResult] =
    await Promise.all([
      db
        .from("bookshelf_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      db
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", userId)
        .not("creator_id", "is", null),
      db
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      db.from("comments").select("id").eq("user_id", userId)
    ]);

  const commentIds = ((commentRowsResult.data ?? []) as Array<{ id: string }>).map(
    (row) => row.id
  );

  let commentLikeCount = 0;
  if (commentIds.length > 0) {
    const likesResult = await db
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "comment")
      .eq("reaction_type", "like")
      .in("target_id", commentIds);

    commentLikeCount = Number(likesResult.count ?? 0);
  }

  return {
    data: {
      saved_story_count: Number(savedStoriesResult.count ?? 0),
      following_creator_count: Number(followingResult.count ?? 0),
      comment_count: Number(commentsResult.count ?? 0),
      comment_like_count: commentLikeCount
    },
    error: null
  };
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
    coverUrl: resolveStoryCoverUrl(story.cover_url),
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
    const db = await createClient();

    const [
      metricsResult,
      bookshelfRowsResult,
      earlyFanStories,
      topFanHighlights
    ] = await Promise.all([
      loadReaderProfileMetrics(db, profile.id),
      db
        .from("bookshelf_items")
        .select("status, story_id")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false }),
      getReaderEarlyFanStories(profile.id).catch(() => []),
      getUserTopFanHighlights(profile.id, 5).catch(() => [])
    ]);

    const metrics = metricsResult.data;
    const bookshelf = (bookshelfRowsResult.data ?? []) as BookshelfRow[];
    const storyIds = [...new Set(bookshelf.map((row) => row.story_id).filter((id): id is string => Boolean(id)))];
    const { data: storyRows } = storyIds.length
      ? await db
          .from("stories")
          .select("id, title, slug, public_code, cover_url, hook, creator_profiles(pen_name)")
          .in("id", storyIds)
      : { data: [] as StoryRelation[] };
    const storyById = new Map(
      ((storyRows ?? []) as StoryRelation[]).map((story) => [story.id, story])
    );
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);
    const savedStories = bookshelf
      .filter((row) => row.status === "saved")
      .map((row) => {
        const story = row.story_id ? storyById.get(row.story_id) ?? null : null;

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
    }).catch(() => undefined);

    await syncReaderBadges({
      userId: profile.id,
      createdAt: profile.created_at,
      savedStoriesCount,
      followingAuthorsCount,
      commentCount,
      commentLikeCount,
      earlyFanStories
    }).catch(() => undefined);

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

    const partialError = metricsResult.error ?? bookshelfRowsResult.error?.message ?? null;

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
      error: partialError
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
          : typeof error === "object" &&
              error !== null &&
              "message" in error &&
              typeof (error as { message: unknown }).message === "string"
            ? (error as { message: string }).message
            : "Không thể tải trang hồ sơ người đọc."
    };
  }
}
