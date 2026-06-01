import { getReelsFeed } from "@/lib/feed/getReelsFeed";
import type { FeedDeliveryMeta } from "@/types/feed-mixer";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { getReelsBackgroundSrc } from "@/lib/images/get-story-image";
import {
  resolveReelsCtaLabel,
  resolveReelsReadHref
} from "@/lib/reels/resolve-reels-cta";
import { getStoryUrl, getReelUrl } from "@/lib/urls/paths";
import { createClient } from "@/lib/supabase/server";
import {
  loadMainGenreLabelsByStoryIds,
  pickMainGenreFromLabels
} from "@/lib/taxonomy/story-genre-labels";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { getPublicVerificationBadges } from "@/lib/verification/get-user-verification";
import type { PublicVerificationBadge } from "@/types/verification";

export type ReelsItemKind = "episode" | "manual";

export type ReelsItem = {
  kind: ReelsItemKind;
  backgroundImageUrl: string | null;
  id: string;
  storyId: string;
  episodeNumber: number;
  episodeTitle: string;
  excerpt: string;
  hookTitle: string;
  storyTitle: string;
  storySlug: string;
  storyPublicCode: string;
  storyHref: string;
  reelPublicCode: string | null;
  reelSlug: string | null;
  reelHref: string | null;
  ctaLabel: string;
  readMoreHref: string;
  creatorId: string | null;
  creatorUserId: string | null;
  creatorVerification: PublicVerificationBadge | null;
  creatorName: string | null;
  creatorHandle: string | null;
  creatorAvatarUrl: string | null;
  genreName: string | null;
  publishedAt: string | null;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowingCreator: boolean;
  feed?: FeedDeliveryMeta;
};

export type ReelsItemsResult = {
  items: ReelsItem[];
  error: string | null;
  nextOffset: number;
  hasMore: boolean;
  nextCursor?: string | null;
  requestId?: string;
  algorithmVersion?: string;
  poolCounts?: Record<string, number>;
};

type GetReelsItemsOptions = {
  limit?: number;
  offset?: number;
};

type ReelsFeedItemBase = Omit<
  ReelsItem,
  | "commentCount"
  | "creatorVerification"
  | "isFollowingCreator"
  | "isLiked"
  | "isSaved"
  | "likeCount"
  | "saveCount"
  | "shareCount"
>;

type CreatorProfileRelation = {
  id: string | null;
  user_id: string | null;
  pen_name: string | null;
  profiles:
    | {
        username: string | null;
        avatar_url: string | null;
      }
    | {
        username: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

type StoryRelation = {
  cover_url: string | null;
  title: string;
  hook: string | null;
  id: string;
  creator_id: string | null;
  slug: string;
  public_code: string;
  creator_profiles: CreatorProfileRelation | CreatorProfileRelation[] | null;
};

type ReelsEpisodeRow = {
  background_image_url: string | null;
  id: string;
  slug: string;
  public_code: string;
  episode_number: number;
  title: string;
  content: string | null;
  excerpt: string | null;
  published_at: string | null;
  stories: StoryRelation | StoryRelation[] | null;
};

type ManualReelsRow = {
  id: string;
  slug: string;
  public_code: string;
  hook: string;
  body: string;
  cta: string | null;
  cta_type: string | null;
  background_image_url: string | null;
  published_at: string | null;
  stories: StoryRelation | StoryRelation[] | null;
  episodes:
    | { episode_number: number; title: string; slug: string; public_code: string }
    | { episode_number: number; title: string; slug: string; public_code: string }[]
    | null;
};

type IdRow = {
  story_id?: string | null;
  creator_id?: string | null;
  target_id?: string | null;
  episode_id?: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildReelsExcerpt(excerpt: string | null, content: string | null) {
  const normalizedExcerpt = excerpt?.replace(/\s+/g, " ").trim() ?? "";

  if (normalizedExcerpt && wordCount(normalizedExcerpt) >= 80) {
    return createExcerpt(normalizedExcerpt, 80, 160);
  }

  if (content) {
    return createExcerpt(content, 80, 160);
  }

  if (normalizedExcerpt) {
    return normalizedExcerpt;
  }

  return "Một đoạn truyện ngắn đang chờ bạn mở tiếp.";
}

function addCount(map: Map<string, number>, key: string | null | undefined) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) ?? 0) + 1);
}

