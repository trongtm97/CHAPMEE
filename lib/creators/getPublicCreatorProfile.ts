import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { mapStoryStructureFromRow } from "@/lib/stories/story-structure";
import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { getPublicStoryEarlyFanStats } from "@/lib/data/early-fans";
import { getAuthorTopFans } from "@/lib/data/fan-scores";
import {
  getUserMilestones,
  syncAuthorMilestones,
  syncStoryReadMilestones,
  toMilestoneViewItems
} from "@/lib/data/milestones";
import {
  getUserBadges,
  toBadgeViewItems,
  toProfileBadgeChips
} from "@/lib/data/badges";
import {
  buildAuthorAchievements,
  buildAuthorStats
} from "@/lib/profile/profileIdentity";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
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
  publicCode: string;
  hook: string | null;
  genreName: string | null;
  episodeCount: number;
  structureType: "chaptered" | "standalone";
  standaloneReadingTimeMinutes: number;
};

export type PublicCreatorFeaturedEpisode = {
  id: string;
  storySlug: string;
  storyPublicCode: string;
  episodeSlug: string;
  episodePublicCode: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
};

export type PublicCreatorProfile = {
  id: string;
  userId: string;
  displayName: string;
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
  public_code: string;
  hook: string | null;
  published_at: string | null;
  structure_type?: string | null;
  standalone_reading_time_minutes?: number | null;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  slug: string;
  public_code: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  content: string | null;
  stories:
    | { slug: string; public_code: string; title: string }
    | { slug: string; public_code: string; title: string }[]
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

    const db = await createClient();
    const {
      data: { user }
    } = await db.auth.getUser();

    const { data: creatorRow, error: creatorError } = await db
      .from("creator_profiles")
      .select(
        "id, user_id, pen_name, bio, created_at, profiles!creator_profiles_user_id_fkey(avatar_url, username, display_name)"
      )
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
      db
        .from("stories")
        .select("id, title, slug, public_code, hook, cover_url, published_at, structure_type, standalone_reading_time_minutes")
        .eq("creator_id", creator.id)
        .eq("visibility", "public")
        .in("status", ["approved", "published"])
        .order("published_at", { ascending: false }),
      db.rpc("get_public_creator_profile_metrics", {
        input_creator_id: creator.id
      }),
      user
        ? db
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
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);
    const episodeCountByStory = new Map<string, number>();
    const metrics = Array.isArray(metricsResult.data)
      ? metricsResult.data[0]
      : metricsResult.data;

    let followerCount = Number(metrics?.follower_count ?? 0);
    let followingCount = Number(metrics?.following_count ?? 0);
    let storiesCount = Number(metrics?.story_count ?? storiesRaw.length);
    let totalLikes = Number(metrics?.total_like_count ?? 0);
    let totalReads = Number(metrics?.total_read_count ?? 0);

    if (metricsResult.error && isMissingSchemaError(metricsResult.error)) {
      const [followersResult, followingCountsResult, likesResult, readsResult] =
        await Promise.all([
          db
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("following_id", creator.id)
            .eq("following_type", "creator"),
          db
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("follower_id", creator.user_id)
            .eq("following_type", "creator"),
          storyIds.length
            ? db
                .from("reactions")
                .select("id", { count: "exact", head: true })
                .eq("target_type", "story")
                .in("target_id", storyIds)
            : Promise.resolve({ count: 0 }),
          storyIds.length
            ? db
                .from("analytics_events")
                .select("id", { count: "exact", head: true })
                .eq("event_name", "open_story")
                .in("target_id", storyIds)
            : Promise.resolve({ count: 0 })
        ]);

      followerCount = Number(followersResult.count ?? 0);
      followingCount = Number(followingCountsResult.count ?? 0);
      storiesCount = storiesRaw.length;
      totalLikes = Number(likesResult.count ?? 0);
      totalReads = Number(readsResult.count ?? 0);
    }

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
          displayName: resolvePublicDisplayName(profile, creator),
          handle: profile?.username ?? null,
          bio: creator.bio,
          avatarUrl: profileAvatarUrlFromRow(profile),
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
        db
          .from("episodes")
          .select("story_id")
          .in("story_id", storyIds)
          .in("status", ["approved", "published"]),
        db
          .from("episodes")
          .select("id, story_id, slug, public_code, episode_number, title, excerpt, content, stories!inner(slug, public_code, title)")
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
        displayName: resolvePublicDisplayName(profile, creator),
        handle: profile?.username ?? null,
        bio: creator.bio,
        avatarUrl: profileAvatarUrlFromRow(profile),
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
          const structure = mapStoryStructureFromRow(story);

          return {
            id: story.id,
            coverUrl: resolveStoryCoverUrl(story.cover_url),
            title: story.title,
            slug: story.slug,
            publicCode: story.public_code,
            hook: story.hook,
            genreName: taxonomyByStory.get(story.id)?.mainGenreName ?? null,
            episodeCount: episodeCountByStory.get(story.id) ?? 0,
            structureType: structure.structureType,
            standaloneReadingTimeMinutes: structure.standaloneReadingTimeMinutes
          };
        }),
        featuredEpisodes: creatorEpisodes.map((episode) => {
          const story = firstRelation(episode.stories);

          return {
            id: episode.id,
            storySlug: story?.slug ?? "",
            storyPublicCode: story?.public_code ?? "",
            episodeSlug: episode.slug,
            episodePublicCode: episode.public_code,
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
