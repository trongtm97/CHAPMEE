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
import { persistStoryTaxonomyFromForm } from "@/lib/creator/persist-story-taxonomy";
import { canChangeStoryStructure } from "@/lib/stories/story-structure";
import {
  parseStandaloneContentFromForm,
  resolveStandaloneStoryContentPersist
} from "@/lib/creator/persist-standalone-story-content";
import { createClient } from "@/lib/supabase/server";
import {
  recordSlugHistory,
  registerSlugChangeRedirects
} from "@/lib/urls/redirects";
import { getLegacyStoryPath, getStoryUrl } from "@/lib/urls/paths";

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

  const slugChanged = existingStory.slug !== parsed.values.slug;
  const newCanonicalPath = slugChanged
    ? getStoryUrl({
        slug: parsed.values.slug,
        public_code: (existingStory as { public_code?: string }).public_code ?? ""
      })
    : null;

  const submitIntent =
    parsed.values.intent === "review" ? "review" : "draft";
  const status = nextStatus(
    existingStory.status as CreatorStoryStatus,
    submitIntent
  );

  const storyPatch: Record<string, unknown> = {
    title: parsed.values.title,
    slug: parsed.values.slug,
    hook: parsed.values.hook,
    short_description: parsed.values.shortDescription,
    long_description: parsed.values.longDescription,
    cover_url: parsed.values.coverUrl,
    visibility: parsed.values.visibility,
    is_completed: parsed.values.isCompleted,
    age_rating: parsed.values.ageRating,
    sensitive_flags: parsed.values.sensitiveFlags,
    canonical_url: parsed.values.canonicalUrl,
    seo_description: parsed.values.seoDescription,
    seo_keywords: parsed.values.seoKeywords,
    seo_title: parsed.values.seoTitle,
    status
  };

  const existingStructureType = String(
    (existingStory as { structure_type?: string }).structure_type ?? "chaptered"
  );
  if (
    parsed.values.structureType !== existingStructureType &&
    canChangeStoryStructure({
      structureType: existingStructureType === "standalone" ? "standalone" : "chaptered",
      status: existingStory.status,
      contentFormat: null,
      standaloneContentJson: null,
      standalonePlainText: null,
      standaloneWordCount: 0,
      standaloneReadingTimeMinutes: 0,
      standalonePublishedAt: null,
      standaloneUpdatedAt: null,
      episodeCount: 0
    })
  ) {
    storyPatch.structure_type = parsed.values.structureType;
  }

  const { error } = await supabase
    .from("stories")
    .update(storyPatch)
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

  if (slugChanged && newCanonicalPath) {
    const oldPath = getLegacyStoryPath(existingStory.slug);
    const storyPublicCode = String(
      (existingStory as { public_code?: string }).public_code ?? ""
    );
    const canonicalPath =
      storyPublicCode && parsed.values.slug
        ? getStoryUrl({ slug: parsed.values.slug, public_code: storyPublicCode })
        : newCanonicalPath;

    await supabase
      .from("stories")
      .update({ canonical_url: canonicalPath, slug_updated_at: new Date().toISOString() })
      .eq("id", storyId);

    await recordSlugHistory({
      entityType: "story",
      entityId: storyId,
      oldSlug: existingStory.slug,
      newSlug: parsed.values.slug,
      oldPath,
      newPath: canonicalPath,
      changedBy: user.id
    });

    await registerSlugChangeRedirects({
      entityType: "story",
      entityId: storyId,
      oldPath,
      newCanonicalPath: canonicalPath,
      changedBy: user.id
    });
  } else if (parsed.values.title !== existingStory.title) {
    await supabase
      .from("stories")
      .update({ title_updated_at: new Date().toISOString() })
      .eq("id", storyId);
  }

  if (parsed.values.useTaxonomy) {
    const taxonomyPersist = await persistStoryTaxonomyFromForm(
      supabase,
      storyId,
      {
        taxonomyTermIds: parsed.values.taxonomy.taxonomyTermIds,
        presentationMode: parsed.values.taxonomy.presentationMode,
        formatTemplateId: parsed.values.taxonomy.formatTemplateId,
        contentWarningsConfirmed: parsed.values.taxonomy.contentWarningsConfirmed,
        ageRating: parsed.values.ageRating,
        forPublish: parsed.values.intent === "review"
      }
    );

    if (!taxonomyPersist.ok) {
      return { error: taxonomyPersist.error ?? "Không lưu được taxonomy." };
    }
  } else if (parsed.values.intent !== "draft") {
    return {
      error: "Hệ thống taxonomy chưa sẵn sàng — không thể cập nhật truyện."
    };
  }

  redirect(`${returnBasePath}/stories/${storyId}/edit`);
}
