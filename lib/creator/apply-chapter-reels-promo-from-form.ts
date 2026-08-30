import { parseChapterReelsPromoFromFormData } from "@/lib/creator/parse-chapter-reels-promo";
import { syncChapterReelsPromo } from "@/lib/reels/sync-chapter-reels-promo";
import type { DatabaseClient } from "@/lib/db/types";

export async function applyChapterReelsPromoFromForm(
  db: DatabaseClient,
  input: {
    ownerProfileId: string;
    storyId: string;
    chapterId: string;
    chapterTitle: string;
    chapterStatus: "draft" | "published";
    formData: FormData;
  }
) {
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
    chapterStatus: input.chapterStatus,
    chapterTitle: input.chapterTitle,
    episodeBackgroundUrl:
      (episodeRow as { background_image_url?: string | null } | null)
        ?.background_image_url ?? null,
    ownerProfileId: input.ownerProfileId,
    promo: parseChapterReelsPromoFromFormData(input.formData),
    storyCoverUrl: (storyRow as { cover_url?: string | null } | null)?.cover_url ?? null,
    storyId: input.storyId
  });
}
