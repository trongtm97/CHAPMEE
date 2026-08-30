"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getBoostSettingsForAdmin, updateBoostSetting } from "@/lib/boost/boost-settings";
import { creditUserRewardPoints } from "@/lib/boost/reward-points";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";

export async function getAdminBoostSettingsAction() {
  const guard = await requireAdminSettingsAccess("/admin/engagement/boosts");
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, settings: null };
  }
  const settings = await getBoostSettingsForAdmin();
  return { ok: true as const, error: null, settings };
}

export async function updateBoostSettingsAction(formData: FormData) {
  const guard = await requireAdminSettingsAccess("/admin/engagement/boosts");
  if (!guard.ok) {
    return { ok: false as const, message: guard.error };
  }

  const enabled = formData.get("enabled") === "on";
  const rewardPointBoostEnabled = formData.get("rewardPointBoostEnabled") === "on";
  const coinBoostEnabled = formData.get("coinBoostEnabled") === "on";
  const allowCreatorSelfBoost = formData.get("allowCreatorSelfBoost") === "on";
  const showPublicMessages = formData.get("showPublicMessages") === "on";
  const antiWhaleCapEnabled = formData.get("antiWhaleCapEnabled") === "on";

  const minBoostPoints = Number(formData.get("minBoostPoints") ?? 10);
  const pointsPerUnit = Number(formData.get("pointsPerUnit") ?? 10);
  const boostPointsPerUnit = Number(formData.get("boostPointsPerUnit") ?? 10);
  const userDailyCap = Number(formData.get("userDailyCap") ?? 100);
  const storyDailyCap = Number(formData.get("storyDailyCap") ?? 500);
  const minStoryAgeHours = Number(formData.get("minStoryAgeHours") ?? 24);
  const decayHalfLifeDays = Number(formData.get("decayHalfLifeDays") ?? 7);
  const rankingWeight = Number(formData.get("rankingWeight") ?? 1);
  const organicBlendMax = Number(formData.get("organicBlendMax") ?? 0);

  const numbers = [
    minBoostPoints,
    pointsPerUnit,
    boostPointsPerUnit,
    userDailyCap,
    storyDailyCap,
    minStoryAgeHours,
    decayHalfLifeDays,
    rankingWeight,
    organicBlendMax
  ];

  if (!numbers.every(Number.isFinite)) {
    return { ok: false as const, message: "Giá trị cấu hình không hợp lệ." };
  }

  await Promise.all([
    updateBoostSetting("boost.enabled", enabled),
    updateBoostSetting("boost.reward_point_boost_enabled", rewardPointBoostEnabled),
    updateBoostSetting("boost.coin_boost_enabled", coinBoostEnabled),
    updateBoostSetting("boost.allow_creator_self_boost", allowCreatorSelfBoost),
    updateBoostSetting("boost.show_public_messages", showPublicMessages),
    updateBoostSetting("boost.anti_whale_cap_enabled", antiWhaleCapEnabled),
    updateBoostSetting("boost.min_boost_points", Math.trunc(minBoostPoints)),
    updateBoostSetting("boost.points_per_unit", Math.trunc(pointsPerUnit)),
    updateBoostSetting("boost.boost_points_per_unit", Math.trunc(boostPointsPerUnit)),
    updateBoostSetting("boost.user_daily_cap", Math.trunc(userDailyCap)),
    updateBoostSetting("boost.story_daily_cap", Math.trunc(storyDailyCap)),
    updateBoostSetting("boost.min_story_age_hours", Math.trunc(minStoryAgeHours)),
    updateBoostSetting("boost.decay_half_life_days", Math.trunc(decayHalfLifeDays)),
    updateBoostSetting("boost.ranking_weight", rankingWeight),
    updateBoostSetting("boost.organic_blend_max", organicBlendMax)
  ]);

  await logAdminAction({
    action: "update_app_settings",
    actorId: guard.context.userId,
    targetType: "engagement_settings",
    targetId: "boost",
    metadata: {
      enabled,
      rewardPointBoostEnabled,
      coinBoostEnabled,
      allowCreatorSelfBoost,
      userDailyCap: Math.trunc(userDailyCap),
      storyDailyCap: Math.trunc(storyDailyCap),
      rankingWeight
    }
  });

  revalidatePath("/admin/engagement/boosts");
  revalidatePath("/bang-xep-hang");
  revalidatePath("/discover");
  return { ok: true as const, message: "Đã lưu cấu hình đề cử." };
}

export async function grantRewardPointsAction(formData: FormData) {
  const guard = await requireAdminSettingsAccess("/admin/engagement/boosts");
  if (!guard.ok) {
    return { ok: false as const, message: guard.error };
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, message: "Thiếu userId hoặc số điểm không hợp lệ." };
  }

  const result = await creditUserRewardPoints({
    userId,
    amount: Math.trunc(amount),
    reason: "admin_adjust",
    createdByAdminId: guard.context.userId
  });

  if (!result.ok) {
    return { ok: false as const, message: result.error ?? "Không thể cấp điểm." };
  }

  await logAdminAction({
    action: "coin_grant",
    actorId: guard.context.userId,
    targetType: "user_reward_points",
    targetId: userId,
    metadata: { amount: Math.trunc(amount), balance: result.balance }
  });

  return { ok: true as const, message: `Đã cấp ${Math.trunc(amount)} điểm. Số dư: ${result.balance}.` };
}
