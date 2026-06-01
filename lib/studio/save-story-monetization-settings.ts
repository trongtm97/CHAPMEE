"use server";

import { revalidatePath } from "next/cache";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { applyStoryAutoPricing } from "@/lib/studio/apply-story-auto-pricing";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { studioPath } from "@/lib/studio/constants";
import { validateStudioCoinPrice } from "@/lib/studio/validate-coin-price";
import {
  getStoryMonetizationSettings,
  upsertStoryMonetizationSettings
} from "@/lib/supabase/story-monetization";
import type { StoryMonetizationSettings } from "@/types/story-monetization";

async function assertCanConfigure(storyId: string) {
  const state = await getCurrentCreatorProfile();
  if (!state.creatorProfile || !state.user) {
    return { ok: false as const, error: "Bạn cần đăng nhập Studio." };
  }

  const config = await buildStudioMonetizationConfigView({ includePrivate: true });
  if (
    !config.ecosystemEnabled ||
    !config.creatorMonetizationEnabled ||
    !config.paidChaptersEnabled
  ) {
    return { ok: false as const, error: "Admin chưa bật chương trả phí." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(state.user.id);
  if (!creatorCanEarn) {
    return { ok: false as const, error: "Kiếm tiền đang bị tắt bởi quản trị viên." };
  }

  try {
    await assertCreatorOwnsStory(state.creatorProfile, storyId);
  } catch {
    return { ok: false as const, error: "Bạn không có quyền cấu hình truyện này." };
  }

  return {
    ok: true as const,
    creatorProfile: state.creatorProfile,
    userId: state.user.id
  };
}

export async function saveStoryMonetizationSettings(input: {
  storyId: string;
  patch: Partial<
    Pick<
      StoryMonetizationSettings,
      | "monetization_enabled"
      | "full_access_enabled"
      | "full_access_price_coin"
      | "full_access_includes_future_chapters"
      | "full_access_note"
      | "auto_pricing_enabled"
      | "free_first_chapters_count"
      | "auto_paid_from_chapter"
      | "auto_price_coin"
      | "default_new_chapter_price_coin"
    >
  >;
  applyAutoPricing?: boolean;
  overwriteOverrides?: boolean;
}) {
  const access = await assertCanConfigure(input.storyId);
  if (!access.ok) {
    return access;
  }

  if (input.patch.full_access_price_coin != null) {
    const priceCheck = validateStudioCoinPrice(input.patch.full_access_price_coin, {
      required: Boolean(input.patch.full_access_enabled)
    });
    if (!priceCheck.ok) {
      return { ok: false as const, error: priceCheck.error };
    }
  }

  if (input.patch.auto_price_coin != null) {
    const autoPriceCheck = validateStudioCoinPrice(input.patch.auto_price_coin, {
      allowFree: false,
      required: Boolean(input.patch.auto_pricing_enabled)
    });
    if (!autoPriceCheck.ok) {
      return { ok: false as const, error: autoPriceCheck.error };
    }
  }

  const existing = await getStoryMonetizationSettings(input.storyId);
  const merged: StoryMonetizationSettings = {
    ...(existing.data ?? {
      story_id: input.storyId,
      creator_user_id: access.userId,
      monetization_enabled: true,
      full_access_enabled: false,
      full_access_price_coin: null,
      full_access_includes_future_chapters: true,
      full_access_note: null,
      auto_pricing_enabled: false,
      free_first_chapters_count: 0,
      auto_paid_from_chapter: null,
      auto_price_coin: null,
      default_new_chapter_price_coin: null,
      updated_at: new Date().toISOString()
    }),
    ...input.patch,
    story_id: input.storyId,
    creator_user_id: access.userId
  };

  if (
    merged.auto_pricing_enabled &&
    merged.auto_paid_from_chapter == null &&
    merged.free_first_chapters_count >= 0
  ) {
    merged.auto_paid_from_chapter = merged.free_first_chapters_count + 1;
  }

  const saved = await upsertStoryMonetizationSettings(merged);
  if (saved.error || !saved.data) {
    return { ok: false as const, error: saved.error ?? "Không lưu được cài đặt." };
  }

  if (input.applyAutoPricing && saved.data.auto_pricing_enabled) {
    const applied = await applyStoryAutoPricing({
      storyId: input.storyId,
      creatorUserId: access.userId,
      settings: saved.data,
      applyToExisting: true,
      overwriteOverrides: Boolean(input.overwriteOverrides)
    });

    if (!applied.ok) {
      return { ok: false as const, error: applied.error ?? "Không áp dụng được rule tự động." };
    }
  }

  revalidatePath(studioPath("/monetization"));
  revalidatePath(studioPath(`/stories/${input.storyId}/chapters`));

  return { ok: true as const, data: saved.data };
}

export async function updateChapterMonetizationSetting(input: {
  storyId: string;
  chapterId: string;
  isPaid: boolean;
  priceCoin: number | null;
}) {
  const access = await assertCanConfigure(input.storyId);
  if (!access.ok) {
    return access;
  }

  const priceCheck = validateStudioCoinPrice(input.priceCoin, {
    required: input.isPaid
  });
  if (!priceCheck.ok) {
    return { ok: false as const, error: priceCheck.error };
  }

  const { upsertChapterMonetizationSetting } = await import(
    "@/lib/supabase/chapter-monetization"
  );

  const result = await upsertChapterMonetizationSetting({
    chapterId: input.chapterId,
    storyId: input.storyId,
    creatorUserId: access.userId,
    isPaid: input.isPaid,
    coinPrice: input.isPaid ? priceCheck.price : null,
    freePreviewEnabled: false,
    freePreviewPercent: null,
    freePreviewChars: null,
    pricingSource: input.isPaid ? "paid_manual" : "free_manual",
    monetizationOverride: true
  });

  if (result.error) {
    return { ok: false as const, error: result.error };
  }

  revalidatePath(studioPath("/monetization"));
  return { ok: true as const };
}
