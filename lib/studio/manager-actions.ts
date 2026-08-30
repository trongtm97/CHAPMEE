"use server";

import { revalidatePath } from "next/cache";
import { publishCreatorStory } from "@/lib/creator/publish-creator-story";
import { createClient } from "@/lib/data/server";
import { normalizeStoryCoverForStorage } from "@/lib/media/media-url";
import { copyStoryTaxonomyFromStory } from "@/lib/taxonomy/story-taxonomy";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioPath } from "@/lib/studio/constants";

type ActionResult = {
  ok: boolean;
  error?: string;
};

async function getOwnedStory(storyId: string, creatorId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("stories")
    .select("id, status, creator_id, title, slug")
    .eq("id", storyId)
    .eq("creator_id", creatorId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getOwnedStoryForDuplicate(storyId: string, creatorId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("stories")
    .select(
      "id, title, slug, hook, short_description, long_description, cover_url, visibility, is_completed, age_rating, sensitive_flags, canonical_url, seo_description, seo_keywords, seo_title"
    )
    .eq("id", storyId)
    .eq("creator_id", creatorId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function storyHasEngagement(storyId: string) {
  const db = await createClient();

  const [reads, comments, reactions, progress] = await Promise.all([
    db
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("target_id", storyId)
      .eq("event_name", "open_story"),
    db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId),
    db
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("target_id", storyId)
      .eq("target_type", "story"),
    db
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
  const db = await createClient();

  const [reads, comments, reactions] = await Promise.all([
    db
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("target_id", episodeId)
      .in("event_name", ["chapter_opened", "complete_chap"]),
    db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("episode_id", episodeId),
    db
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

    const db = await createClient();
    const { error: updateError } = await db
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

    const db = await createClient();
    const { error: updateError } = await db
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

    const db = await createClient();
    const { error: updateError } = await db
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

    const db = await createClient();
    const { error: updateError } = await db
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
  const { creatorProfile, error, user } = await getStudioAccess(studioPath("/stories"));

  if (error || !creatorProfile) {
    return { ok: false, error: error ?? "Không có quyền truy cập Studio." };
  }

  try {
    const db = await createClient();
    const result = await publishCreatorStory(db, {
      authorDisplayName: creatorProfile.display_name,
      creatorId: creatorProfile.id,
      notify: Boolean(user?.id),
      storyId,
      userId: user?.id
    });

    if (!result.ok) {
      return result;
    }

    if (!user?.id) {
      revalidatePath(studioPath("/stories"));
      revalidatePath("/admin/content");
    }

    return { ok: true };
  } catch (actionError) {
    return {
      ok: false,
      error:
        actionError instanceof Error
          ? actionError.message
          : "Không thể đăng lại."
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

    const duplicateCover = normalizeStoryCoverForStorage(source.cover_url);
    const duplicateCoverKey =
      duplicateCover.kind === "object_key" ? duplicateCover.objectKey : null;

    const db = await createClient();
    const { data: created, error: insertError } = await db
      .from("stories")
      .insert({
        age_rating: source.age_rating,
        canonical_url: null,
        cover_url: duplicateCoverKey,
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

    if (insertError || !created) {
      throw new Error(insertError?.message ?? "Không nhân bản được truyện.");
    }

    const copyTaxonomy = await copyStoryTaxonomyFromStory(
      db,
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
  const { softDeleteStudioStoryAction } = await import(
    "@/lib/studio/soft-delete-actions"
  );
  return softDeleteStudioStoryAction(storyId);
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
    const db = await createClient();
    const { data: episode, error: fetchError } = await db
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

    const { error: updateError } = await db
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
  const { softDeleteStudioChapterAction } = await import(
    "@/lib/studio/soft-delete-actions"
  );
  return softDeleteStudioChapterAction(storyId, episodeId);
}
