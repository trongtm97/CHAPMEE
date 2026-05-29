import { createClient } from "@/lib/supabase/server";
import { getPublicStoryEarlyFanStats } from "@/lib/supabase/early-fans";
import { getAuthorTopFans } from "@/lib/supabase/fan-scores";
import {
  getUserMilestones,
  syncAuthorMilestones,
  syncStoryReadMilestones,
  toMilestoneViewItems
} from "@/lib/supabase/milestones";
import {
  getUserBadges,
  toBadgeViewItems,
  toProfileBadgeChips
} from "@/lib/supabase/badges";
import {
  buildAuthorAchievements,
  buildAuthorStats
} from "@/lib/profile/profileIdentity";
import { createExcerpt } from "@/lib/text/createExcerpt";
import type { BadgeViewItem } from "@/types/badge";
import type { TopFanPerson } from "@/types/fan";
import type { MilestoneViewItem } from "@/types/milestone";
import type { ProfileAchievement, ProfileBadge, ProfileStat } from "@/types/profile";

export type PublicCreatorStory = {
  coverUrl: string | null;
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  genreName: string | null;
  episodeCount: number;
};

export type PublicCreatorFeaturedEpisode = {
  id: string;
  storySlug: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
};

export type PublicCreatorProfile = {
  id: string;
  userId: string;
  penName: string;
  handle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  storiesCount: number;
  totalLikes: number;
  totalReads: number;
  isFollowing: boolean;
  isLoggedIn: boolean;
  badges: ProfileBadge[];
  achievements: ProfileAchievement[];
  badgeItems: BadgeViewItem[];
  milestones: MilestoneViewItem[];
  topFans: TopFanPerson[];
  stats: ProfileStat[];
  stories: PublicCreatorStory[];
  featuredEpisodes: PublicCreatorFeaturedEpisode[];
};

export type PublicCreatorProfileResult = {
  creator: PublicCreatorProfile | null;
  notFound: boolean;
  error: string | null;
};

type CreatorRow = {
  id: string;
  user_id: string;
  pen_name: string;
  bio: string | null;
  created_at: string;
  profiles:
    | { avatar_url: string | null; username: string | null }
    | { avatar_url: string | null; username: string | null }[]
    | null;
};

type StoryRow = {
  cover_url: string | null;
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  published_at: string | null;
  genres: { name: string | null } | { name: string | null }[] | null;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  content: string | null;
  stories:
    | { slug: string; title: string }
    | { slug: string; title: string }[]
    | null;
};

