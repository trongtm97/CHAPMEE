"use server";

import { redirect } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
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
import { createClient } from "@/lib/data/server";
import {
  recordSlugHistory,
  registerSlugChangeRedirects
} from "@/lib/urls/redirects";
import { getLegacyStoryPath, getStoryUrl } from "@/lib/urls/paths";
import { ensureStoryPublicUrl } from "@/lib/stories/ensure-story-public-url";
import { getStoryMonetizationCapabilities } from "@/lib/content-origin/content-origin-policy";
import { afterStorySubmittedForReview } from "@/lib/creator/after-story-review-submitted";
import {
  ingestImportStoryCoverFromUrl
} from "@/lib/studio/ingest-import-cover-url";
import { normalizeStoryCoverForStorage } from "@/lib/media/media-url";

import type { StoryFormActionState } from "@/lib/creator/createStory";

function nextStatus(
  currentStatus: CreatorStoryStatus,
  intent: "draft" | "review"
): CreatorStoryStatus {
  if (intent === "review") {
    return "published";
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
  const { creatorProfile, user } = await requireCreatorProfile(
    `${returnBasePath}/stories/${storyId}/edit`
  );

  try {
    await assertActionAccess("story.update.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { error: error.message };
    }
    throw error;
  }

  // Disabled inputs are omitted from FormData; keep existing slug when editing.
  if (storyId && !String(formData.get("slug") ?? "").trim()) {
    const db = await createClient();
    const { data: existingSlugRow } = await db
      .from("stories")
      .select("slug")
      .eq("id", storyId)
      .eq("creator_id", creatorProfile.id)
      .maybeSingle();

    if (existingSlugRow?.slug) {
      formData.set("slug", existingSlugRow.slug);
    }
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
            : "Bạn không có quyền đăng truyện."
      };
    }
  }

  const db = await createClient();
  const existingStory = await assertCreatorOwnsStory(creatorProfile, storyId);
  const { data: existingOriginRow } = await db
    .from("stories")
    .select("rights_status, monetization_policy, content_origin")
    .eq("id", storyId)
    .maybeSingle();
  const currentContentOrigin = String(
    (existingStory as { content_origin?: string | null }).content_origin ?? "original"
  );
  const nextContentOrigin = parsed.values.contentOrigin;
  const nextRightsStatus =
    nextContentOrigin === "translation"
      ? currentContentOrigin === "translation"
        ? (existingOriginRow?.rights_status ?? "pending_review")
        : "pending_review"
      : "unverified";
  const nextMonetizationPolicy =
    nextContentOrigin === "translation"
      ? "free_only"
      : currentContentOrigin === "original"
        ? (existingOriginRow?.monetization_policy ?? "full")
        : "full";

  if (
    currentContentOrigin === "translation" &&
    nextContentOrigin === "original" &&
    (existingStory.status === "published" || existingStory.status === "approved")
  ) {
    return {
      error:
        "Không thể tự chuyển Truyện Dịch đã xuất bản thành Truyện Sáng Tác. Vui lòng liên hệ admin để review quyền."
    };
  }

  if (currentContentOrigin !== "translation" && nextContentOrigin === "translation") {
    const { count: paidChapterCount } = await db
      .from("chapter_monetization_settings")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId)
      .eq("is_paid", true);

    const { data: bundleSetting } = await db
      .from("story_monetization_settings")
      .select("full_access_enabled")
      .eq("story_id", storyId)
      .maybeSingle();

    if ((paidChapterCount ?? 0) > 0 || Boolean(bundleSetting?.full_access_enabled)) {
      return {
        error:
          "Truyện đang có cấu hình trả phí. Vui lòng tắt paid chapters/bundle và xử lý hoàn tiền thủ công trước khi đổi sang Truyện Dịch."
      };
    }
  }

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

  const coverNormalized = parsed.values.coverUrl
    ? normalizeStoryCoverForStorage(parsed.values.coverUrl)
    : { kind: "empty" as const };
  const coverKey =
    coverNormalized.kind === "object_key" ? coverNormalized.objectKey : null;
  const pendingExternalCoverUrl =
    coverNormalized.kind === "ingest" ? coverNormalized.url : null;

  const storyPatch: Record<string, unknown> = {
    title: parsed.values.title,
    slug: parsed.values.slug,
    hook: parsed.values.hook,
    short_description: parsed.values.shortDescription,
    long_description: parsed.values.longDescription,
    ...(coverKey ? { cover_url: coverKey } : {}),
    visibility: parsed.values.visibility,
    is_completed: parsed.values.isCompleted,
    age_rating: parsed.values.ageRating,
    sensitive_flags: parsed.values.sensitiveFlags,
    canonical_url: parsed.values.canonicalUrl,
    seo_description: parsed.values.seoDescription,
    seo_keywords: parsed.values.seoKeywords,
    seo_title: parsed.values.seoTitle,
    content_origin: parsed.values.contentOrigin,
    translation_type: parsed.values.translationType,
    rights_status: nextRightsStatus,
    monetization_policy: nextMonetizationPolicy,
    original_language: parsed.values.originalLanguage,
    translated_language: parsed.values.translatedLanguage,
    source_title: parsed.values.sourceTitle,
    source_author_name: parsed.values.sourceAuthorName,
    source_url: parsed.values.sourceUrl,
    source_platform: parsed.values.sourcePlatform,
    license_note: parsed.values.licenseNote,
    license_document_media_id: parsed.values.licenseDocumentMediaId,
    status,
    ...(submitIntent === "review"
      ? { published_at: new Date().toISOString() }
      : {})
  };
  const originCapabilities = getStoryMonetizationCapabilities({
    content_origin: parsed.values.contentOrigin,
    monetization_policy: nextMonetizationPolicy,
    rights_status: nextRightsStatus
  });
  storyPatch.must_be_free_to_read = originCapabilities.mustBeFreeToRead;
  storyPatch.can_sell_chapters = originCapabilities.canSellChapters;
  storyPatch.can_sell_story_bundle = originCapabilities.canSellStoryBundle;
  storyPatch.can_receive_tips = originCapabilities.canReceiveTips;
  storyPatch.can_share_ads_revenue = originCapabilities.canShareAdsRevenue;
  storyPatch.can_join_boost_campaign = originCapabilities.canJoinBoostCampaign;

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

  const { error } = await db
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

  if (pendingExternalCoverUrl) {
    try {
      await ingestImportStoryCoverFromUrl(db, storyId, pendingExternalCoverUrl);
    } catch (coverError) {
      console.error("[updateStory] external cover ingest failed", coverError);
    }
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

    await db
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
    await db
      .from("stories")
      .update({ title_updated_at: new Date().toISOString() })
      .eq("id", storyId);
  }

  if (parsed.values.useTaxonomy) {
    const shouldPersistTaxonomy =
      parsed.values.intent !== "draft" ||
      parsed.values.taxonomy.taxonomyTermIds.length > 0;

    if (shouldPersistTaxonomy) {
      const taxonomyPersist = await persistStoryTaxonomyFromForm(
        db,
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
    }
  } else if (parsed.values.intent !== "draft") {
    return {
      error: "Hệ thống taxonomy chưa sẵn sàng — không thể cập nhật truyện."
    };
  }

  if (parsed.values.intent === "review") {
    await ensureStoryPublicUrl(db, storyId);
    await afterStorySubmittedForReview({
      userId: user.id,
      storyId,
      storyTitle: parsed.values.title
    });
    redirect(`${returnBasePath}/stories/${storyId}/edit?review_submitted=1`);
  }

  redirect(`${returnBasePath}/stories/${storyId}/edit`);
}
