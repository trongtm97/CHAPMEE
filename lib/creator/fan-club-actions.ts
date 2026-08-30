"use server";

import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { upsertFanClubPlan } from "@/lib/data/fan-club";

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

export async function saveFanClubPlanAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const { creatorProfile } = await getCurrentCreatorProfile();
  if (!creatorProfile) return { ok: false, error: "Bạn cần đăng nhập creator." };

  try {
    await assertActionAccess("creator.dashboard.view.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const [config, creatorCanEarn] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    isCreatorMonetizationAllowed(creatorProfile.user_id)
  ]);
  const enabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["fan_club.enabled"]);
  if (!enabled) return { ok: false, error: "Fan Club đang tắt." };

  if (!creatorCanEarn) {
    return { ok: false, error: "Kiếm tiền đang bị tắt bởi ChapMee." };
  }

  const minPrice = Number(config.settings["fan_club.min_coin_price"] ?? 10);
  const maxPrice = Number(config.settings["fan_club.max_coin_price"] ?? 1000);
  const coinPrice = Math.min(
    maxPrice,
    Math.max(minPrice, parseNumber(formData.get("coin_price"), minPrice))
  );
  const durationDays = Math.max(
    1,
    parseNumber(
      formData.get("duration_days"),
      Number(config.settings["fan_club.default_duration_days"] ?? 30)
    )
  );
  const allowStorySpecific = Boolean(config.settings["fan_club.allow_story_specific_club"]);
  const storyIdRaw = String(formData.get("story_id") ?? "").trim();

  const saved = await upsertFanClubPlan({
    creatorUserId: creatorProfile.user_id,
    storyId: allowStorySpecific && storyIdRaw ? storyIdRaw : null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    coinPrice,
    durationDays,
    benefits: {
      fan_badge: String(formData.get("benefit_fan_badge") ?? "") === "true",
      exclusive_poll: String(formData.get("benefit_exclusive_poll") ?? "") === "true",
      comment_highlight: String(formData.get("benefit_comment_highlight") ?? "") === "true",
      bonus_chapter_access:
        String(formData.get("benefit_bonus_chapter_access") ?? "") === "true",
      thank_you_wall: String(formData.get("benefit_thank_you_wall") ?? "") === "true",
      early_access_discount_percent: parseNumber(
        formData.get("benefit_early_access_discount_percent"),
        0
      )
    },
    isActive: String(formData.get("is_active") ?? "") === "true"
  });

  if (!saved.data) return { ok: false, error: saved.error ?? "Không thể lưu Fan Club plan." };
  return { ok: true, error: null };
}
