"use server";

import { revalidatePath } from "next/cache";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { logChapterManagerAudit } from "@/lib/studio/log-chapter-manager-audit";
import {
  deleteDraftStudioChapterAction,
  hideStudioChapterAction
} from "@/lib/studio/manager-actions";
import { studioBulkChapterMonetizationAction } from "@/lib/studio/studio-monetization-actions";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/data/server";
import { exportRowsToCsv } from "@/lib/studio/csv";
import { CHAPTERS_IMPORT_V2_HEADERS } from "@/types/studio-import-v2";

export type ChapterBatchActionResult = {
  ok: boolean;
  successCount: number;
  failedCount: number;
  skipped: Array<{ id: string; reason: string }>;
  error?: string;
};

async function assertChapterManagerAccess(storyId: string) {
  const { creatorProfile, error, user } = await getStudioAccess(
    studioPath(`/stories/${storyId}/chapters`)
  );

  if (error || !creatorProfile || !user) {
    throw new Error(error ?? "Không có quyền truy cập Studio.");
  }

  return { creatorProfile, user };
}

export async function batchHideStudioChaptersAction(
  storyId: string,
  chapterIds: string[]
): Promise<ChapterBatchActionResult> {
  const skipped: Array<{ id: string; reason: string }> = [];
  let successCount = 0;

  try {
    const { user } = await assertChapterManagerAccess(storyId);

    for (const chapterId of chapterIds) {
      const result = await hideStudioChapterAction(storyId, chapterId);

      if (result.ok) {
        successCount += 1;
      } else {
        skipped.push({ id: chapterId, reason: result.error ?? "Không thể ẩn." });
      }
    }

    await logChapterManagerAudit({
      action: "chapter_batch_hide",
      actorUserId: user.id,
      storyId,
      targetIds: chapterIds
    });

    revalidatePath(studioPath(`/stories/${storyId}/chapters`));
    return {
      failedCount: skipped.length,
      ok: successCount > 0,
      skipped,
      successCount
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể ẩn hàng loạt.",
      failedCount: chapterIds.length,
      ok: false,
      skipped,
      successCount
    };
  }
}

export async function batchDeleteDraftChaptersAction(
  storyId: string,
  chapterIds: string[]
): Promise<ChapterBatchActionResult> {
  const skipped: Array<{ id: string; reason: string }> = [];
  let successCount = 0;

  try {
    const { user } = await assertChapterManagerAccess(storyId);
    const { softDeleteStudioChapterAction } = await import(
      "@/lib/studio/soft-delete-actions"
    );

    for (const chapterId of chapterIds) {
      const result = await softDeleteStudioChapterAction(storyId, chapterId);

      if (result.ok) {
        successCount += 1;
      } else {
        skipped.push({ id: chapterId, reason: result.error ?? "Không thể xóa." });
      }
    }

    await logChapterManagerAudit({
      action: "chapter_batch_delete",
      actorUserId: user.id,
      storyId,
      targetIds: chapterIds
    });

    revalidatePath(studioPath(`/stories/${storyId}/chapters`));
    return {
      failedCount: skipped.length,
      ok: successCount > 0,
      skipped,
      successCount
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể xóa hàng loạt.",
      failedCount: chapterIds.length,
      ok: false,
      skipped,
      successCount
    };
  }
}

export async function batchMoveChaptersToDraftAction(
  storyId: string,
  chapterIds: string[]
): Promise<ChapterBatchActionResult> {
  const skipped: Array<{ id: string; reason: string }> = [];
  let successCount = 0;

  try {
    const { creatorProfile, user } = await assertChapterManagerAccess(storyId);
    const db = await createClient();

    for (const chapterId of chapterIds) {
      const { data: episode, error: fetchError } = await db
        .from("episodes")
        .select("id, status, stories!inner(creator_id)")
        .eq("id", chapterId)
        .eq("story_id", storyId)
        .eq("stories.creator_id", creatorProfile.id)
        .maybeSingle();

      if (fetchError || !episode) {
        skipped.push({ id: chapterId, reason: "Không tìm thấy chương." });
        continue;
      }

      if (episode.status === "published") {
        skipped.push({ id: chapterId, reason: "Chương đã đăng — hãy ẩn thay vì chuyển nháp." });
        continue;
      }

      const { error: updateError } = await db
        .from("episodes")
        .update({ status: "draft" })
        .eq("id", chapterId);

      if (updateError) {
        skipped.push({ id: chapterId, reason: updateError.message });
      } else {
        successCount += 1;
      }
    }

    await logChapterManagerAudit({
      action: "chapter_batch_draft",
      actorUserId: user.id,
      storyId,
      targetIds: chapterIds
    });

    revalidatePath(studioPath(`/stories/${storyId}/chapters`));
    return {
      failedCount: skipped.length,
      ok: successCount > 0,
      skipped,
      successCount
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể chuyển nháp hàng loạt.",
      failedCount: chapterIds.length,
      ok: false,
      skipped,
      successCount
    };
  }
}

