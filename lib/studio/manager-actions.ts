"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioPath } from "@/lib/studio/constants";

type ActionResult = {
  ok: boolean;
  error?: string;
};

async function getOwnedStory(storyId: string, creatorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, status, creator_id")
    .eq("id", storyId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function storyHasEngagement(storyId: string) {
  const supabase = await createClient();

  const [reads, comments, reactions, progress] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("target_id", storyId)
      .eq("event_name", "open_story"),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId),
    supabase
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("target_id", storyId)
      .eq("target_type", "story"),
    supabase
      .from("reading_progress")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId)
  ]);

  const total =
    (reads.count ?? 0) +
    (comments.count ?? 0) +
    (reactions.count ?? 0) +
    (progress.count ?? 0);

  return total > 0;
}

async function episodeHasEngagement(episodeId: string) {
  const supabase = await createClient();

  const [reads, comments, reactions] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("target_id", episodeId)
      .in("event_name", ["chapter_opened", "complete_chap"]),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("episode_id", episodeId),
    supabase
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("target_id", episodeId)
      .eq("target_type", "episode")
  ]);

  const total =
    (reads.count ?? 0) + (comments.count ?? 0) + (reactions.count ?? 0);

  return total > 0;
}

export async function hideStudioStoryAction(storyId: string): Promise<ActionResult> {
  const { creatorProfile, error } = await getStudioAccess(studioPath("/stories"));

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const story = await getOwnedStory(storyId, creatorProfile.id);

    if (!story) {
      return { ok: false, error: "Không tìm thấy truyện." };
    }

    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("stories")
      .update({ status: "archived", visibility: "private" })
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
          : "Không thể ẩn truyện."
    };
  }
}

export async function deleteDraftStudioStoryAction(
  storyId: string
): Promise<ActionResult> {
  const { creatorProfile, error } = await getStudioAccess(studioPath("/stories"));

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const story = await getOwnedStory(storyId, creatorProfile.id);

    if (!story) {
      return { ok: false, error: "Không tìm thấy truyện." };
    }

    if (story.status !== "draft") {
      return { ok: false, error: "Chỉ có thể xóa truyện ở trạng thái nháp." };
    }

    if (await storyHasEngagement(storyId)) {
      return {
        ok: false,
        error: "Truyện đã có tương tác — hãy ẩn thay vì xóa."
      };
    }

    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from("stories")
      .delete()
      .eq("id", storyId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath(studioPath("/stories"));
    return { ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể xóa truyện nháp."
    };
  }
}

export async function hideStudioChapterAction(
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
    const supabase = await createClient();
    const { data: episode, error: fetchError } = await supabase
      .from("episodes")
      .select("id, status, stories!inner(creator_id)")
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

    const { error: updateError } = await supabase
      .from("episodes")
      .update({ status: "archived" })
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
          : "Không thể ẩn chương."
    };
  }
}

export async function deleteDraftStudioChapterAction(
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
    const supabase = await createClient();
    const { data: episode, error: fetchError } = await supabase
      .from("episodes")
      .select("id, status, stories!inner(creator_id)")
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

    if (episode.status !== "draft") {
      return { ok: false, error: "Chỉ có thể xóa chương ở trạng thái nháp." };
    }

    if (await episodeHasEngagement(episodeId)) {
      return {
        ok: false,
        error: "Chương đã có tương tác — hãy ẩn thay vì xóa."
      };
    }

    const { error: deleteError } = await supabase
      .from("episodes")
      .delete()
      .eq("id", episodeId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath(studioPath(`/stories/${storyId}/chapters`));
    return { ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể xóa chương nháp."
    };
  }
}
