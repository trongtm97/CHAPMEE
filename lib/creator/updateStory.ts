"use server";

import { redirect } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { parseStoryFormData } from "@/lib/creator/storyFormValidation";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { createClient } from "@/lib/supabase/server";

import type { StoryFormActionState } from "@/lib/creator/createStory";

function nextStatus(
  currentStatus: CreatorStoryStatus,
  intent: "draft" | "review"
): CreatorStoryStatus {
  if (intent === "review") {
    return "pending";
  }

  if (currentStatus === "approved" || currentStatus === "published") {
    return currentStatus;
  }

  return "draft";
}

export async function updateStoryAction(
  _previousState: StoryFormActionState,
  formData: FormData
): Promise<StoryFormActionState> {
  const storyId = String(formData.get("story_id") ?? "").trim();
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect(`/login?next=${returnBasePath}/stories/${storyId}/edit`);
  }

  if (!creatorProfile) {
    redirect("/studio/setup");
  }

  try {
    await assertActionAccess("story.update.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { error: error.message };
    }
    throw error;
  }

  const parsed = parseStoryFormData(formData);

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const publishCheck = await assertNotRestricted(
    user.id,
    "story_publish_block",
    "Bạn đang bị hạn chế đăng truyện. Xem /me/account-status."
  );
  if (!publishCheck.ok) {
    return { error: publishCheck.error };
  }

  if (parsed.values.intent === "review") {
    try {
      await assertAnyPermission(["story.publish.own", "story.update.own"]);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Bạn không có quyền gửi truyện duyệt."
      };
    }
  }

  const supabase = await createClient();
  const existingStory = await assertCreatorOwnsStory(creatorProfile, storyId);

  const status = nextStatus(
    existingStory.status as CreatorStoryStatus,
    parsed.values.intent
  );

  const { error } = await supabase
    .from("stories")
    .update({
      title: parsed.values.title,
      slug: parsed.values.slug,
      hook: parsed.values.hook,
      short_description: parsed.values.shortDescription,
      long_description: parsed.values.longDescription,
      cover_url: parsed.values.coverUrl,
      genre_id: parsed.values.genreId,
      visibility: parsed.values.visibility,
      is_completed: parsed.values.isCompleted,
      age_rating: parsed.values.ageRating,
      sensitive_flags: parsed.values.sensitiveFlags,
      canonical_url: parsed.values.canonicalUrl,
      seo_description: parsed.values.seoDescription,
      seo_keywords: parsed.values.seoKeywords,
      seo_title: parsed.values.seoTitle,
      status
    })
    .eq("id", storyId)
    .eq("creator_id", creatorProfile.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Slug này đã được dùng. Hãy chọn slug khác."
          : error.message
    };
  }

  const { error: deleteTagsError } = await supabase
    .from("story_tags")
    .delete()
    .eq("story_id", storyId);

  if (deleteTagsError) {
    return { error: deleteTagsError.message };
  }

  if (parsed.values.tagIds.length > 0) {
    const { error: insertTagsError } = await supabase.from("story_tags").insert(
      parsed.values.tagIds.map((tagId) => ({
        story_id: storyId,
        tag_id: tagId
      }))
    );

    if (insertTagsError) {
      return { error: insertTagsError.message };
    }
  }

  redirect(`${returnBasePath}/stories/${storyId}/edit`);
}
