import { getReelsBackgroundSrc } from "@/lib/images/get-story-image";
import { publishReelsItem } from "@/lib/reels/publish-reels-item";
import {
  insertReelsItem,
  updateReelsItemRow
} from "@/lib/reels/reels-item-mutations";
import { validateReelsContent } from "@/lib/reels/validate-reels-item";
import type { ChapterReelsPromoDraft } from "@/types/chapter-reels-promo";
import type { DatabaseClient } from "@/lib/db/types";
import type { ReelsSourceType } from "@/types/reels";

export type SyncChapterReelsPromoInput = {
  ownerProfileId: string;
  storyId: string;
  chapterId: string;
  chapterTitle: string;
  chapterStatus: "draft" | "published";
  storyCoverUrl: string | null;
  episodeBackgroundUrl: string | null;
  promo: ChapterReelsPromoDraft;
};

export type SyncChapterReelsPromoResult = {
  ok: boolean;
  error?: string;
  reelId?: string;
  skipped?: boolean;
};

async function findChapterPromoReelId(
  db: DatabaseClient,
  ownerProfileId: string,
  chapterId: string
) {
  const { data } = await db
    .from("reels_items")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("owner_id", ownerProfileId)
    .neq("status", "hidden")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

function resolveBackgroundUrl(input: SyncChapterReelsPromoInput) {
  return (
    getReelsBackgroundSrc({
      title: input.chapterTitle,
      storyCoverUrl: input.storyCoverUrl,
      episodeBackgroundUrl: input.episodeBackgroundUrl
    }) ?? input.storyCoverUrl
  );
}

export async function syncChapterReelsPromo(
  db: DatabaseClient,
  input: SyncChapterReelsPromoInput
): Promise<SyncChapterReelsPromoResult> {
  if (!input.promo.enabled) {
    return { ok: true, skipped: true };
  }

  const hook = input.promo.hook.trim() || input.chapterTitle.trim();
  const body = input.promo.body.trim();

  if (!hook && !body) {
    return { ok: true, skipped: true };
  }

  if (input.chapterStatus === "published" && (!hook || !body)) {
    return { ok: true, skipped: true };
  }

  const backgroundImageUrl = resolveBackgroundUrl(input);
  const sourceType = (input.promo.sourceType ?? "manual_selection") as ReelsSourceType;
  const values = {
    backgroundImageUrl,
    body,
    chapterId: input.chapterId,
    cta: "Đọc tiếp",
    ctaType: "read_chapter",
    hook,
    storyId: input.storyId,
    title: undefined
  };

  const existingReelId = await findChapterPromoReelId(
    db,
    input.ownerProfileId,
    input.chapterId
  );

  if (input.chapterStatus === "published") {
    const validation = validateReelsContent(values, "publish");

    if (!validation.ok || !validation.values) {
      return { ok: true, skipped: true };
    }

    let reelId = existingReelId;

    if (reelId) {
      const updated = await updateReelsItemRow(db, reelId, input.ownerProfileId, values, {
        sourceTextEnd: input.promo.sourceTextEnd ?? null,
        sourceTextStart: input.promo.sourceTextStart ?? null,
        sourceType,
        status: "draft"
      });

      if (!updated.ok) {
        return { error: updated.error ?? "Không cập nhật được Reels.", ok: false };
      }
    } else {
      const created = await insertReelsItem(db, input.ownerProfileId, values, {
        sourceTextEnd: input.promo.sourceTextEnd ?? null,
        sourceTextStart: input.promo.sourceTextStart ?? null,
        sourceType,
        status: "draft"
      });

      if (!created.id) {
        return { error: created.error ?? "Không tạo được Reels.", ok: false };
      }

      reelId = created.id;
    }

    const published = await publishReelsItem(db, reelId, input.ownerProfileId, values);

    if (!published.ok) {
      return { error: published.error, ok: false, reelId };
    }

    return { ok: true, reelId };
  }

  const validation = validateReelsContent(values, "draft");

  if (!validation.ok || !validation.values) {
    return { ok: true, skipped: true };
  }

  if (existingReelId) {
    const updated = await updateReelsItemRow(
      db,
      existingReelId,
      input.ownerProfileId,
      values,
      {
        publishedAt: null,
        sourceTextEnd: input.promo.sourceTextEnd ?? null,
        sourceTextStart: input.promo.sourceTextStart ?? null,
        sourceType,
        status: "draft"
      }
    );

    if (!updated.ok) {
      return { error: updated.error ?? "Không lưu nháp Reels.", ok: false };
    }

    return { ok: true, reelId: existingReelId };
  }

  const created = await insertReelsItem(db, input.ownerProfileId, values, {
    sourceTextEnd: input.promo.sourceTextEnd ?? null,
    sourceTextStart: input.promo.sourceTextStart ?? null,
    sourceType,
    status: "draft"
  });

  if (!created.id) {
    return { error: created.error ?? "Không tạo nháp Reels.", ok: false };
  }

  return { ok: true, reelId: created.id };
}
