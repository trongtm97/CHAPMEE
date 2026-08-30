import { normalizeDbContentOrigin } from "@/lib/stories/story-origin";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { getCurrentStoryImage } from "@/lib/images/get-current-story-image";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { createClient } from "@/lib/data/server";
import { mapStoryStructureFromRow } from "@/lib/stories/story-structure";
import { SHORT_STORY_CHAPTER_THRESHOLD } from "@/lib/stories/chapter-ranges";
import { getPublicStoryEarlyFanStats } from "@/lib/data/early-fans";
import { syncStoryReadMilestones } from "@/lib/data/milestones";
import { getStoryPoll } from "@/lib/data/polls";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { resolveCreatorRowUsername } from "@/lib/creator/resolve-creator-row-name";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import type { PollView } from "@/types/poll";
import type { StoryImage } from "@/types/story-images";
import type { PublicVerificationBadge } from "@/types/verification";
import type { StoryStructureFields } from "@/types/story-structure";

export type StoryDetail = StoryStructureFields & {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  hook: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  coverUrl: string | null;
  currentImage: StoryImage | null;
  creatorId: string | null;
  creatorUserId: string | null;
  genreName: string | null;
  genreSlug: string | null;
  contentWarnings: string[];
  creatorName: string | null;
  creatorUsername: string | null;
  authorVerification: PublicVerificationBadge | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  canonicalUrl: string | null;
  status: string;
  visibility: string;
  isCompleted: boolean;
  episodeCount: number;
  likeCount: number;
  saveCount: number;
  earlyFanCount: number;
  poll: PollView | null;
  tags: string[];
  tagsExtra: string[];
  subgenres: string[];
  presentationLabel: string | null;
  ageRatingLabel: string | null;
  taxonomyStatusLabels: string[];
  episodes: StoryEpisode[];
  latestEpisodePublishedAt: string | null;
  comments: StoryComment[];
  originalsStatus: "none" | "candidate" | "under_review" | "original" | "declined" | "ended" | null;
  contentOrigin: "original" | "translation";
  rightsStatus: string | null;
  sourceTitle: string | null;
  sourceAuthorName: string | null;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  originalLanguage: string | null;
  translatedLanguage: string | null;
  translationType: string | null;
  canReceiveTips: boolean;
  canJoinBoostCampaign: boolean;
};

export type StoryEpisode = {
  id: string;
  episodeNumber: number;
  title: string;
  slug: string;
  publicCode: string;
  excerpt: string | null;
  publishedAt: string | null;
};

export type StoryComment = {
  id: string;
  content: string;
  createdAt: string;
  displayName: string | null;
};

export type StoryDetailResult = {
  story: StoryDetail | null;
  notFound: boolean;
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  is_completed: boolean | null;
  status: string;
  visibility: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  creator_profiles:
    | {
        id: string | null;
        user_id: string | null;
        pen_name: string | null;
        profiles: { display_name: string | null; username: string | null } | null;
      }
    | {
        id: string | null;
        user_id: string | null;
        pen_name: string | null;
        profiles: { display_name: string | null; username: string | null } | null;
      }[]
    | null;
  content_origin?: string | null;
  rights_status?: string | null;
  source_title?: string | null;
  source_author_name?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
  original_language?: string | null;
  translated_language?: string | null;
  translation_type?: string | null;
  can_receive_tips?: boolean | null;
  can_join_boost_campaign?: boolean | null;
};

type StoryTagRow = {
  tags: { name: string | null } | { name: string | null }[] | null;
};

