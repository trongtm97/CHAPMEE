"use server";

import { revalidatePath } from "next/cache";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { applyStoryAutoPricing } from "@/lib/studio/apply-story-auto-pricing";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { studioPath } from "@/lib/studio/constants";
import { validateStudioCoinPrice } from "@/lib/studio/validate-coin-price";
import { upsertChapterMonetizationSetting } from "@/lib/supabase/chapter-monetization";
import { getStoryMonetizationSettings } from "@/lib/supabase/story-monetization";
import type { StudioMonetizationBulkResult } from "@/types/studio-monetization-stories";

export type BulkChapterMonetizationAction =
  | "set_free"
  | "set_price"
  | "apply_auto"
  | "clear_override"
  | "disable_paid";

export async function bulkUpdateChapterMonetization(input: {
  storyId: string;
  chapterIds: string[];
  action: BulkChapterMonetizationAction;
  priceCoin?: number | null;
  overwriteOverrides?: boolean;
}): Promise<StudioMonetizationBulkResult> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, successCount: 0, failedCount: 0, error: "Bạn cần đăng nhập Studio." };
  }

  const config = await buildStudioMonetizationConfigView({ includePrivate: true });
  if (
    !config.ecosystemEnabled ||
    !config.creatorMonetizationEnabled ||
    !config.paidChaptersEnabled
  ) {
    return { ok: false, successCount: 0, failedCount: 0, error: "Admin chưa bật chương trả phí." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(state.user.id);
  if (!creatorCanEarn) {
    return {
      ok: false,
      successCount: 0,
      failedCount: 0,
      error: "Kiếm tiền đang bị tắt bởi quản trị viên."
    };
  }

  try {
    await assertCreatorOwnsStory(state.creatorProfile, input.storyId);
  } catch {
    return {
      ok: false,
      successCount: 0,
      failedCount: 0,
      error: "Bạn không có quyền cấu hình truyện này."
    };
  }

  if (input.chapterIds.length === 0) {
    return { ok: false, successCount: 0, failedCount: 0, error: "Chưa chọn chương nào." };
  }

  if (input.action === "set_price") {
    const priceCheck = validateStudioCoinPrice(input.priceCoin, { required: true, allowFree: false });
    if (!priceCheck.ok) {
      return { ok: false, successCount: 0, failedCount: 0, error: priceCheck.error };
    }
  }

  if (input.action === "apply_auto") {
    const settingsResult = await getStoryMonetizationSettings(input.storyId);
    const settings = settingsResult.data;
    if (!settings?.auto_pricing_enabled) {
      return {
        ok: false,
        successCount: 0,
        failedCount: 0,
        error: "Truyện chưa bật rule tự động."
      };
    }

    const applied = await applyStoryAutoPricing({
      storyId: input.storyId,
      creatorUserId: state.user.id,
      settings,
      applyToExisting: true,
      overwriteOverrides: Boolean(input.overwriteOverrides),
      chapterIds: input.chapterIds
    });

    return {
      ok: applied.ok,
      successCount: applied.updatedCount,
      failedCount: applied.ok ? 0 : input.chapterIds.length,
      error: applied.error ?? undefined
    };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const chapterId of input.chapterIds) {
    let isPaid = false;
    let coinPrice: number | null = null;
    let pricingSource: "free_manual" | "paid_manual" = "free_manual";
    let monetizationOverride = true;

    if (input.action === "set_price") {
      const priceCheck = validateStudioCoinPrice(input.priceCoin, { required: true, allowFree: false });
      if (!priceCheck.ok) {
        failedCount += 1;
        continue;
      }
      isPaid = true;
      coinPrice = priceCheck.price;
      pricingSource = "paid_manual";
    } else if (input.action === "clear_override") {
      monetizationOverride = false;
      pricingSource = "free_manual";
    }

    const result = await upsertChapterMonetizationSetting({
      chapterId,
      storyId: input.storyId,
      creatorUserId: state.user.id,
      isPaid,
      coinPrice,
      freePreviewEnabled: false,
      freePreviewPercent: null,
      freePreviewChars: null,
      pricingSource,
      monetizationOverride
    });

    if (result.error) {
      failedCount += 1;
    } else {
      successCount += 1;
    }
  }

  revalidatePath(studioPath("/monetization"));

  return {
    ok: successCount > 0,
    successCount,
    failedCount,
    error:
      successCount === 0
        ? "Không cập nhật được chương nào."
        : failedCount > 0
          ? `Hoàn tất ${successCount} chương, lỗi ${failedCount} chương.`
          : undefined
  };
}
