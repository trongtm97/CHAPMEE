import { parseChapterDraftContent } from "@/lib/studio/draft-content";
import { getStudioDraftForEditor } from "@/lib/studio/get-draft";
import { getChapterReelsPromo } from "@/lib/reels/get-chapter-reels-promo";
import { syncChapterReelsPromo } from "@/lib/reels/sync-chapter-reels-promo";
import type { ChapterReelsPromoDraft } from "@/types/chapter-reels-promo";
import type { DatabaseClient } from "@/lib/db/types";

async function resolvePromoForPublish(
  db: DatabaseClient,
  ownerProfileId: string,
  storyId: string,
  chapterId: string
): Promise<ChapterReelsPromoDraft | null> {
  const fromDb = await getChapterReelsPromo(db, ownerProfileId, chapterId);

  if (fromDb) {
    return {
      body: fromDb.body,
      enabled: fromDb.enabled,
      hook: fromDb.hook,
      sourceTextEnd: fromDb.sourceTextEnd,
      sourceTextStart: fromDb.sourceTextStart,
      sourceType: fromDb.sourceType
    };
  }

  const draft = await getStudioDraftForEditor(
    ownerProfileId,
    "chapter",
    storyId,
    chapterId
  );
  const parsed = parseChapterDraftContent(draft?.content);

  if (!parsed.reelsPromo?.enabled) {
    return null;
  }

  return parsed.reelsPromo;
}

export async function publishChapterLinkedReelsPromo(
  db: DatabaseClient,
  input: {
    ownerProfileId: string;
    storyId: string;
    chapterId: string;
    chapterTitle: string;
  }
) {
  const promo = await resolvePromoForPublish(
    db,
    input.ownerProfileId,
    input.storyId,
    input.chapterId
  );

  if (!promo?.enabled) {
    return { ok: true as const, skipped: true as const };
  }

  const [{ data: storyRow }, { data: episodeRow }] = await Promise.all([
    db.from("stories").select("cover_url").eq("id", input.storyId).maybeSingle(),
    db
      .from("episodes")
      .select("background_image_url")
      .eq("id", input.chapterId)
      .maybeSingle()
  ]);

  return syncChapterReelsPromo(db, {
    chapterId: input.chapterId,
    chapterStatus: "published",
    chapterTitle: input.chapterTitle,
    episodeBackgroundUrl:
      (episodeRow as { background_image_url?: string | null } | null)
        ?.background_image_url ?? null,
    ownerProfileId: input.ownerProfileId,
    promo,
    storyCoverUrl: (storyRow as { cover_url?: string | null } | null)?.cover_url ?? null,
    storyId: input.storyId
  });
}
