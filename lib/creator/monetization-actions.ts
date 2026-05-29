"use server";

import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { calculateCreatorEligibility } from "@/lib/monetization/eligibility";
import {
  getOrCreateCreatorMonetizationProfile,
  updateCreatorMonetizationProfile
} from "@/lib/supabase/creator-monetization";

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

export async function applyForCreatorMonetizationAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const { user } = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  try {
    await assertActionAccess("creator.dashboard.view.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const accepted = String(formData.get("accept_terms") ?? "") === "true";
  if (!accepted) {
    return { ok: false, error: "Bạn cần chấp nhận Creator Terms." };
  }

  const [config, eligibility, profileResult] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    calculateCreatorEligibility(user.id),
    getOrCreateCreatorMonetizationProfile(user.id)
  ]);

  if (!Boolean(config.settings["creator_monetization.enabled"])) {
    return { ok: false, error: "Creator monetization đang tắt." };
  }

  if (!eligibility.eligible) {
    return { ok: false, error: "Bạn chưa đủ điều kiện để đăng ký." };
  }

  if (!profileResult.data) {
    return { ok: false, error: profileResult.error ?? "Không thể tạo hồ sơ monetization." };
  }

  const requiresManualReview = Boolean(
    config.settings["creator_monetization.requires_manual_review"]
  );
  const autoApproval = Boolean(config.settings["creator_monetization.auto_approval_enabled"]);

  const shouldAutoApprove = autoApproval && !requiresManualReview;
  const nextStatus = shouldAutoApprove ? "approved" : "pending_review";

  const updated = await updateCreatorMonetizationProfile(profileResult.data.id, {
    terms_accepted_at: new Date().toISOString(),
    status: nextStatus,
    monetization_enabled: shouldAutoApprove,
    approved_at: shouldAutoApprove ? new Date().toISOString() : null,
    rejected_reason: null,
    suspended_reason: null
  });

  return {
    ok: Boolean(updated.data),
    error: updated.error,
    data: updated.data
  };
}
