"use server";

import { redirect } from "next/navigation";
import { awardBadge } from "@/lib/supabase/badges";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { parseStoryFormData } from "@/lib/creator/storyFormValidation";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { createClient } from "@/lib/supabase/server";

export type StoryFormActionState = {
  error: string | null;
};

export async function createStoryAction(
  _previousState: StoryFormActionState,
  formData: FormData
): Promise<StoryFormActionState> {
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect(`/login?next=${returnBasePath}/stories/new`);
  }

  if (!creatorProfile) {
    redirect("/studio/setup");
  }

  try {
    await assertActionAccess("story.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { error: error.message };
    }
    throw error;
  }

  const publishCheck = await assertNotRestricted(
    user.id,
    "story_publish_block",
    "Bạn đang bị hạn chế đăng truyện. Xem trạng thái tài khoản tại /me/account-status."
  );
  if (!publishCheck.ok) {
    return { error: publishCheck.error };
  }

  const parsed = parseStoryFormData(formData);

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const status = parsed.values.intent === "review" ? "pending" : "draft";
  const { data: story, error } = await supabase
    .from("stories")
    .insert({
      creator_id: creatorProfile.id,
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
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Slug này đã được dùng. Hãy chọn slug khác."
          : error.message
    };
  }

  if (parsed.values.tagIds.length > 0) {
    const { error: tagError } = await supabase.from("story_tags").insert(
      parsed.values.tagIds.map((tagId) => ({
        story_id: story.id,
        tag_id: tagId
      }))
    );

    if (tagError) {
      return { error: tagError.message };
    }
  }

  await awardBadge({
    userId: user.id,
    badgeKey: "first_story",
    metadata: {
      story_id: story.id,
      story_title: parsed.values.title
    },
    relatedStoryId: story.id
  });

  redirect(`${returnBasePath}/stories/${story.id}/edit`);
}
