"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/server";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioPath } from "@/lib/studio/constants";

type ActionResult = {
  ok: boolean;
  error?: string;
};

// ── Soft-delete (3-day pending) ──────────────────────────────────────

export async function softDeleteStudioStoryAction(
  storyId: string
): Promise<ActionResult> {
  const { creatorProfile, error } = await getStudioAccess(studioPath("/stories"));

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const db = await createClient();
    const { data: story, error: fetchError } = await db
      .from("stories")
      .select("id, status, creator_id, deleted_at")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!story) {
      return { ok: false, error: "Không tìm thấy truyện." };
    }

    if (story.deleted_at) {
      return { ok: false, error: "Truyện đã được xoá trước đó." };
    }

    const { error: updateError } = await db
      .from("stories")
      .update({
        deleted_at: new Date().toISOString(),
        status: "archived",
        visibility: "private"
      })
      .eq("id", storyId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(studioPath("/stories"));
    return { ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể xoá truyện."
    };
  }
}

export async function softDeleteStudioChapterAction(
  storyId: string,
  episodeId: string
): Promise<ActionResult> {
  const { creatorProfile, error } = await getStudioAccess(
    studioPath(`/stories/${storyId}/chapters`)
  );

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const db = await createClient();
    const { data: episode, error: fetchError } = await db
      .from("episodes")
      .select("id, status, deleted_at, stories!inner(creator_id)")
      .eq("id", episodeId)
      .eq("story_id", storyId)
      .eq("stories.creator_id", creatorProfile.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!episode) {
      return { ok: false, error: "Không tìm thấy chương." };
    }

    if (episode.deleted_at) {
      return { ok: false, error: "Chương đã được xoá trước đó." };
    }

    const { error: updateError } = await db
      .from("episodes")
      .update({
        deleted_at: new Date().toISOString(),
        status: "archived"
      })
      .eq("id", episodeId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(studioPath(`/stories/${storyId}/chapters`));
    return { ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể xoá chương."
    };
  }
}

// ── Restore (within 3-day window) ────────────────────────────────────

export async function restoreStudioStoryAction(
  storyId: string
): Promise<ActionResult> {
  const { creatorProfile, error } = await getStudioAccess(studioPath("/stories"));

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const db = await createClient();
    const { data: story, error: fetchError } = await db
      .from("stories")
      .select("id, creator_id, deleted_at")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!story) {
      return { ok: false, error: "Không tìm thấy truyện." };
    }

    if (!story.deleted_at) {
      return { ok: false, error: "Truyện không ở trạng thái đã xoá." };
    }

    const deletedAt = new Date(story.deleted_at).getTime();
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    if (Date.now() - deletedAt > threeDays) {
      return {
        ok: false,
        error: "Đã quá thời hạn khôi phục (3 ngày). Truyện đã bị xoá vĩnh viễn."
      };
    }

    const { error: updateError } = await db
      .from("stories")
      .update({
        deleted_at: null,
        status: "draft",
        visibility: "private"
      })
      .eq("id", storyId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(studioPath("/stories"));
    return { ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể khôi phục truyện."
    };
  }
}

export async function restoreStudioChapterAction(
  storyId: string,
  episodeId: string
): Promise<ActionResult> {
  const { creatorProfile, error } = await getStudioAccess(
    studioPath(`/stories/${storyId}/chapters`)
  );

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const db = await createClient();
    const { data: episode, error: fetchError } = await db
      .from("episodes")
      .select("id, deleted_at, stories!inner(creator_id)")
      .eq("id", episodeId)
      .eq("story_id", storyId)
      .eq("stories.creator_id", creatorProfile.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!episode) {
      return { ok: false, error: "Không tìm thấy chương." };
    }

    if (!episode.deleted_at) {
      return { ok: false, error: "Chương không ở trạng thái đã xoá." };
    }

    const deletedAt = new Date(episode.deleted_at).getTime();
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    if (Date.now() - deletedAt > threeDays) {
      return {
        ok: false,
        error: "Đã quá thời hạn khôi phục (3 ngày). Chương đã bị xoá vĩnh viễn."
      };
    }

    const { error: updateError } = await db
      .from("episodes")
      .update({
        deleted_at: null,
        status: "draft"
      })
      .eq("id", episodeId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(studioPath(`/stories/${storyId}/chapters`));
    return { ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể khôi phục chương."
    };
  }
}
