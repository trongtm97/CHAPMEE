"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { awardBadge } from "@/lib/supabase/badges";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { resolveUniqueStorySlug } from "@/lib/creator/resolve-unique-story-slug";
import { parseStoryFormData } from "@/lib/creator/storyFormValidation";
import { completeStoryImageUpload } from "@/lib/images/complete-story-image-upload";
import { DEFAULT_FOCAL_POINT } from "@/lib/images/parse-focal-point";
import { validateStoryImageFileMeta } from "@/lib/images/validate-image-upload";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { persistStoryTaxonomyFromForm } from "@/lib/creator/persist-story-taxonomy";
import { createClient } from "@/lib/supabase/server";
import {
  parseStandaloneContentFromForm,
  resolveStandaloneStoryContentPersist
} from "@/lib/creator/persist-standalone-story-content";
import { isStandaloneStory } from "@/lib/stories/story-structure";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { getStoryUrl } from "@/lib/urls/paths";

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
  const uniqueSlug = await resolveUniqueStorySlug(supabase, parsed.values.slug);
  const publicCode = await generateNumericPublicCode(supabase, "story");
  const { data: story, error } = await supabase
    .from("stories")
    .insert({
      creator_id: creatorProfile.id,
      owner_user_id: user.id,
      title: parsed.values.title,
      slug: uniqueSlug,
      public_code: publicCode,
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
      structure_type: parsed.values.structureType,
      status
    })
    .select("id, slug")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Slug này đã được dùng. Hãy chọn slug khác."
          : error.message
    };
  }

  await supabase
    .from("stories")
    .update({
      canonical_url: getStoryUrl({
        slug: uniqueSlug,
        public_code: publicCode
      })
    })
    .eq("id", story.id);

  if (parsed.values.useTaxonomy) {
    const taxonomyPersist = await persistStoryTaxonomyFromForm(
      supabase,
      story.id,
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
      error: "Hệ thống taxonomy chưa sẵn sàng — không thể tạo truyện."
    };
  }

  const coverFile = formData.get("cover_file");
  if (coverFile instanceof File && coverFile.size > 0) {
    const metaError = validateStoryImageFileMeta(coverFile);
    if (metaError) {
      return { error: metaError };
    }

    try {
      const fileBuffer = Buffer.from(await coverFile.arrayBuffer());
      await completeStoryImageUpload({
        supabase,
        storyId: story.id,
        imageId: randomUUID(),
        fileBuffer,
        focal: DEFAULT_FOCAL_POINT
      });
    } catch {
      return {
        error: "Truyện đã tạo nhưng không tải được ảnh bìa. Vào chỉnh sửa truyện để thử lại."
      };
    }
  }

  if (isStandaloneStory({ structureType: parsed.values.structureType })) {
    const standaloneInput = parseStandaloneContentFromForm(formData);
    if (
      standaloneInput.content ||
      standaloneInput.structuredContent
    ) {
      const standalonePersist = await resolveStandaloneStoryContentPersist(
        supabase,
        {
          storyId: story.id,
          ...standaloneInput,
          storyContentWarningsConfirmed:
            parsed.values.taxonomy.contentWarningsConfirmed,
          strictPublish: parsed.values.intent === "review"
        }
      );

      await supabase
        .from("stories")
        .update({
          ...standalonePersist,
          content_format: parsed.values.taxonomy.presentationMode ?? standalonePersist.content_format
        })
        .eq("id", story.id);
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

  const postCreatePath = String(formData.get("post_create_path") ?? "").trim();
  const firstChapterTitle = String(formData.get("first_chapter_title") ?? "").trim();
  const titleQuery = firstChapterTitle
    ? `?title=${encodeURIComponent(firstChapterTitle)}`
    : "";

  let redirectPath: string;

  if (isStandaloneStory({ structureType: parsed.values.structureType })) {
    const goContent =
      postCreatePath === "standalone_composer" ||
      postCreatePath === "standalone_plain" ||
      parsed.values.intent === "create_and_chapter";
    redirectPath = goContent
      ? `${returnBasePath}/stories/${story.id}/content`
      : `${returnBasePath}/stories/${story.id}/edit`;
  } else {
    const goChapter =
      parsed.values.intent === "create_and_chapter" ||
      postCreatePath === "first_chapter_composer" ||
      postCreatePath === "first_chapter_plain";
    redirectPath = goChapter
      ? `${returnBasePath}/stories/${story.id}/chapters/new${titleQuery}`
      : `${returnBasePath}/stories/${story.id}/edit`;
  }

  redirect(redirectPath);
}
