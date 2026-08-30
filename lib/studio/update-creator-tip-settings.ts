"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import {
  getCreatorMonetizationProfile,
  updateCreatorMonetizationProfile
} from "@/lib/data/creator-monetization";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { studioPath } from "@/lib/studio/constants";
import { validateTipThankYouMessage } from "@/lib/studio/validate-chapter-coin-price";

export async function updateCreatorTipSettings(input: {
  tipsAccepted: boolean;
  thankYouMessage: string;
}): Promise<{ ok: boolean; error?: string }> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  const config = await buildStudioMonetizationConfigView({ includePrivate: true });

  if (!config.tipsEnabled) {
    return { ok: false, error: "Admin chưa bật tip." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(state.user.id);
  if (!creatorCanEarn) {
    return { ok: false, error: "Kiếm tiền đang bị tắt bởi ChapMee." };
  }

  const profile = await getCreatorMonetizationProfile(state.user.id);

  if (!profile.data) {
    return { ok: false, error: "Không tìm thấy hồ sơ kiếm tiền." };
  }

  let thankYouMessage: string | null = null;

  if (input.tipsAccepted && input.thankYouMessage.trim()) {
    const validated = validateTipThankYouMessage(input.thankYouMessage);

    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    thankYouMessage = validated.message || null;
  }

  const updated = await updateCreatorMonetizationProfile(profile.data.id, {
    tips_accepted: input.tipsAccepted,
    tip_thank_you_message: thankYouMessage
  });

  if (updated.error) {
    const missingColumn =
      updated.error.includes("tips_accepted") ||
      updated.error.includes("tip_thank_you_message");

    if (missingColumn) {
      return {
        ok: false,
        error: "Cài đặt tip chưa sẵn sàng. Chạy migration 081 trên db."
      };
    }

    return { ok: false, error: updated.error };
  }

  revalidatePath(studioPath("/monetization"));

  return { ok: true };
}
