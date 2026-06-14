import type { ChapterReelsPromoRecord } from "@/types/chapter-reels-promo";
import type { DatabaseClient } from "@/lib/db/types";
import type { ReelsSourceType } from "@/types/reels";
import { loadReelsContentObject } from "@/lib/storage/reels-content-storage";

type ReelsPromoRow = {
  id: string;
  hook: string | null;
  body: string | null;
  status: string;
  source_type: string | null;
  source_text_start: number | null;
  source_text_end: number | null;
  content_storage_type?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  body_preview?: string | null;
};

export async function getChapterReelsPromo(
  db: DatabaseClient,
  ownerProfileId: string,
  chapterId: string
): Promise<ChapterReelsPromoRecord | null> {
  const { data } = await db
    .from("reels_items")
    .select(
      "id, hook, body, status, source_type, source_text_start, source_text_end, content_storage_type, content_object_key, content_hash, body_preview"
    )
    .eq("chapter_id", chapterId)
    .eq("owner_id", ownerProfileId)
    .neq("status", "hidden")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const row = data as ReelsPromoRow;
  let body = row.body ?? "";
  let hook = row.hook ?? "";

  if (row.content_storage_type === "s3" && row.content_object_key) {
    try {
      const loaded = await loadReelsContentObject({
        expectedHash: row.content_hash ?? undefined,
        objectKey: row.content_object_key
      });
      body = loaded.envelope.body ?? "";
      hook = loaded.envelope.hook ?? "";
    } catch {
      body = row.body_preview ?? "";
    }
  }

  return {
    body,
    enabled: true,
    hook,
    reelId: row.id,
    reelStatus: row.status as ChapterReelsPromoRecord["reelStatus"],
    sourceTextEnd: row.source_text_end,
    sourceTextStart: row.source_text_start,
    sourceType: (row.source_type ?? "manual_selection") as ReelsSourceType
  };
}
