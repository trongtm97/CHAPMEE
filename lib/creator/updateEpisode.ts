"use server";

import { redirect } from "next/navigation";
import { assertCreatorOwnsEpisode } from "@/lib/creator/assertCreatorOwnsEpisode";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { parseEpisodeFormData } from "@/lib/creator/episodeFormValidation";
import { saveEpisodePoll } from "@/lib/supabase/polls";
import { upsertChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { EpisodeFormActionState } from "@/lib/creator/createEpisode";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCreatorMonetizationProfile } from "@/lib/supabase/creator-monetization";
import { upsertChapterEarlyAccessSetting } from "@/lib/supabase/early-access";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";

export async function updateEpisodeAction(
  _previousState: EpisodeFormActionState,
  formData: FormData
): Promise<EpisodeFormActionState> {
  const storyId = String(formData.get("story_id") ?? "");
  const episodeId = String(formData.get("episode_id") ?? "");
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect(
      `/login?next=${returnBasePath}/stories/${storyId}/chapters/${episodeId}/edit`
    );
  }

  if (!creatorProfile) {
    redirect("/studio/setup");
  }

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

  const supabase = await createClient();
  await assertCreatorOwnsEpisode(creatorProfile, storyId, episodeId);
  const [config, creatorMonetization] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    getCreatorMonetizationProfile(creatorProfile.user_id)
  ]);

  const { error } = await supabase
    .from("episodes")
    .update({
      episode_number: parsed.values.episodeNumber,
      title: parsed.values.title,
      content: parsed.values.content,
      excerpt: parsed.values.excerpt,
      word_count: parsed.values.wordCount,
      seo_description: parsed.values.seoDescription,
      seo_keywords: parsed.values.seoKeywords,
      seo_title: parsed.values.seoTitle,
      status: parsed.values.status
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
  const creatorApproved =
    creatorMonetization.data?.status === "approved" &&
    Boolean(creatorMonetization.data?.monetization_enabled);
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
    return { error: earlyWrite.error };
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

  redirect(`${returnBasePath}/stories/${storyId}/chapters/${episodeId}/edit`);
}