type EpisodeRow = {
  id: string;
  episode_number: number;
  title: string;
  slug: string;
  public_code: string;
  excerpt: string | null;
  published_at: string | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getStoryBySlug(slug: string): Promise<StoryDetailResult> {
  try {
    const db = await createClient();
    const {
      data: { user }
    } = await db.auth.getUser();
    const { data: storyRow, error: storyError } = await db
      .from("stories")
      .select(
        "id, title, slug, public_code, hook, short_description, long_description, cover_url, is_completed, status, visibility, seo_title, seo_description, seo_keywords, canonical_url, structure_type, content_format, standalone_content_json, standalone_plain_text, standalone_word_count, standalone_reading_time_minutes, standalone_published_at, standalone_updated_at, content_origin, rights_status, source_title, source_author_name, source_url, source_platform, original_language, translated_language, translation_type, can_receive_tips, can_join_boost_campaign, creator_profiles(id, user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username))"
      )
      .eq("slug", slug)
      .eq("visibility", "public")
      .in("status", [...publicContentStatuses])
      .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!storyRow) {
      return { story: null, notFound: true, error: null };
    }

    const story = storyRow as unknown as StoryRow;
    const [episodeCountResult, commentRows, earlyFanStats, originalsStatusRow, currentImageResult] =
      await Promise.all([
      db
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", story.id)
        .in("status", [...publicContentStatuses]),
      db
        .from("comments")
        .select("id, content, created_at, profiles(display_name, username)")
        .eq("story_id", story.id)
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(5),
      getPublicStoryEarlyFanStats(story.id),
      db
        .from("story_originals_status")
        .select("status")
        .eq("story_id", story.id)
        .maybeSingle(),
      getCurrentStoryImage(db, story.id)
    ]);

    const totalEpisodeCount = episodeCountResult.count ?? 0;
    const shouldLoadAllEpisodes = totalEpisodeCount <= SHORT_STORY_CHAPTER_THRESHOLD;
    const episodeListQuery = db
      .from("episodes")
      .select("id, episode_number, title, slug, public_code, excerpt, published_at")
      .eq("story_id", story.id)
      .in("status", [...publicContentStatuses]);

    const [{ data: episodeRowsData }, latestEpisodeResult] = await Promise.all([
      shouldLoadAllEpisodes
        ? episodeListQuery.order("episode_number", { ascending: true })
        : Promise.resolve({ data: [] }),
      shouldLoadAllEpisodes
        ? Promise.resolve({ data: null })
        : db
            .from("episodes")
            .select("published_at")
            .eq("story_id", story.id)
            .in("status", [...publicContentStatuses])
            .order("episode_number", { ascending: false })
            .limit(1)
            .maybeSingle()
    ]);

    const creator = firstRelation(story.creator_profiles);
    const episodes = ((episodeRowsData ?? []) as unknown as EpisodeRow[]).map(
      (episode) => ({
        id: episode.id,
        episodeNumber: episode.episode_number,
        title: episode.title,
        slug: episode.slug,
        publicCode: episode.public_code,
        excerpt: episode.excerpt,
        publishedAt: episode.published_at
      })
    );
    const comments = ((commentRows.data ?? []) as unknown as CommentRow[]).map(
      (comment) => {
        const profile = firstRelation(comment.profiles);

        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          displayName: profile?.display_name ?? profile?.username ?? null
        };
      }
    );
    const episodeIds = episodes.map((episode) => episode.id);
    const [storyLikeRows, episodeLikeRows, saveCountsResult, poll] = await Promise.all([
      db
        .from("reactions")
        .select("id")
        .eq("target_type", "story")
        .eq("reaction_type", "like")
        .eq("target_id", story.id),
      episodeIds.length > 0
        ? db
            .from("reactions")
            .select("id")
            .eq("target_type", "episode")
            .eq("reaction_type", "like")
            .in("target_id", episodeIds)
        : Promise.resolve({ data: [] }),
      db.rpc("get_public_story_save_counts", {
        input_story_ids: [story.id]
      }),
      getStoryPoll(story.id, user?.id ?? null)
    ]);
    const storySaveCount = Array.isArray(saveCountsResult.data)
      ? Number(saveCountsResult.data[0]?.save_count ?? 0)
      : 0;

    if (creator?.user_id && user?.id === creator.user_id && earlyFanStats) {
      await syncStoryReadMilestones({
        readCount: Number(earlyFanStats.readCount ?? 0),
        storyId: story.id,
        storyTitle: story.title,
        userId: creator.user_id
      });
    }

    const authorVerification = creator?.user_id
      ? await getPublicVerificationBadge(creator.user_id)
      : null;

    const { resolveStoryPublicTaxonomyDisplay } = await import(
      "@/lib/taxonomy/story-public-display"
    );
    const taxonomyDisplay = await resolveStoryPublicTaxonomyDisplay(
      db,
      story.id
    );

    return {
      story: {
        ...mapStoryStructureFromRow(story as StoryRow & {
          structure_type?: string | null;
          content_format?: string | null;
          standalone_content_json?: unknown | null;
          standalone_plain_text?: string | null;
          standalone_word_count?: number | null;
          standalone_reading_time_minutes?: number | null;
          standalone_published_at?: string | null;
          standalone_updated_at?: string | null;
        }),
        id: story.id,
        title: story.title,
        slug: story.slug,
        publicCode: story.public_code,
        hook: story.hook,
        shortDescription: story.short_description,
        longDescription: story.long_description,
        coverUrl: resolveStoryCoverUrl(story.cover_url),
        currentImage: currentImageResult.error ? null : currentImageResult.image,
        creatorId: creator?.id ?? null,
        creatorUserId: creator?.user_id ?? null,
        genreName: taxonomyDisplay.genreName,
        genreSlug: taxonomyDisplay.genreSlug,
        contentWarnings: taxonomyDisplay.contentWarnings,
        creatorName: resolvePublicDisplayName(
          firstRelation(creator?.profiles ?? null),
          creator
        ),
        creatorUsername: resolveCreatorRowUsername(creator),
        authorVerification,
        seoTitle: story.seo_title ?? null,
        seoDescription: story.seo_description ?? null,
        seoKeywords: story.seo_keywords ?? [],
        canonicalUrl: story.canonical_url ?? null,
        status: story.status,
        visibility: story.visibility,
        isCompleted: Boolean(story.is_completed),
        episodeCount: totalEpisodeCount,
        likeCount:
          ((storyLikeRows.data ?? []) as Array<{ id: string }>).length +
          ((episodeLikeRows.data ?? []) as Array<{ id: string }>).length,
        saveCount: storySaveCount,
        earlyFanCount: earlyFanStats?.earlyFanCount ?? 0,
        poll,
        tags: taxonomyDisplay.tags,
        tagsExtra: taxonomyDisplay.tagsExtra,
        subgenres: taxonomyDisplay.subgenres,
        presentationLabel: taxonomyDisplay.presentationLabel,
        ageRatingLabel: taxonomyDisplay.ageRatingLabel,
        taxonomyStatusLabels: taxonomyDisplay.statusLabels,
        episodes,
        latestEpisodePublishedAt:
          episodes[episodes.length - 1]?.publishedAt ??
          (latestEpisodeResult.data as { published_at?: string | null } | null)
            ?.published_at ??
          null,
        comments,
        originalsStatus: (originalsStatusRow.data?.status as StoryDetail["originalsStatus"]) ?? null
        ,
        contentOrigin: normalizeDbContentOrigin(
          (story as { content_origin?: string | null }).content_origin
        ),
        rightsStatus: (story as { rights_status?: string | null }).rights_status ?? null,
        sourceTitle: (story as { source_title?: string | null }).source_title ?? null,
        sourceAuthorName:
          (story as { source_author_name?: string | null }).source_author_name ?? null,
        sourceUrl: (story as { source_url?: string | null }).source_url ?? null,
        sourcePlatform: (story as { source_platform?: string | null }).source_platform ?? null,
        originalLanguage:
          (story as { original_language?: string | null }).original_language ?? null,
        translatedLanguage:
          (story as { translated_language?: string | null }).translated_language ?? null,
        translationType:
          (story as { translation_type?: string | null }).translation_type ?? null,
        canReceiveTips: Boolean(
          (story as { can_receive_tips?: boolean | null }).can_receive_tips
        ),
        canJoinBoostCampaign: Boolean(
          (story as { can_join_boost_campaign?: boolean | null }).can_join_boost_campaign
        )
      },
      notFound: false,
      error: null
    };
  } catch (error) {
    return {
      story: null,
      notFound: false,
      error:
        error instanceof Error ? error.message : "Could not load story detail."
    };
  }
}
