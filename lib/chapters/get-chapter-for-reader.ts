import "server-only";

import {
  getChapterFullContent,
  type ChapterFullContent,
  type GetChapterFullContentOptions
} from "@/lib/chapters/get-chapter-full-content";
import type { EpisodeContentStorageRow } from "@/lib/chapters/episode-content-row";
import { guardChapterRead } from "@/lib/security/guard-chapter-read";
import { getSecurityRequestContext } from "@/lib/security/request-context";
export type GetChapterForReaderInput = {
  row: EpisodeContentStorageRow;
  chapterId: string;
  /** Caller must confirm publish/entitlement before setting true. */
  allowFullBody: boolean;
  profileId?: string | null;
  path?: string;
  turnstileToken?: string | null;
  canonicalStoryUrl?: string | null;
  canonicalChapterUrl?: string | null;
};

export type GetChapterForReaderResult = ChapterFullContent & {
  blocked?: boolean;
  challengeRequired?: boolean;
  guardError?: string | null;
  protection?: {
    contentHash: string | null;
    canonicalStoryUrl: string | null;
    canonicalChapterUrl: string | null;
  };
};

/**
 * Loads chapter body only after crawl-protection + permission gates.
 * Never fetches S3/object storage when allowFullBody is false.
 */
export async function getChapterForReader(
  input: GetChapterForReaderInput
): Promise<GetChapterForReaderResult> {
  const ctx = await getSecurityRequestContext(input.path);

  if (!input.allowFullBody) {
    const preview = await getChapterFullContent(input.row, { allowS3Fetch: false });
    return {
      ...preview,
      blocked: false,
      challengeRequired: false,
      guardError: null,
      protection: {
        contentHash: input.row.content_hash ?? null,
        canonicalStoryUrl: input.canonicalStoryUrl ?? null,
        canonicalChapterUrl: input.canonicalChapterUrl ?? null
      }
    };
  }

  const guard = await guardChapterRead({
    chapterId: input.chapterId,
    profileId: input.profileId ?? null,
    ctx,
    path: input.path,
    turnstileToken: input.turnstileToken,
    allowFullBody: true
  });

  if (!guard.allowed) {
    const preview = await getChapterFullContent(input.row, { allowS3Fetch: false });
    return {
      ...preview,
      blocked: true,
      challengeRequired: guard.challengeRequired,
      guardError: guard.error,
      protection: {
        contentHash: input.row.content_hash ?? null,
        canonicalStoryUrl: input.canonicalStoryUrl ?? null,
        canonicalChapterUrl: input.canonicalChapterUrl ?? null
      }
    };
  }

  const body = await getChapterFullContent(input.row, { allowS3Fetch: guard.allowFullBody });

  return {
    ...body,
    blocked: false,
    challengeRequired: false,
    guardError: null,
    protection: {
      contentHash: input.row.content_hash ?? null,
      canonicalStoryUrl: input.canonicalStoryUrl ?? null,
      canonicalChapterUrl: input.canonicalChapterUrl ?? null
    }
  };
}

export { type GetChapterFullContentOptions };
