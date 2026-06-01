import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { candidateKeyFromFeed } from "@/lib/feed/catalog";
import { getReelsBackgroundSrc } from "@/lib/images/get-story-image";
import {
  resolveReelsCtaLabel,
  resolveReelsReadHref
} from "@/lib/reels/resolve-reels-cta";
import { getStoryUrl, getReelUrl } from "@/lib/urls/paths";
import type { ReelsItem } from "@/lib/reels/getReelsItems";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { getPublicVerificationBadges } from "@/lib/verification/get-user-verification";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedCandidate, FeedDeliveryMeta } from "@/types/feed-mixer";
import { logRecommendationExposureBatch } from "@/lib/fair-distribution/log-exposure";

type CreatorProfileRelation = {
  id: string | null;
  user_id: string | null;
  pen_name: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
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
  if (content) return createExcerpt(content, 80, 160);
  if (normalizedExcerpt) return normalizedExcerpt;
  return "Một đoạn truyện ngắn đang chờ bạn mở tiếp.";
}

function addCount(map: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

export async function enrichReelsCandidates(
  supabase: SupabaseClient,
  candidates: FeedCandidate[],
  delivery: {
    requestId: string;
    algorithmVersion: string;
    rankPositionStart?: number;
  },
  userId: string | null
): Promise<ReelsItem[]> {
  if (candidates.length === 0) return [];

  const episodeIds = candidates
    .filter((c) => (c.kind ?? "episode") === "episode")
    .map((c) => c.itemId);
  const manualIds = candidates
    .filter((c) => c.kind === "manual")
    .map((c) => c.itemId);

  const episodeSelect =
    "id, slug, public_code, episode_number, title, content, excerpt, published_at, background_image_url, stories!inner(id, creator_id, title, slug, public_code, hook, cover_url, status, visibility, creator_profiles(id, user_id, pen_name, profiles(username, avatar_url)))";

  const [episodeRes, manualRes] = await Promise.all([
    episodeIds.length > 0
      ? supabase.from("episodes").select(episodeSelect).in("id", episodeIds)
      : Promise.resolve({ data: [] }),
    manualIds.length > 0
      ? supabase
          .from("reels_items")
          .select(
            "id, slug, public_code, hook, body, cta, cta_type, background_image_url, published_at, stories!inner(id, creator_id, title, slug, public_code, hook, cover_url, status, visibility, creator_profiles(id, user_id, pen_name, profiles(username, avatar_url))), episodes(episode_number, title, slug, public_code)"
          )
          .in("id", manualIds)
      : Promise.resolve({ data: [] })
  ]);

  const storyIdsForTaxonomy = new Set<string>();
  for (const episode of episodeRes.data ?? []) {
    const story = firstRelation((episode as { stories: StoryRelation | StoryRelation[] }).stories);
    if (story?.id) storyIdsForTaxonomy.add(story.id);
  }
  for (const row of manualRes.data ?? []) {
    const story = firstRelation((row as { stories: StoryRelation | StoryRelation[] }).stories);
    if (story?.id) storyIdsForTaxonomy.add(story.id);
  }
  const { loadMainGenreLabelsByStoryIds, pickMainGenreFromLabels } = await import(
    "@/lib/taxonomy/story-genre-labels"
  );
  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
    supabase,
    [...storyIdsForTaxonomy]
  );

  const baseByKey = new Map<string, Omit<ReelsItem, "feed" | "commentCount" | "creatorVerification" | "isFollowingCreator" | "isLiked" | "isSaved" | "likeCount" | "saveCount" | "shareCount">>();

  for (const episode of episodeRes.data ?? []) {
    const story = firstRelation((episode as { stories: StoryRelation | StoryRelation[] }).stories);
    if (!story) continue;
    const picked = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
    const creator = firstRelation(story.creator_profiles);
    const profile = firstRelation(creator?.profiles);
    const key = candidateKeyFromFeed({
      itemType: "chapter",
      itemId: episode.id as string,
      kind: "episode",
      pool: "fresh",
      storyId: story.id,
      authorUserId: creator?.user_id ?? "",
      creatorId: creator?.id ?? null,
      genreName: null,
      genreSlug: null,
      publishedAt: null,
      mixerScore: 0,
      qualityScore: 0,
      discoveryScore: 0,
      freshnessScore: 0
    });
    baseByKey.set(key, {
      kind: "episode",
      id: episode.id as string,
      backgroundImageUrl: getReelsBackgroundSrc({
        title: story.title,
        storyCoverUrl: story.cover_url,
        episodeBackgroundUrl: (episode as { background_image_url?: string | null })
          .background_image_url
      }),
      storyId: story.id,
      episodeNumber: (episode as { episode_number: number }).episode_number,
      episodeTitle: (episode as { title: string }).title,
      excerpt: buildReelsExcerpt(
        (episode as { excerpt: string | null }).excerpt,
        (episode as { content: string | null }).content
      ),
      hookTitle:
        story.hook?.trim() ||
        (episode as { title: string }).title ||
        story.title,
      storyTitle: story.title,
      storySlug: story.slug,
      storyPublicCode: story.public_code,
      storyHref: getStoryUrl({ slug: story.slug, public_code: story.public_code }),
      reelPublicCode: null,
      reelSlug: null,
      reelHref: null,
      ctaLabel: "Đọc tiếp",
      readMoreHref: resolveReelsReadHref({
        storySlug: story.slug,
        storyPublicCode: story.public_code,
        episodeSlug: (episode as { slug: string }).slug,
        episodePublicCode: (episode as { public_code: string }).public_code,
        episodeNumber: (episode as { episode_number: number }).episode_number
      }),
      creatorId: creator?.id ?? story.creator_id ?? null,
      creatorUserId: creator?.user_id ?? null,
      creatorName: resolveCreatorRowName(creator),
      creatorHandle: profile?.username ?? null,
      creatorAvatarUrl: profile?.avatar_url ?? null,
      genreName: picked.genreName,
      publishedAt: (episode as { published_at: string | null }).published_at
    });
  }

  for (const row of manualRes.data ?? []) {
    const story = firstRelation((row as { stories: StoryRelation | StoryRelation[] }).stories);
    if (!story) continue;
    const episode = firstRelation(
      (row as unknown as {
        episodes:
          | { episode_number: number; title: string }
          | { episode_number: number; title: string }[]
          | null;
      }).episodes
    );
    const picked = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
    const creator = firstRelation(story.creator_profiles);
    const profile = firstRelation(creator?.profiles);
    const episodeNumber = episode?.episode_number ?? 0;
    const key = candidateKeyFromFeed({
      itemType: "reel",
      itemId: row.id as string,
      kind: "manual",
      pool: "fresh",
      storyId: story.id,
      authorUserId: creator?.user_id ?? "",
      creatorId: creator?.id ?? null,
      genreName: null,
      genreSlug: null,
      publishedAt: null,
      mixerScore: 0,
      qualityScore: 0,
      discoveryScore: 0,
      freshnessScore: 0
    });
    baseByKey.set(key, {
      kind: "manual",
      id: row.id as string,
      backgroundImageUrl:
        (row as { background_image_url: string | null }).background_image_url ??
        getReelsBackgroundSrc({
          title: story.title,
          storyCoverUrl: story.cover_url,
          episodeBackgroundUrl: null
        }),
      storyId: story.id,
      episodeNumber,
      episodeTitle: episode?.title ?? "",
      excerpt: (row as { body: string }).body,
      hookTitle: (row as { hook: string }).hook,
      storyTitle: story.title,
      storySlug: story.slug,
      storyPublicCode: story.public_code,
      storyHref: getStoryUrl({ slug: story.slug, public_code: story.public_code }),
      reelPublicCode: (row as { public_code: string }).public_code,
      reelSlug: (row as { slug: string }).slug,
      reelHref: getReelUrl({
        slug: (row as { slug: string }).slug,
        public_code: (row as { public_code: string }).public_code
      }),
      ctaLabel: resolveReelsCtaLabel(
        (row as { cta: string | null }).cta,
        (row as { cta_type: string | null }).cta_type
      ),
      readMoreHref: resolveReelsReadHref({
        storySlug: story.slug,
        storyPublicCode: story.public_code,
        episodeSlug: (episode as { slug?: string })?.slug ?? null,
        episodePublicCode: (episode as { public_code?: string })?.public_code ?? null,
        episodeNumber: episodeNumber > 0 ? episodeNumber : null
      }),
      creatorId: creator?.id ?? story.creator_id ?? null,
      creatorUserId: creator?.user_id ?? null,
      creatorName: resolveCreatorRowName(creator),
      creatorHandle: profile?.username ?? null,
      creatorAvatarUrl: profile?.avatar_url ?? null,
      genreName: picked.genreName,
      publishedAt: (row as { published_at: string | null }).published_at
    });
  }

  const orderedBase = candidates
    .map((c) => baseByKey.get(candidateKeyFromFeed(c)))
    .filter(Boolean) as Array<
    Omit<
      ReelsItem,
      | "feed"
      | "commentCount"
      | "creatorVerification"
      | "isFollowingCreator"
      | "isLiked"
      | "isSaved"
      | "likeCount"
      | "saveCount"
      | "shareCount"
    >
  >;

  const episodeIdsHydrated = orderedBase
    .filter((i) => i.kind === "episode")
    .map((i) => i.id);
  const storyIds = orderedBase.map((i) => i.storyId);
  const creatorIds = orderedBase
    .map((i) => i.creatorId)
    .filter((v): v is string => Boolean(v));

  const likeCountByEpisode = new Map<string, number>();
  const commentCountByEpisode = new Map<string, number>();
  const saveCountByStory = new Map<string, number>();
  const likedEpisodeIds = new Set<string>();
  const savedStoryIds = new Set<string>();
  const followedCreatorIds = new Set<string>();

  if (episodeIdsHydrated.length > 0 || storyIds.length > 0) {
    const [reactionRows, commentRows, savedRows] = await Promise.all([
      episodeIdsHydrated.length > 0
        ? supabase
            .from("reactions")
            .select("target_id")
            .eq("target_type", "episode")
            .eq("reaction_type", "like")
            .in("target_id", episodeIdsHydrated)
        : Promise.resolve({ data: [] }),
      episodeIdsHydrated.length > 0
        ? supabase
            .from("comments")
            .select("episode_id")
            .eq("status", "visible")
            .in("episode_id", episodeIdsHydrated)
        : Promise.resolve({ data: [] }),
      storyIds.length > 0
        ? supabase.rpc("get_public_story_save_counts", { input_story_ids: storyIds })
        : Promise.resolve({ data: [] })
    ]);

    for (const reaction of reactionRows.data ?? []) {
      addCount(likeCountByEpisode, (reaction as { target_id: string }).target_id);
    }
    for (const comment of commentRows.data ?? []) {
      addCount(commentCountByEpisode, (comment as { episode_id: string }).episode_id);
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

  if (userId) {
    const [likedRows, savedRows, followedRows] = await Promise.all([
      episodeIdsHydrated.length > 0
        ? supabase
            .from("reactions")
            .select("target_id")
            .eq("user_id", userId)
            .eq("target_type", "episode")
            .eq("reaction_type", "like")
            .in("target_id", episodeIdsHydrated)
        : Promise.resolve({ data: [] }),
      storyIds.length > 0
        ? supabase
            .from("bookshelf_items")
            .select("story_id")
            .eq("user_id", userId)
            .in("story_id", storyIds)
        : Promise.resolve({ data: [] }),
      creatorIds.length > 0
        ? supabase
            .from("follows")
            .select("creator_id")
            .eq("follower_id", userId)
            .in("creator_id", creatorIds)
        : Promise.resolve({ data: [] })
    ]);

    for (const row of likedRows.data ?? []) {
      const id = (row as { target_id: string }).target_id;
      if (id) likedEpisodeIds.add(id);
    }
    for (const row of savedRows.data ?? []) {
      const id = (row as { story_id: string }).story_id;
      if (id) savedStoryIds.add(id);
    }
    for (const row of followedRows.data ?? []) {
      const id = (row as { creator_id: string }).creator_id;
      if (id) followedCreatorIds.add(id);
    }
  }

  const creatorUserIds = orderedBase
    .map((i) => i.creatorUserId)
    .filter((v): v is string => Boolean(v));
  const verificationByUser = await getPublicVerificationBadges(creatorUserIds);

  const poolByItemId = new Map(
    candidates.map((candidate) => [candidate.itemId, candidate.pool])
  );
  const candidateByItemId = new Map(
    candidates.map((candidate) => [candidate.itemId, candidate])
  );

  const enriched = orderedBase.map((item, index) => {
    const candidate = candidateByItemId.get(item.id);
    const feed: FeedDeliveryMeta = {
      requestId: delivery.requestId,
      algorithmVersion: delivery.algorithmVersion,
      candidatePool: poolByItemId.get(item.id) ?? candidate?.pool ?? "personalized",
      rankPosition: (delivery.rankPositionStart ?? 0) + index
    };

    return {
      ...item,
      feed,
      creatorVerification: item.creatorUserId
        ? (verificationByUser.get(item.creatorUserId) ?? null)
        : null,
      likeCount: likeCountByEpisode.get(item.id) ?? 0,
      commentCount: commentCountByEpisode.get(item.id) ?? 0,
      saveCount: saveCountByStory.get(item.storyId) ?? 0,
      shareCount: 0,
      isLiked: likedEpisodeIds.has(item.id),
      isSaved: savedStoryIds.has(item.storyId),
      isFollowingCreator: item.creatorId
        ? followedCreatorIds.has(item.creatorId)
        : false
    };
  });

  void logRecommendationExposureBatch(supabase, candidates, {
    surface: "reels",
    requestId: delivery.requestId,
    userId,
    rankPositionStart: delivery.rankPositionStart
  });

  return enriched;
}
