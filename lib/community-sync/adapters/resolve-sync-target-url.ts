import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import { getReelUrl } from "@/lib/urls/paths";
import type { SyncSurface } from "@/lib/community-sync/constants";
import { SYNC_SURFACES } from "@/lib/community-sync/constants";

type StoryUrlRow = {
  slug: string;
  public_code: string;
};

type EpisodeUrlRow = {
  slug: string;
  public_code: string;
  episode_number: number;
};

function appendCommentHash(url: string) {
  return `${url}#comments`;
}

export async function resolveChapterTargetUrl(input: {
  storyId: string;
  chapterId?: string | null;
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

  if (!input.chapterId) {
    return appendCommentHash(getStoryDetailHref(storyFields));
  }

  const { rows: episodeRows } = await db.execute(sql`
    select slug, public_code, episode_number
    from public.episodes
    where id = ${input.chapterId}::uuid
    limit 1
  `);

  const episode = episodeRows[0] as EpisodeUrlRow | undefined;
  if (!episode?.slug || !episode.public_code) {
    return appendCommentHash(getStoryDetailHref(storyFields));
  }

  return appendCommentHash(
    getStoryChapterHref(storyFields, {
      slug: episode.slug,
      public_code: episode.public_code
    })
  );
}

export function resolveReelsTargetUrl(input: {
  reelSlug?: string | null;
  reelPublicCode?: string | null;
  reelHref?: string | null;
  fallbackStoryHref?: string | null;
}) {
  if (input.reelSlug && input.reelPublicCode) {
    return appendCommentHash(
      getReelUrl({ slug: input.reelSlug, public_code: input.reelPublicCode })
    );
  }

  if (input.reelHref) {
    return appendCommentHash(input.reelHref);
  }

  if (input.fallbackStoryHref) {
    return appendCommentHash(input.fallbackStoryHref);
  }

  return appendCommentHash(REELS_PUBLIC_PATH);
}

export async function resolveAudioTargetUrl(input: {
  storyId: string;
  audioItemId: string;
  timestampSeconds?: number | null;
}) {
  const { rows } = await db.execute(sql`
    select id
    from public.story_audio_items
    where id = ${input.audioItemId}::uuid
    limit 1
  `);

  if (!rows[0]) {
    return null;
  }

  const base = `/audio?story=${input.storyId}&item=${input.audioItemId}`;
  const withTime =
    input.timestampSeconds != null && input.timestampSeconds > 0
      ? `${base}&t=${Math.floor(input.timestampSeconds)}`
      : base;

  return appendCommentHash(withTime);
}

export async function resolveAdaptationTargetUrl(input: {
  filmAdaptationId: string;
}) {
  const { rows } = await db.execute(sql`
    select fa.id, s.slug, s.public_code
    from public.story_film_adaptations fa
    join public.stories s on s.id = fa.story_id
    where fa.id = ${input.filmAdaptationId}::uuid
    limit 1
  `);

  const row = rows[0] as { id: string; slug: string; public_code: string } | undefined;
  if (!row?.slug) {
    return null;
  }

  const storyHref = row.public_code
    ? getStoryDetailHref({ slug: row.slug, public_code: row.public_code })
    : `/truyen/${row.slug}`;

  return appendCommentHash(`${storyHref}?film=${input.filmAdaptationId}`);
}

export async function resolveSyncTargetUrl(input: {
  surface: SyncSurface;
  storyId: string;
  chapterId?: string | null;
  reelSlug?: string | null;
  reelPublicCode?: string | null;
  reelHref?: string | null;
  audioItemId?: string | null;
  timestampSeconds?: number | null;
  filmAdaptationId?: string | null;
}) {
  if (input.surface === SYNC_SURFACES.reels) {
    const fallback = await resolveChapterTargetUrl({
      storyId: input.storyId,
      chapterId: input.chapterId
    });

    return resolveReelsTargetUrl({
      reelSlug: input.reelSlug,
      reelPublicCode: input.reelPublicCode,
      reelHref: input.reelHref,
      fallbackStoryHref: fallback
    });
  }

  if (input.surface === SYNC_SURFACES.audio && input.audioItemId) {
    return resolveAudioTargetUrl({
      storyId: input.storyId,
      audioItemId: input.audioItemId,
      timestampSeconds: input.timestampSeconds
    });
  }

  if (
    (input.surface === SYNC_SURFACES.adaptation || input.surface === SYNC_SURFACES.trailer) &&
    input.filmAdaptationId
  ) {
    return resolveAdaptationTargetUrl({ filmAdaptationId: input.filmAdaptationId });
  }

  return resolveChapterTargetUrl({
    storyId: input.storyId,
    chapterId: input.chapterId
  });
}

export async function resolveSpoilerLevelForLinkedChapter(chapterId?: string | null) {
  if (!chapterId) {
    return "none" as const;
  }

  const { rows } = await db.execute(sql`
    select is_paid
    from public.episodes
    where id = ${chapterId}::uuid
    limit 1
  `);

  const episode = rows[0] as { is_paid?: boolean } | undefined;
  return episode?.is_paid ? ("mild" as const) : ("none" as const);
}
