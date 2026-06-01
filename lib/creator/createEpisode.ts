"use server";

import { redirect } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { parseEpisodeFormData } from "@/lib/creator/episodeFormValidation";
import { saveEpisodePoll } from "@/lib/supabase/polls";
import { upsertChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { createClient } from "@/lib/supabase/server";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { upsertChapterEarlyAccessSetting } from "@/lib/supabase/early-access";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { linkChapterImagesFromDraft } from "@/lib/images/upload-chapter-image";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { resolveContentSlug } from "@/lib/urls/slug";
import { getChapterUrl } from "@/lib/urls/paths";
import { resolveComposerEpisodePersistFields } from "@/lib/creator/resolve-composer-episode-persist";

export type EpisodeFormActionState = {
  error: string | null;
};

export async function createEpisodeAction(
  _previousState: EpisodeFormActionState,
  formData: FormData
): Promise<EpisodeFormActionState> {
  const storyId = String(formData.get("story_id") ?? "");
  const studioDraftId = String(formData.get("studio_draft_id") ?? "").trim() || null;
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect(
      `/login?next=${returnBasePath}/stories/${storyId}/chapters/new`
    );
  }

  if (!creatorProfile) {
    redirect("/studio/setup");
  }

  try {
    await assertActionAccess("chapter.create");
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

  const supabase = await createClient();
  await assertCreatorOwnsStory(creatorProfile, storyId);
  const [config, creatorCanEarn] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    isCreatorMonetizationAllowed(creatorProfile.user_id)
  ]);

  const { data: storyRow } = await supabase
    .from("stories")
    .select("slug, public_code")
    .eq("id", storyId)
    .maybeSingle();

  if (!storyRow?.public_code) {
    return { error: "Truyện chưa có mã public URL." };
  }

  const { data: storyMeta } = await supabase
    .from("stories")
    .select("content_warnings_confirmed")
    .eq("id", storyId)
    .maybeSingle();

  const strictPublish = parsed.values.status === "pending";
  const composerPersist = await resolveComposerEpisodePersistFields(supabase, {
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

  if (
    strictPublish &&
    parsed.values.contentFormat === "structured_blocks" &&
    composerPersist.validation_status === "warnings" &&
    formData.get("composer_warnings_ack") !== "on"
  ) {
    return {
      error: "Vui lòng xác nhận đã xem các cảnh báo Composer trước khi gửi duyệt."
    };
  }

  const chapterPublicCode = await generateNumericPublicCode(supabase, "chapter");
  const chapterSlug = resolveContentSlug(
    parsed.values.title,
    "chapter",
    chapterPublicCode
  );
  const canonicalPath = getChapterUrl(
    { slug: storyRow.slug, public_code: storyRow.public_code },
    { slug: chapterSlug, public_code: chapterPublicCode }
  );

  const { data: episode, error } = await supabase
    .from("episodes")
    .insert({
      story_id: storyId,
      episode_number: parsed.values.episodeNumber,
      title: parsed.values.title,
      slug: chapterSlug,
      public_code: chapterPublicCode,
      canonical_path: canonicalPath,
      content: composerPersist.content,
      excerpt: parsed.values.excerpt,
      word_count: parsed.values.wordCount,
      seo_description: parsed.values.seoDescription,
      seo_keywords: parsed.values.seoKeywords,
      seo_title: parsed.values.seoTitle,
      status: parsed.values.status,
      presentation_mode: parsed.values.chapterPresentationMode,
      structured_content: parsed.values.structuredContent,
      content_format: parsed.values.contentFormat,
      validation_status: composerPersist.validation_status,
      validation_errors: composerPersist.validation_errors,
      last_validated_at: composerPersist.last_validated_at,
      ...(composerPersist.composer_version
        ? { composer_version: composerPersist.composer_version }
        : {})
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Số chap này đã tồn tại trong truyện."
          : error.message
    };
  }

  if (studioDraftId) {
    try {
      await linkChapterImagesFromDraft(supabase, {
        draftId: studioDraftId,
        episodeId: episode.id,
        storyId
      });
    } catch (linkError) {
      return {
        error:
          linkError instanceof Error
            ? linkError.message
            : "Không thể gắn ảnh nháp vào chương mới."
      };
    }
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
  const rawPrice = allowCustomPrice
    ? parsed.values.monetization.coinPrice
    : null;
  const normalizedPrice =
    rawPrice == null ? null : Math.min(maxPrice, Math.max(minPrice, rawPrice));

  const monetizationWrite = await upsertChapterMonetizationSetting({
    chapterId: episode.id,
    storyId,
    creatorUserId: creatorProfile.user_id,
    isPaid: isPaidRequested,
    coinPrice: normalizedPrice ?? defaultPrice,
    freePreviewEnabled: parsed.values.monetization.freePreviewEnabled,
    freePreviewPercent: parsed.values.monetization.freePreviewPercent,
    freePreviewChars: parsed.values.monetization.freePreviewChars
  });
  if (monetizationWrite.error) {
    return { error: monetizationWrite.error };
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
    chapterId: episode.id,
    storyId,
    creatorUserId: creatorProfile.user_id,
    enabled: earlyEnabledRequested,
    coinPrice: earlyPrice,
    freeAt: earlyEnabledRequested
      ? parsed.values.earlyAccess.freeAt ?? fallbackFreeAt
      : null
  });
  if (earlyWrite.error) {
    return { error: earlyWrite.error };
  }

  if (parsed.values.poll) {
    const pollResult = await saveEpisodePoll({
      authorId: creatorProfile.user_id,
      chapterId: episode.id,
      optionTexts: parsed.values.poll.optionTexts,
      question: parsed.values.poll.question,
      status: parsed.values.poll.status,
      storyId
    });

    if (pollResult.error) {
      return { error: pollResult.error };
    }
  }

  redirect(`${returnBasePath}/stories/${storyId}/chapters/${episode.id}/edit`);
}
