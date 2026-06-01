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
import { createClient } from "@/lib/supabase/server";

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

    for (const chapterId of chapterIds) {
      const result = await deleteDraftStudioChapterAction(storyId, chapterId);

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
    const supabase = await createClient();

    for (const chapterId of chapterIds) {
      const { data: episode, error: fetchError } = await supabase
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

      const { error: updateError } = await supabase
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
    const supabase = await createClient();

    const { data: episodes, error } = await supabase
      .from("episodes")
      .select("episode_number, title, status, word_count, updated_at, published_at")
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const header = "chapter_number,title,status,word_count,published_at,updated_at";
    const rows = (episodes ?? []).map((row) => {
      const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
      return [
        row.episode_number,
        escape(String(row.title)),
        row.status,
        row.word_count,
        row.published_at ?? "",
        row.updated_at
      ].join(",");
    });

    await logChapterManagerAudit({
      action: "chapter_export_csv",
      actorUserId: user.id,
      storyId,
      targetIds: (episodes ?? []).map((row) => String(row.episode_number))
    });

    void creatorProfile.id;
    return { csv: [header, ...rows].join("\n"), ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể xuất CSV.",
      ok: false
    };
  }
}