export async function getReelsItems(
  options: GetReelsItemsOptions & { cursor?: string | null } = {}
): Promise<ReelsItemsResult> {
  const useMixer = process.env.FEED_MIXER_DISABLED !== "true";
  const limit = Math.max(1, Math.min(options.limit ?? 12, 20));
  const offset = Math.max(0, options.offset ?? 0);

  if (useMixer) {
    const mixed = await getReelsFeed({
      limit,
      offset,
      cursor: options.cursor
    });
    return {
      items: mixed.items,
      error: mixed.error,
      nextOffset: mixed.nextOffset,
      hasMore: mixed.hasMore,
      nextCursor: mixed.nextCursor,
      requestId: mixed.requestId,
      algorithmVersion: mixed.algorithmVersion,
      poolCounts: mixed.poolCounts
    };
  }

  const fetchCount = offset + limit;

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    async function fetchEpisodes(selectClause: string, rangeEnd: number) {
      return supabase
        .from("episodes")
        .select(selectClause)
        .in("status", ["published", "approved"])
        .in("stories.status", ["published", "approved"])
        .eq("stories.visibility", "public")
        .order("published_at", { ascending: false })
        .range(0, Math.max(rangeEnd - 1, 0));
    }

    let queryResult = await fetchEpisodes(
      "id, slug, public_code, episode_number, title, content, excerpt, published_at, background_image_url, stories!inner(id, creator_id, title, slug, public_code, hook, cover_url, status, visibility, creator_profiles(id, pen_name, profiles(username, avatar_url)))",
      fetchCount
    );

    if (queryResult.error?.message?.includes("background_image_url")) {
      queryResult = await fetchEpisodes(
        "id, slug, public_code, episode_number, title, content, excerpt, published_at, stories!inner(id, creator_id, title, slug, public_code, hook, cover_url, status, visibility, creator_profiles(id, pen_name, profiles(username, avatar_url)))",
        fetchCount
      );
    }

    const { data, error } = queryResult;

    if (error) {
      throw error;
    }

    const manualResult = await supabase
      .from("reels_items")
      .select(
        "id, slug, public_code, hook, body, cta, cta_type, background_image_url, published_at, stories!inner(id, creator_id, title, slug, public_code, hook, cover_url, status, visibility, creator_profiles(id, pen_name, profiles(username, avatar_url))), episodes(episode_number, title, slug, public_code)"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(0, Math.max(fetchCount - 1, 0));

    const rows = (data ?? []) as unknown as ReelsEpisodeRow[];
    const manualRows = (manualResult.data ?? []) as unknown as ManualReelsRow[];
    const storyIdsForTaxonomy = [
      ...new Set(
        [
          ...rows.map((episode) => firstRelation(episode.stories)?.id),
          ...manualRows.map((row) => firstRelation(row.stories)?.id)
        ].filter((id): id is string => Boolean(id))
      )
    ];
    const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
      supabase,
      storyIdsForTaxonomy
    );

    const episodeItems = rows
      .map((episode) => {
        const story = firstRelation(episode.stories);

        if (!story) {
          return null;
        }

        const picked = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
        const creator = firstRelation(story.creator_profiles);
        const profile = firstRelation(creator?.profiles);
        const readMoreHref = resolveReelsReadHref({
          storySlug: story.slug,
          storyPublicCode: story.public_code,
          episodeSlug: episode.slug,
          episodePublicCode: episode.public_code,
          episodeNumber: episode.episode_number
        });
        const storyHref = getStoryUrl({ slug: story.slug, public_code: story.public_code });

        return {
          kind: "episode" as const,
          id: episode.id,
          backgroundImageUrl: getReelsBackgroundSrc({
            title: story.title,
            storyCoverUrl: story.cover_url,
            episodeBackgroundUrl: episode.background_image_url
          }),
          storyId: story.id,
          episodeNumber: episode.episode_number,
          episodeTitle: episode.title,
          excerpt: buildReelsExcerpt(episode.excerpt, episode.content),
          hookTitle: story.hook?.trim() || episode.title || story.title,
          storyTitle: story.title,
          storySlug: story.slug,
          storyPublicCode: story.public_code,
          storyHref,
          reelPublicCode: null,
          reelSlug: null,
          reelHref: readMoreHref,
          ctaLabel: "Đọc tiếp",
          readMoreHref,
          creatorId: creator?.id ?? story.creator_id ?? null,
          creatorUserId: creator?.user_id ?? null,
          creatorName: resolveCreatorRowName(creator),
          creatorHandle: profile?.username ?? null,
          creatorAvatarUrl: profile?.avatar_url ?? null,
          genreName: picked.genreName,
          publishedAt: episode.published_at
        };
      })
      .filter(Boolean) as ReelsFeedItemBase[];

    const manualItems = manualRows
      .map((row) => {
        const story = firstRelation(row.stories);

        if (!story) {
          return null;
        }

        const episode = firstRelation(row.episodes);
        const picked = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
        const creator = firstRelation(story.creator_profiles);
        const profile = firstRelation(creator?.profiles);
        const episodeNumber = episode?.episode_number ?? 0;
        const readMoreHref = resolveReelsReadHref({
          storySlug: story.slug,
          storyPublicCode: story.public_code,
          episodeSlug: episode?.slug ?? null,
          episodePublicCode: episode?.public_code ?? null,
          episodeNumber: episodeNumber > 0 ? episodeNumber : null
        });
        const storyHref = getStoryUrl({ slug: story.slug, public_code: story.public_code });
        const reelHref = getReelUrl({ slug: row.slug, public_code: row.public_code });

        return {
          kind: "manual" as const,
          id: row.id,
          backgroundImageUrl:
            row.background_image_url ??
            getReelsBackgroundSrc({
              title: story.title,
              storyCoverUrl: story.cover_url,
              episodeBackgroundUrl: null
            }),
          storyId: story.id,
          episodeNumber,
          episodeTitle: episode?.title ?? "",
          excerpt: row.body,
          hookTitle: row.hook,
          storyTitle: story.title,
          storySlug: story.slug,
          storyPublicCode: story.public_code,
          storyHref,
          reelPublicCode: row.public_code,
          reelSlug: row.slug,
          reelHref,
          ctaLabel: resolveReelsCtaLabel(row.cta, row.cta_type),
          readMoreHref,
          creatorId: creator?.id ?? story.creator_id ?? null,
          creatorUserId: creator?.user_id ?? null,
          creatorName: resolveCreatorRowName(creator),
          creatorHandle: profile?.username ?? null,
          creatorAvatarUrl: profile?.avatar_url ?? null,
          genreName: picked.genreName,
          publishedAt: row.published_at
        };
      })
      .filter(Boolean) as ReelsFeedItemBase[];

    const merged = [...manualItems, ...episodeItems].sort((left, right) => {
      const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
      const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;

      return rightTime - leftTime;
    });

    const uniqueItemsBase = Array.from(
      new Map(merged.map((item) => [`${item.kind}:${item.id}`, item])).values()
    ).slice(offset, offset + limit);

    const episodeIds = uniqueItemsBase
      .filter((item) => item.kind === "episode")
      .map((item) => item.id);
    const storyIds = uniqueItemsBase.map((item) => item.storyId);
    const creatorIds = uniqueItemsBase
      .map((item) => item.creatorId)
      .filter((value): value is string => Boolean(value));

    const likeCountByEpisode = new Map<string, number>();
    const commentCountByEpisode = new Map<string, number>();
    const saveCountByStory = new Map<string, number>();
    const shareCountByStory = new Map<string, number>();
    const likedEpisodeIds = new Set<string>();
    const savedStoryIds = new Set<string>();
    const followedCreatorIds = new Set<string>();

    if (episodeIds.length > 0 || storyIds.length > 0) {
      const queries = [
        episodeIds.length > 0
          ? supabase
              .from("reactions")
              .select("target_id")
              .eq("target_type", "episode")
              .eq("reaction_type", "like")
              .in("target_id", episodeIds)
          : Promise.resolve({ data: [] }),
        episodeIds.length > 0
          ? supabase
              .from("comments")
              .select("episode_id")
              .eq("status", "visible")
              .in("episode_id", episodeIds)
          : Promise.resolve({ data: [] }),
        storyIds.length > 0
          ? supabase.rpc("get_public_story_save_counts", {
              input_story_ids: storyIds
            })
          : Promise.resolve({ data: [] })
      ];

      const [reactionRows, commentRows, savedRows] = await Promise.all(queries);

      for (const reaction of (reactionRows.data ?? []) as IdRow[]) {
        addCount(likeCountByEpisode, reaction.target_id ?? null);
      }

      for (const comment of (commentRows.data ?? []) as IdRow[]) {
        addCount(commentCountByEpisode, comment.episode_id ?? null);
      }

      for (const saved of (savedRows.data ?? []) as Array<{
        save_count: number;
        story_id: string | null;
      }>) {
        if (saved.story_id) {
          saveCountByStory.set(saved.story_id, Number(saved.save_count ?? 0));
        }
      }
    }

    if (user) {
      const [likedRows, savedRows, followedRows] = await Promise.all([
        episodeIds.length > 0
          ? supabase
              .from("reactions")
              .select("target_id")
              .eq("user_id", user.id)
              .eq("target_type", "episode")
              .eq("reaction_type", "like")
              .in("target_id", episodeIds)
          : Promise.resolve({ data: [] }),
        storyIds.length > 0
          ? supabase
              .from("bookshelf_items")
              .select("story_id")
              .eq("user_id", user.id)
              .in("story_id", storyIds)
          : Promise.resolve({ data: [] }),
        creatorIds.length > 0
          ? supabase
              .from("follows")
              .select("creator_id")
              .eq("follower_id", user.id)
              .in("creator_id", creatorIds)
          : Promise.resolve({ data: [] })
      ]);

      for (const row of (likedRows.data ?? []) as IdRow[]) {
        if (row.target_id) {
          likedEpisodeIds.add(row.target_id);
        }
      }

      for (const row of (savedRows.data ?? []) as IdRow[]) {
        if (row.story_id) {
          savedStoryIds.add(row.story_id);
        }
      }

      for (const row of (followedRows.data ?? []) as IdRow[]) {
        if (row.creator_id) {
          followedCreatorIds.add(row.creator_id);
        }
      }
    }

    const creatorUserIds = uniqueItemsBase
      .map((item) => item.creatorUserId)
      .filter((value): value is string => Boolean(value));
    const verificationByUser = await getPublicVerificationBadges(creatorUserIds);

    const items: ReelsItem[] = uniqueItemsBase.map((item) => ({
      ...item,
      creatorVerification: item.creatorUserId
        ? (verificationByUser.get(item.creatorUserId) ?? null)
        : null,
      likeCount: likeCountByEpisode.get(item.id) ?? 0,
      commentCount: commentCountByEpisode.get(item.id) ?? 0,
      saveCount: saveCountByStory.get(item.storyId) ?? 0,
      shareCount: shareCountByStory.get(item.storyId) ?? 0,
      isLiked: likedEpisodeIds.has(item.id),
      isSaved: savedStoryIds.has(item.storyId),
      isFollowingCreator: item.creatorId
        ? followedCreatorIds.has(item.creatorId)
        : false
    }));

    const totalFetched = episodeItems.length + manualItems.length;

    return {
      items,
      error: null,
      nextOffset: offset + uniqueItemsBase.length,
      hasMore: totalFetched > offset + limit || uniqueItemsBase.length === limit
    };
  } catch (error) {
    return {
      items: [],
      error:
        error instanceof Error ? error.message : "Could not load Reels feed.",
      nextOffset: offset,
      hasMore: false
    };
  }
}
