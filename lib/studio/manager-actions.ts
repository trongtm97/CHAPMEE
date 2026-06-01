"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { copyStoryTaxonomyFromStory } from "@/lib/taxonomy/story-taxonomy";
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
    .select("id, status, creator_id, title, slug")
    .eq("id", storyId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getOwnedStoryForDuplicate(storyId: string, creatorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, title, slug, hook, short_description, long_description, cover_url, visibility, is_completed, age_rating, sensitive_flags, canonical_url, seo_description, seo_keywords, seo_title"
    )
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

export async function unhideStudioStoryAction(storyId: string): Promise<ActionResult> {
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
      .update({ status: "draft", visibility: "private" })
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
          : "Không thể hiện lại truyện."
    };
  }
}

export async function markCompleteStudioStoryAction(storyId: string): Promise<ActionResult> {
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
      .update({ is_completed: true })
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
          : "Không thể đánh dấu hoàn thành."
    };
  }
}

export async function moveToDraftStudioStoryAction(storyId: string): Promise<ActionResult> {
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
      .update({ status: "draft", visibility: "private" })
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
          : "Không thể chuyển về nháp."
    };
  }
}

export async function submitForReviewStudioStoryAction(storyId: string): Promise<ActionResult> {
  const { creatorProfile, error } = await getStudioAccess(studioPath("/stories"));

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const story = await getOwnedStory(storyId, creatorProfile.id);

    if (!story) {
      return { ok: false, error: "Không tìm thấy truyện." };
    }

    if (story.status !== "rejected" && story.status !== "draft") {
      return { ok: false, error: "Chỉ có thể gửi duyệt lại truyện nháp hoặc cần sửa." };
    }

    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("stories")
      .update({ status: "pending" })
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
          : "Không thể gửi duyệt lại."
    };
  }
}

export async function duplicateStudioStoryAction(storyId: string): Promise<
  ActionResult & { newStoryId?: string }
> {
  const { creatorProfile, error } = await getStudioAccess(studioPath("/stories"));

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const source = await getOwnedStoryForDuplicate(storyId, creatorProfile.id);

    if (!source) {
      return { ok: false, error: "Không tìm thấy truyện." };
    }

    const suffix = Date.now().toString(36);
    const baseSlug = String(source.slug ?? "truyen")
      .replace(/-copy-[a-z0-9]+$/i, "")
      .slice(0, 80);
    const newSlug = `${baseSlug}-copy-${suffix}`;
    const newTitle = `${String(source.title)} (Bản sao)`;

    const supabase = await createClient();
    const { data: created, error: insertError } = await supabase
      .from("stories")
      .insert({
        age_rating: source.age_rating,
        canonical_url: null,
        cover_url: source.cover_url,
        creator_id: creatorProfile.id,
        hook: source.hook,
        is_completed: false,
        long_description: source.long_description,
        sensitive_flags: source.sensitive_flags,
        seo_description: source.seo_description,
        seo_keywords: source.seo_keywords,
        seo_title: source.seo_title,
        short_description: source.short_description,
        slug: newSlug,
        status: "draft",
        title: newTitle,
        visibility: "private"
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const copyTaxonomy = await copyStoryTaxonomyFromStory(
      supabase,
      storyId,
      created.id as string
    );
    if (!copyTaxonomy.ok) {
      throw new Error(copyTaxonomy.error ?? "Không sao chép được taxonomy.");
    }

    revalidatePath(studioPath("/stories"));
    return { newStoryId: created.id as string, ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể nhân bản truyện."
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
