import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import {
  SOURCE_ENTITY_TYPES,
  SYNC_SURFACES,
  type SourceEntityType,
  type SyncSurface
} from "@/lib/community-sync/constants";

type StoryUrlRow = {
  slug: string;
  public_code: string;
};

type EpisodeUrlRow = {
  slug: string;
  public_code: string;
  episode_number: number;
};

export function resolveSourceEntity(input: {
  storyId: string;
  episodeId?: string | null;
  surface?: SyncSurface;
}): { sourceEntityType: SourceEntityType; sourceEntityId: string } {
  if (input.surface === SYNC_SURFACES.reels && input.episodeId) {
    return {
      sourceEntityType: SOURCE_ENTITY_TYPES.reel,
      sourceEntityId: input.episodeId
    };
  }

  if (input.surface === SYNC_SURFACES.audio && input.episodeId) {
    return {
      sourceEntityType: SOURCE_ENTITY_TYPES.audioEpisode,
      sourceEntityId: input.episodeId
    };
  }

  if (input.surface === SYNC_SURFACES.adaptation && input.episodeId) {
    return {
      sourceEntityType: SOURCE_ENTITY_TYPES.adaptationEpisode,
      sourceEntityId: input.episodeId
    };
  }

  if (input.surface === SYNC_SURFACES.trailer && input.episodeId) {
    return {
      sourceEntityType: SOURCE_ENTITY_TYPES.trailer,
      sourceEntityId: input.episodeId
    };
  }

  if (input.episodeId) {
    return {
      sourceEntityType: SOURCE_ENTITY_TYPES.chapter,
      sourceEntityId: input.episodeId
    };
  }

  return {
    sourceEntityType: SOURCE_ENTITY_TYPES.story,
    sourceEntityId: input.storyId
  };
}

export function buildCommentIdempotencyKey(eventType: string, commentId: string) {
  return `${eventType}:comment:${commentId}`;
}

export function truncateExcerpt(content: string, max = 200) {
  const trimmed = content.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

export async function resolveCommentTargetUrl(input: {
  storyId: string;
  episodeId?: string | null;
}) {
  const { rows: storyRows } = await db.execute(sql`
    select slug, public_code
    from public.stories
    where id = ${input.storyId}::uuid
    limit 1
  `);

  const story = storyRows[0] as StoryUrlRow | undefined;
  if (!story?.slug || !story.public_code) {
    return null;
  }

  const storyFields = { slug: story.slug, public_code: story.public_code };

  if (!input.episodeId) {
    return getStoryDetailHref(storyFields);
  }

  const { rows: episodeRows } = await db.execute(sql`
    select slug, public_code, episode_number
    from public.episodes
    where id = ${input.episodeId}::uuid
    limit 1
  `);

  const episode = episodeRows[0] as EpisodeUrlRow | undefined;
  if (!episode?.slug || !episode.public_code) {
    return getStoryDetailHref(storyFields);
  }

  return getStoryChapterHref(storyFields, {
    slug: episode.slug,
    public_code: episode.public_code
  });
}

export async function resolveEpisodeChapterOrder(episodeId: string | null | undefined) {
  if (!episodeId) {
    return null;
  }

  const { rows } = await db.execute(sql`
    select episode_number
    from public.episodes
    where id = ${episodeId}::uuid
    limit 1
  `);

  const episodeNumber = (rows[0] as { episode_number: number } | undefined)?.episode_number;
  return typeof episodeNumber === "number" ? episodeNumber : null;
}

export async function resolveStoryAuthorUserId(storyId: string) {
  const { rows } = await db.execute(sql`
    select cp.user_id
    from public.stories s
    join public.creator_profiles cp on cp.id = s.creator_id
    where s.id = ${storyId}::uuid
    limit 1
  `);

  return (rows[0] as { user_id: string } | undefined)?.user_id ?? null;
}

export async function isAuthorUser(storyId: string, userId: string) {
  const authorUserId = await resolveStoryAuthorUserId(storyId);
  return authorUserId !== null && authorUserId === userId;
}

export async function countVisibleThreadReplies(rootCommentId: string) {
  const { rows } = await db.execute(sql`
    with recursive thread as (
      select id, parent_id
      from public.comments
      where id = ${rootCommentId}::uuid
      union all
      select c.id, c.parent_id
      from public.comments c
      inner join thread t on c.parent_id = t.id
      where c.status = 'visible'
    )
    select count(*)::int as reply_count
    from thread
    where id <> ${rootCommentId}::uuid
  `);

  return (rows[0] as { reply_count: number } | undefined)?.reply_count ?? 0;
}

export async function resolveRootCommentId(parentCommentId: string) {
  const { rows } = await db.execute(sql`
    with recursive ancestors as (
      select id, parent_id
      from public.comments
      where id = ${parentCommentId}::uuid
      union all
      select c.id, c.parent_id
      from public.comments c
      inner join ancestors a on c.id = a.parent_id
    )
    select id
    from ancestors
    where parent_id is null
    limit 1
  `);

  return (rows[0] as { id: string } | undefined)?.id ?? parentCommentId;
}

export function isSurfaceSyncEnabled(
  surface: SyncSurface | undefined,
  settings: {
    syncChapterComments: boolean;
    syncReelComments: boolean;
    syncAudioComments: boolean;
    syncAdaptationComments: boolean;
  }
) {
  switch (surface) {
    case SYNC_SURFACES.reels:
      return settings.syncReelComments;
    case SYNC_SURFACES.audio:
      return settings.syncAudioComments;
    case SYNC_SURFACES.adaptation:
    case SYNC_SURFACES.trailer:
      return settings.syncAdaptationComments;
    case SYNC_SURFACES.storyPage:
    case SYNC_SURFACES.chapterReader:
    default:
      return settings.syncChapterComments;
  }
}

export function mapCommentToFeedVisibility(input: {
  status: string;
  moderationStatus?: string | null;
}): "visible" | "hidden" | "moderated" | "deleted" {
  if (input.status === "deleted") {
    return "deleted";
  }

  if (input.status === "hidden") {
    return "hidden";
  }

  if (input.moderationStatus === "flagged" || input.moderationStatus === "rejected") {
    return "moderated";
  }

  if (input.moderationStatus === "hidden") {
    return "hidden";
  }

  return "visible";
}

export function mapCommentToModerationStatus(
  moderationStatus?: string | null
): "pending" | "approved" | "flagged" | "hidden" | "rejected" {
  if (
    moderationStatus === "pending" ||
    moderationStatus === "approved" ||
    moderationStatus === "flagged" ||
    moderationStatus === "hidden" ||
    moderationStatus === "rejected"
  ) {
    return moderationStatus;
  }

  return "approved";
}
