"use server";

import { revalidatePath } from "next/cache";
import { assertCreatorOwnsEpisode } from "@/lib/creator/assertCreatorOwnsEpisode";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
import { parseEpisodeFormData } from "@/lib/creator/episodeFormValidation";
import { saveEpisodePoll } from "@/lib/data/polls";
import { upsertChapterMonetizationSetting } from "@/lib/data/chapter-monetization";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/data/server";
import { resolveComposerEpisodePersistFields } from "@/lib/creator/resolve-composer-episode-persist";
import type { EpisodeFormActionState } from "@/lib/creator/createEpisode";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { upsertChapterEarlyAccessSetting } from "@/lib/data/early-access";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { persistEpisodeContentToObjectStorage } from "@/lib/chapters/persist-chapter-content";
import { applyChapterReelsPromoFromForm } from "@/lib/creator/apply-chapter-reels-promo-from-form";

export async function updateEpisodeAction(
  _previousState: EpisodeFormActionState,
  formData: FormData
): Promise<EpisodeFormActionState> {
  const storyId = String(formData.get("story_id") ?? "");
  const episodeId = String(formData.get("episode_id") ?? "");
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile, user } = await requireCreatorProfile(
    `${returnBasePath}/stories/${storyId}/chapters/${episodeId}/edit`
  );

  try {
    await assertActionAccess("chapter.update.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { error: error.message };
    }
    throw error;
  }

  const parsed = parseEpisodeFormData(formData);

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const db = await createClient();
  await assertCreatorOwnsEpisode(creatorProfile, storyId, episodeId);
  const [config, creatorCanEarn] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    isCreatorMonetizationAllowed(creatorProfile.user_id)
  ]);

  const { data: currentEpisode } = await db
    .from("episodes")
    .select("status, published_at")
    .eq("id", episodeId)
    .maybeSingle();

  const wasPublished = currentEpisode?.status === "published" || currentEpisode?.status === "approved";
  const isDraftIntent = formData.get("intent") === "draft";

  // Preserve published status when saving draft on an already-published chapter
  const resolvedStatus = isDraftIntent && wasPublished
    ? "published"
    : parsed.values.status;
  const resolvedPublishedAt = isDraftIntent && wasPublished && currentEpisode?.published_at
    ? currentEpisode.published_at
    : parsed.values.status === "published"
      ? new Date().toISOString()
      : null;

  const { data: storyMeta } = await db
    .from("stories")
    .select("content_warnings_confirmed")
    .eq("id", storyId)
    .maybeSingle();

  const strictPublish = resolvedStatus === "published";
  const composerPersist = await resolveComposerEpisodePersistFields(db, {
    content: parsed.values.content,
    contentFormat: parsed.values.contentFormat,
    presentationMode: parsed.values.presentationMode,
    structuredContent: parsed.values.structuredContent,
    storyId,
    strictPublish,
    storyContentWarningsConfirmed: Boolean(storyMeta?.content_warnings_confirmed),
    previewViewed: formData.get("composer_preview_viewed") === "1"
  });

  if (
    strictPublish &&
    parsed.values.contentFormat === "structured_blocks" &&
    composerPersist.validation_status === "invalid"
  ) {
    return {
      error:
        composerPersist.validation_errors[0]?.message ??
        "Nội dung Composer chưa hợp lệ — sửa lỗi trước khi gửi duyệt."
    };
  }

  const { data: existingStorage } = await db
    .from("episodes")
    .select("content_object_key")
    .eq("id", episodeId)
    .eq("story_id", storyId)
    .maybeSingle();

  const objectStorage = await persistEpisodeContentToObjectStorage({
    storyId,
    chapterId: episodeId,
    content: composerPersist.content,
    structuredContent: parsed.values.structuredContent,
    contentFormat: parsed.values.contentFormat,
    excerpt: parsed.values.excerpt,
    previousObjectKey:
      (existingStorage as { content_object_key?: string | null } | null)
        ?.content_object_key ?? null
  });

  if (!objectStorage.ok) {
    return { error: objectStorage.error };
  }

  const { error } = await db
    .from("episodes")
    .update({
      episode_number: parsed.values.episodeNumber,
      title: parsed.values.title,
      seo_description: parsed.values.seoDescription,
      seo_keywords: parsed.values.seoKeywords,
      seo_title: parsed.values.seoTitle,
      status: resolvedStatus,
      published_at: resolvedPublishedAt,
      presentation_mode: parsed.values.chapterPresentationMode,
      content_format: parsed.values.contentFormat,
      validation_status: composerPersist.validation_status,
      validation_errors: composerPersist.validation_errors,
      last_validated_at: composerPersist.last_validated_at,
      ...objectStorage.dbPatch,
      excerpt: parsed.values.excerpt?.trim() || objectStorage.dbPatch.excerpt,
      ...(composerPersist.composer_version
        ? { composer_version: composerPersist.composer_version }
        : {})
    })
    .eq("id", episodeId)
    .eq("story_id", storyId);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Số chap này đã tồn tại trong truyện."
          : error.message
    };
  }

  const monetizationEnabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["paid_chapters.enabled"]);
  const creatorApproved = creatorCanEarn;
  const freeRequired = Number(config.settings["paid_chapters.free_chapters_required"] ?? 0);
  const allowCustomPrice = Boolean(
    config.settings["paid_chapters.allow_creator_custom_price"]
  );
  const minPrice = Number(config.settings["paid_chapters.min_coin_price"] ?? 1);
  const maxPrice = Number(config.settings["paid_chapters.max_coin_price"] ?? 999999);
  const defaultPrice = Number(config.settings["paid_chapters.default_coin_price"] ?? 10);
  const isPaidRequested =
    parsed.values.monetization.isPaid &&
    monetizationEnabled &&
    creatorApproved &&
    parsed.values.episodeNumber > freeRequired;

  if (isPaidRequested) {
    try {
      await assertAnyPermission(["chapter.set_vip", "chapter.update.own"]);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Bạn không có quyền đặt chương trả phí."
      };
    }
  }
  const rawPrice = allowCustomPrice
    ? parsed.values.monetization.coinPrice
    : null;
  const normalizedPrice =
    rawPrice == null ? null : Math.min(maxPrice, Math.max(minPrice, rawPrice));

  const monetizationWrite = await upsertChapterMonetizationSetting({
    chapterId: episodeId,
    storyId,
    creatorUserId: creatorProfile.user_id,
    isPaid: isPaidRequested,
    coinPrice: normalizedPrice ?? defaultPrice,
    freePreviewEnabled: parsed.values.monetization.freePreviewEnabled,
    freePreviewPercent: parsed.values.monetization.freePreviewPercent,
    freePreviewChars: parsed.values.monetization.freePreviewChars
  });
  if (monetizationWrite.error) {
    console.error("[updateEpisode] monetization upsert failed:", monetizationWrite.error);
  }

  const earlyAccessEnabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["early_access.enabled"]);
  const earlyAllowCustomPrice = Boolean(
    config.settings["early_access.allow_creator_custom_price"]
  );
  const earlyMinPrice = Number(config.settings["early_access.min_coin_price"] ?? 1);
  const earlyMaxPrice = Number(config.settings["early_access.max_coin_price"] ?? 999999);
  const earlyDefaultPrice = Number(
    config.settings["early_access.default_coin_price"] ?? 10
  );
  const defaultFreeAfterHours = Number(
    config.settings["early_access.default_free_after_hours"] ?? 24
  );
  const maxEarlyAccessDays = Number(
    config.settings["early_access.max_early_access_days"] ?? 30
  );
  const maxFreeAfterHours = maxEarlyAccessDays * 24;
  const requestedHours = parsed.values.earlyAccess.freeAfterHours ?? defaultFreeAfterHours;
  const boundedHours = Math.min(maxFreeAfterHours, Math.max(1, requestedHours));
  const fallbackFreeAt = new Date(Date.now() + boundedHours * 60 * 60 * 1000).toISOString();
  const earlyPriceRaw = earlyAllowCustomPrice ? parsed.values.earlyAccess.coinPrice : null;
  const earlyPrice = earlyPriceRaw == null
    ? earlyDefaultPrice
    : Math.min(earlyMaxPrice, Math.max(earlyMinPrice, earlyPriceRaw));
  const earlyEnabledRequested =
    parsed.values.earlyAccess.enabled && earlyAccessEnabled && creatorApproved;
  const earlyWrite = await upsertChapterEarlyAccessSetting({
    chapterId: episodeId,
    storyId,
    creatorUserId: creatorProfile.user_id,
    enabled: earlyEnabledRequested,
    coinPrice: earlyPrice,
    freeAt: earlyEnabledRequested
      ? parsed.values.earlyAccess.freeAt ?? fallbackFreeAt
      : null
  });
  if (earlyWrite.error) {
    console.error("[updateEpisode] early access upsert failed:", earlyWrite.error);
  }

  if (parsed.values.poll) {
    const pollResult = await saveEpisodePoll({
      authorId: creatorProfile.user_id,
      chapterId: episodeId,
      optionTexts: parsed.values.poll.optionTexts,
      question: parsed.values.poll.question,
      status: parsed.values.poll.status,
      storyId
    });

    if (pollResult.error) {
      return { error: pollResult.error };
    }
  }

  try {
    await applyChapterReelsPromoFromForm(db, {
      chapterId: episodeId,
      chapterStatus: resolvedStatus,
      chapterTitle: parsed.values.title,
      formData,
      ownerProfileId: user.id,
      storyId
    });
  } catch {
    // Reels promo is optional — never block chapter save.
  }

  const editPath = `${returnBasePath}/stories/${storyId}/chapters/${episodeId}/edit`;
  revalidatePath(editPath);
  revalidatePath(`${returnBasePath}/stories/${storyId}/chapters`);
  return { error: null };
}