type IdRow = {
  story_id?: string | null;
  target_id?: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatEpisodeExcerpt(excerpt: string | null, content: string | null) {
  if (excerpt?.trim()) {
    return createExcerpt(excerpt, 30, 60);
  }

  if (content?.trim()) {
    return createExcerpt(content, 30, 60);
  }

  return null;
}

export async function getPublicCreatorProfile(
  creatorId: string
): Promise<PublicCreatorProfileResult> {
  try {
    if (!isUuid(creatorId)) {
      return { creator: null, notFound: true, error: null };
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { data: creatorRow, error: creatorError } = await supabase
      .from("creator_profiles")
      .select("id, user_id, pen_name, bio, created_at, profiles(avatar_url, username)")
      .eq("id", creatorId)
      .eq("status", "active")
      .maybeSingle();

    if (creatorError) {
      throw creatorError;
    }

    if (!creatorRow) {
      return { creator: null, notFound: true, error: null };
    }

    const creator = creatorRow as unknown as CreatorRow;
    const profile = firstRelation(creator.profiles);

    const [
      { data: storyRows, error: storiesError },
      metricsResult,
      followingResult
    ] = await Promise.all([
      supabase
        .from("stories")
        .select("id, title, slug, hook, cover_url, published_at, genres(name)")
        .eq("creator_id", creator.id)
        .eq("visibility", "public")
        .in("status", ["approved", "published"])
        .order("published_at", { ascending: false }),
      supabase.rpc("get_public_creator_profile_metrics", {
        input_creator_id: creator.id
      }),
      user
        ? supabase
            .from("follows")
            .select("id")
            .eq("creator_id", creator.id)
            .eq("follower_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    if (storiesError) {
      throw storiesError;
    }

    const storiesRaw = (storyRows ?? []) as unknown as StoryRow[];
    const storyIds = storiesRaw.map((story) => story.id);
    const episodeCountByStory = new Map<string, number>();
    const metrics = Array.isArray(metricsResult.data)
      ? metricsResult.data[0]
      : metricsResult.data;

    const followerCount = Number(metrics?.follower_count ?? 0);
    const followingCount = Number(metrics?.following_count ?? 0);
    const storiesCount = Number(metrics?.story_count ?? storiesRaw.length);
    const totalLikes = Number(metrics?.total_like_count ?? 0);
    const totalReads = Number(metrics?.total_read_count ?? 0);

    if (user?.id === creator.user_id) {
      await syncAuthorMilestones({
        creatorProfileId: creator.id,
        followerCount,
        storyCount: storiesCount,
        userId: creator.user_id
      });

      const storyStats = await Promise.all(
        storyIds.map((storyId) => getPublicStoryEarlyFanStats(storyId))
      );

      await Promise.all(
        storyStats
          .filter(
            (story): story is NonNullable<typeof story> =>
              Boolean(story?.storyId && story?.readCount != null)
          )
          .map((story) =>
            syncStoryReadMilestones({
              readCount: Number(story.readCount ?? 0),
              storyId: story.storyId,
              storyTitle: story.storyTitle ?? "Truyện",
              userId: creator.user_id
            })
          )
      );
    }

    const badgeRecords = await getUserBadges({
      userId: creator.user_id,
      type: ["author", "general"]
    });
    const badgeItems = toBadgeViewItems(badgeRecords);
    const badgeChips = toProfileBadgeChips(badgeRecords);
    const milestoneRecords = await getUserMilestones({
      limit: 6,
      type: ["author", "story", "general"],
      userId: creator.user_id
    });
    const milestones = toMilestoneViewItems(milestoneRecords);
    const topFans = await getAuthorTopFans(creator.id, user?.id ?? null, 5);

    if (storyIds.length === 0) {
      return {
        creator: {
          id: creator.id,
          userId: creator.user_id,
          penName: creator.pen_name,
          handle: profile?.username ?? null,
          bio: creator.bio,
          avatarUrl: profile?.avatar_url ?? null,
          followerCount,
          followingCount,
          storiesCount,
          totalLikes,
          totalReads,
          isFollowing: Boolean(followingResult.data),
          isLoggedIn: Boolean(user),
          badges: badgeChips,
          milestones,
          achievements: buildAuthorAchievements({
            createdAt: creator.created_at,
            followerCount,
            storiesCount,
            totalReads
          }),
          badgeItems,
          topFans,
          stats: buildAuthorStats({
            followerCount,
            totalLikes,
            totalReads,
            storiesCount
          }),
          stories: [],
          featuredEpisodes: []
        },
        notFound: false,
        error: null
      };
    }

    const [{ data: episodeCountRows }, { data: creatorEpisodeRows }] =
      await Promise.all([
        supabase
          .from("episodes")
          .select("story_id")
          .in("story_id", storyIds)
          .in("status", ["approved", "published"]),
        supabase
          .from("episodes")
          .select("id, story_id, episode_number, title, excerpt, content, stories!inner(slug, title)")
          .in("story_id", storyIds)
          .in("status", ["approved", "published"])
          .order("published_at", { ascending: false })
          .limit(6)
      ]);

    for (const episode of (episodeCountRows ?? []) as IdRow[]) {
      if (episode.story_id) {
        episodeCountByStory.set(
          episode.story_id,
          (episodeCountByStory.get(episode.story_id) ?? 0) + 1
        );
      }
    }

    const creatorEpisodes = (creatorEpisodeRows ?? []) as unknown as EpisodeRow[];

    return {
      creator: {
        id: creator.id,
        userId: creator.user_id,
        penName: creator.pen_name,
        handle: profile?.username ?? null,
        bio: creator.bio,
        avatarUrl: profile?.avatar_url ?? null,
        followerCount,
        followingCount,
        storiesCount,
        totalLikes,
        totalReads,
        isFollowing: Boolean(followingResult.data),
        isLoggedIn: Boolean(user),
        badges: badgeChips,
        milestones,
        achievements: buildAuthorAchievements({
          createdAt: creator.created_at,
          followerCount,
          storiesCount,
          totalReads
        }),
        badgeItems,
        topFans,
        stats: buildAuthorStats({
          followerCount,
          totalLikes,
          totalReads,
          storiesCount
        }),
        stories: storiesRaw.map((story) => {
          const genre = firstRelation(story.genres);

          return {
            id: story.id,
            coverUrl: story.cover_url,
            title: story.title,
            slug: story.slug,
            hook: story.hook,
            genreName: genre?.name ?? null,
            episodeCount: episodeCountByStory.get(story.id) ?? 0
          };
        }),
        featuredEpisodes: creatorEpisodes.map((episode) => {
          const story = firstRelation(episode.stories);

          return {
            id: episode.id,
            storySlug: story?.slug ?? "",
            storyTitle: story?.title ?? "",
            episodeNumber: episode.episode_number,
            title: episode.title,
            excerpt: formatEpisodeExcerpt(episode.excerpt, episode.content)
          };
        })
      },
      notFound: false,
      error: null
    };
  } catch (error) {
    return {
      creator: null,
      notFound: false,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải hồ sơ creator."
    };
  }
}