export async function batchPublishStudioChaptersAction(
  storyId: string,
  chapterIds: string[]
): Promise<ChapterBatchActionResult> {
  const skipped: Array<{ id: string; reason: string }> = [];
  let successCount = 0;

  try {
    const { creatorProfile, user } = await assertChapterManagerAccess(storyId);
    const db = await createClient();
    const { publishChapterTarget } = await import("@/lib/studio/scheduling/publish-target");

    for (const chapterId of chapterIds) {
      const result = await publishChapterTarget(
        db,
        chapterId,
        storyId,
        creatorProfile.id,
        creatorProfile.user_id
      );

      if (result.ok) {
        successCount += 1;
      } else {
        skipped.push({ id: chapterId, reason: result.error ?? "Không đăng được." });
      }
    }

    await logChapterManagerAudit({
      action: "chapter_batch_publish",
      actorUserId: user.id,
      storyId,
      targetIds: chapterIds
    });

    revalidatePath(studioPath(`/stories/${storyId}/chapters`));
    return {
      failedCount: skipped.length,
      ok: successCount > 0,
      skipped,
      successCount
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể đăng hàng loạt.",
      failedCount: chapterIds.length,
      ok: false,
      skipped,
      successCount
    };
  }
}

export async function batchSetChaptersFreeAction(
  storyId: string,
  chapterIds: string[]
): Promise<ChapterBatchActionResult> {
  const result = await studioBulkChapterMonetizationAction({
    action: "set_free",
    chapterIds,
    storyId
  });

  return {
    error: result.error,
    failedCount: result.failedCount,
    ok: result.ok,
    skipped: [],
    successCount: result.successCount
  };
}

export async function exportChaptersCsvAction(storyId: string): Promise<{
  ok: boolean;
  csv?: string;
  error?: string;
}> {
  try {
    const { creatorProfile, user } = await assertChapterManagerAccess(storyId);
    const db = await createClient();

    const { data: story, error: storyError } = await db
      .from("stories")
      .select("public_code, slug")
      .eq("id", storyId)
      .maybeSingle();

    if (storyError || !story) {
      throw new Error(storyError?.message ?? "Không tìm thấy truyện.");
    }

    const { data: episodes, error } = await db
      .from("episodes")
      .select(
        "id, episode_number, title, content, public_code, published_at, presentation_mode, structured_content, status"
      )
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const episodeIds = (episodes ?? []).map((row) => String(row.id));
    const { data: chapterMonetization } =
      episodeIds.length > 0
        ? await db
            .from("chapter_monetization_settings")
            .select("chapter_id, is_paid, coin_price")
            .in("chapter_id", episodeIds)
        : { data: [] };

    const monetizationByChapter = new Map(
      (chapterMonetization ?? []).map((row) => [String(row.chapter_id), row])
    );

    const rows = (episodes ?? []).map((row) => {
      const monetization = monetizationByChapter.get(String(row.id));
      const isPaid = Boolean(monetization?.is_paid);

      return {
        story_code: String(story.public_code ?? ""),
        chapter_code: String(row.public_code ?? ""),
        chapter_order: String(row.episode_number ?? ""),
        title: String(row.title ?? ""),
        content: String(row.content ?? ""),
        structured_content_json: row.structured_content
          ? JSON.stringify(row.structured_content)
          : "",
        presentation_mode: String(row.presentation_mode ?? ""),
        status: String(row.status ?? "draft"),
        publish_at: row.published_at ? String(row.published_at) : "",
        price_coin:
          isPaid && monetization?.coin_price != null
            ? String(monetization.coin_price)
            : "",
        is_free: isPaid ? "false" : "true"
      };
    });

    await logChapterManagerAudit({
      action: "chapter_export_csv",
      actorUserId: user.id,
      storyId,
      targetIds: (episodes ?? []).map((row) => String(row.episode_number))
    });

    void creatorProfile.id;
    return {
      csv: exportRowsToCsv([...CHAPTERS_IMPORT_V2_HEADERS], rows),
      ok: true
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể xuất CSV.",
      ok: false
    };
  }
}
