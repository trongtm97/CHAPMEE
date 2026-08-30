"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { awardBadge } from "@/lib/data/badges";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
import { resolveUniqueStorySlug } from "@/lib/creator/resolve-unique-story-slug";
import { parseStoryFormData } from "@/lib/creator/storyFormValidation";
import { completeStoryImageUpload } from "@/lib/images/complete-story-image-upload";
import { DEFAULT_FOCAL_POINT } from "@/lib/images/parse-focal-point";
import { validateStoryImageFileMeta } from "@/lib/images/validate-image-upload";
import {
  ingestImportStoryCoverFromUrl
} from "@/lib/studio/ingest-import-cover-url";
import { normalizeStoryCoverForStorage } from "@/lib/media/media-url";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { persistStoryTaxonomyFromForm } from "@/lib/creator/persist-story-taxonomy";
import { createClient } from "@/lib/data/server";
import {
  parseStandaloneContentFromForm,
  resolveStandaloneStoryContentPersist
} from "@/lib/creator/persist-standalone-story-content";
import { isStandaloneStory } from "@/lib/stories/story-structure";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { getStoryUrl } from "@/lib/urls/paths";
import { getStoryMonetizationCapabilities } from "@/lib/content-origin/content-origin-policy";
import { afterStorySubmittedForReview } from "@/lib/creator/after-story-review-submitted";

export type StoryFormActionState = {
  error: string | null;
};

export async function createStoryAction(
  _previousState: StoryFormActionState,
  formData: FormData
): Promise<StoryFormActionState> {
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile, user } = await requireCreatorProfile(
    `${returnBasePath}/stories/new`
  );

  try {
    await assertActionAccess("story.create");
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

  if (parsed.values.intent === "review") {
    const publishCheck = await assertNotRestricted(
      user.id,
      "story_publish_block",
      "Bạn đang bị hạn chế đăng truyện. Xem trạng thái tài khoản tại /me/account-status."
    );
    if (!publishCheck.ok) {
      return { error: publishCheck.error };
    }
  }

  const db = await createClient();
  const status =
    parsed.values.intent === "review" ? "published" : "draft";
  const uniqueSlug = await resolveUniqueStorySlug(db, parsed.values.slug);
  const publicCode = await generateNumericPublicCode(db, "story");
  const originCapabilities = getStoryMonetizationCapabilities({
    content_origin: parsed.values.contentOrigin,
    monetization_policy: parsed.values.monetizationPolicy,
    rights_status: parsed.values.rightsStatus
  });
  const coverNormalized = parsed.values.coverUrl
    ? normalizeStoryCoverForStorage(parsed.values.coverUrl)
    : { kind: "empty" as const };
  const coverKey =
    coverNormalized.kind === "object_key" ? coverNormalized.objectKey : null;
  const pendingExternalCoverUrl =
    coverNormalized.kind === "ingest" ? coverNormalized.url : null;

  const { data: story, error } = await db
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
      cover_url: coverKey,
      visibility: parsed.values.visibility,
      is_completed: parsed.values.isCompleted,
      age_rating: parsed.values.ageRating,
      sensitive_flags: parsed.values.sensitiveFlags,
      canonical_url: parsed.values.canonicalUrl,
      seo_description: parsed.values.seoDescription,
      seo_keywords: parsed.values.seoKeywords,
      seo_title: parsed.values.seoTitle,
      structure_type: parsed.values.structureType,
      content_origin: parsed.values.contentOrigin,
      translation_type: parsed.values.translationType,
      rights_status: parsed.values.rightsStatus,
      monetization_policy: parsed.values.monetizationPolicy,
      original_language: parsed.values.originalLanguage,
      translated_language: parsed.values.translatedLanguage,
      source_title: parsed.values.sourceTitle,
      source_author_name: parsed.values.sourceAuthorName,
      source_url: parsed.values.sourceUrl,
      source_platform: parsed.values.sourcePlatform,
      license_note: parsed.values.licenseNote,
      license_document_media_id: parsed.values.licenseDocumentMediaId,
      must_be_free_to_read: originCapabilities.mustBeFreeToRead,
      can_sell_chapters: originCapabilities.canSellChapters,
      can_sell_story_bundle: originCapabilities.canSellStoryBundle,
      can_receive_tips: originCapabilities.canReceiveTips,
      can_share_ads_revenue: originCapabilities.canShareAdsRevenue,
      can_join_boost_campaign: originCapabilities.canJoinBoostCampaign,
      status,
      published_at:
        parsed.values.intent === "review" ? new Date().toISOString() : null
    })
    .select("id, slug")
    .single();

  if (error || !story) {
    return {
      error:
        error?.code === "23505"
          ? "Slug này đã được dùng. Hãy chọn slug khác."
          : error?.message ?? "Không tạo được truyện."
    };
  }

  await db
    .from("stories")
    .update({
      canonical_url: getStoryUrl({
        slug: uniqueSlug,
        public_code: publicCode
      })
    })
    .eq("id", story.id);

  const shouldPersistTaxonomy =
    parsed.values.useTaxonomy &&
    (parsed.values.intent !== "draft" ||
      parsed.values.taxonomy.taxonomyTermIds.length > 0);

  if (shouldPersistTaxonomy) {
    const taxonomyPersist = await persistStoryTaxonomyFromForm(
      db,
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
        db,
        storyId: story.id,
        imageId: randomUUID(),
        fileBuffer,
        focal: DEFAULT_FOCAL_POINT
      });
    } catch (uploadError) {
      console.error("[createStory] cover upload failed", uploadError);
      return {
        error:
          uploadError instanceof Error &&
          uploadError.message.includes("storage")
            ? "Truyện đã tạo nhưng không tải được ảnh bìa (lỗi storage). Vào chỉnh sửa truyện để thử lại."
            : "Truyện đã tạo nhưng không tải được ảnh bìa. Vào chỉnh sửa truyện để thử lại."
      };
    }
  } else if (pendingExternalCoverUrl) {
    try {
      await ingestImportStoryCoverFromUrl(db, story.id, pendingExternalCoverUrl);
    } catch (uploadError) {
      console.error("[createStory] external cover ingest failed", uploadError);
    }
  }

  if (isStandaloneStory({ structureType: parsed.values.structureType })) {
    const standaloneInput = parseStandaloneContentFromForm(formData);
    if (
      standaloneInput.content ||
      standaloneInput.structuredContent
    ) {
      const standalonePersist = await resolveStandaloneStoryContentPersist(
        db,
        {
          storyId: story.id,
          ...standaloneInput,
          storyContentWarningsConfirmed:
            parsed.values.taxonomy.contentWarningsConfirmed,
          strictPublish: parsed.values.intent === "review"
        }
      );

      await db
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

  if (parsed.values.intent === "review") {
    await afterStorySubmittedForReview({
      userId: user.id,
      storyId: story.id,
      storyTitle: parsed.values.title
    });
  }

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

  const finalRedirectPath =
    parsed.values.intent === "review"
      ? `${redirectPath}${redirectPath.includes("?") ? "&" : "?"}review_submitted=1`
      : redirectPath;

  redirect(finalRedirectPath);
}
