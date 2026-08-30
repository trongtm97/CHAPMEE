import "server-only";

import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { getChapterForReader } from "@/lib/chapters/get-chapter-for-reader";
import type { EpisodeContentStorageRow } from "@/lib/chapters/episode-content-row";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { getChapterImagesMap } from "@/lib/images/get-chapter-images-map";
import { createClient } from "@/lib/data/server";

/** Loads full chapter body from S3/DB after access checks (e.g. paid gate). */
export async function hydrateEpisodeReaderBody(
  data: EpisodeReaderData,
  episodeStorageRow: EpisodeContentStorageRow,
  options?: {
    profileId?: string | null;
    turnstileToken?: string | null;
  }
): Promise<EpisodeReaderData> {
  const body = await getChapterForReader({
    row: episodeStorageRow,
    chapterId: data.episode.id,
    allowFullBody: true,
    profileId: options?.profileId ?? null,
    path: data.chapterHref,
    turnstileToken: options?.turnstileToken ?? null,
    canonicalChapterUrl: data.chapterHref,
    canonicalStoryUrl: data.storyHref
  });

  if (body.blocked && body.guardError) {
    return {
      ...data,
      episode: {
        ...data.episode,
        contentUnavailableMessage: body.guardError
      }
    };
  }

  const structuredContent = body.unavailableMessage ? null : body.structuredContent;
  const db = await createClient();
  const chapterImageMap = await getChapterImagesMap(
    db,
    collectMediaIdsFromComposer(structuredContent)
  );

  return {
    ...data,
    episode: {
      ...data.episode,
      content: body.unavailableMessage ?? body.content,
      structuredContent,
      contentUnavailableMessage: body.unavailableMessage ?? body.guardError ?? null
    },
    chapterImageMap
  };
}
