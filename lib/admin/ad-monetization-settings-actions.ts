"use server";

import { headers } from "next/headers";
import { getAdMonetizationOverview } from "@/lib/admin/get-ad-monetization-overview";
import {
  buildEstimatePolicyMismatchWarning,
  validateAdMonetizationHubInput
} from "@/lib/admin/ad-monetization-hub-validation";
import { updateAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";
import { updateCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import type {
  AdMonetizationHubSaveInput,
  AdMonetizationHubSaveResult
} from "@/types/admin-ad-monetization-settings";
import { CREATOR_AD_REVENUE_POLICY_ID } from "@/types/creator-ad-revenue-policy";

export async function saveAdMonetizationHubAction(
  input: AdMonetizationHubSaveInput
): Promise<AdMonetizationHubSaveResult> {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return { ok: false, message: guard.error ?? "Không có quyền chỉnh cấu hình quảng cáo.", overview: null };
  }

  const validation = validateAdMonetizationHubInput({
    creator_pool_percent: input.creator_pool_percent,
    reserve_percent: input.reserve_percent,
    reserve_hold_days: input.reserve_hold_days,
    min_payout_vnd: input.min_payout_vnd
  });

  if (!validation.ok) {
    return { ok: false, message: validation.formError ?? "Dữ liệu không hợp lệ.", overview: null };
  }

  const beforeOverview = await getAdMonetizationOverview();
  const actorId = guard.context.userId;

  const policyPatch: Parameters<typeof updateCreatorAdRevenuePolicy>[0] = {};
  if (input.creator_pool_percent !== undefined) {
    policyPatch.creator_pool_percent = input.creator_pool_percent;
  }
  if (input.reserve_percent !== undefined) {
    policyPatch.reserve_percent = input.reserve_percent;
  }
  if (input.reserve_hold_days !== undefined) {
    policyPatch.reserve_hold_days = input.reserve_hold_days;
  }
  if (input.min_payout_vnd !== undefined) {
    policyPatch.min_payout_vnd = input.min_payout_vnd;
  }
  if (input.beta_mode !== undefined) {
    policyPatch.beta_mode = input.beta_mode;
  }

  const hasPolicyChanges = Object.keys(policyPatch).length > 0;
  if (hasPolicyChanges) {
    const result = await updateCreatorAdRevenuePolicy(policyPatch, actorId);
    if (result.error) {
      return { ok: false, message: result.error, overview: null };
    }
  }

  if (input.is_estimate_visible_to_creators !== undefined) {
    const estResult = await updateAdRevenueEstimateSettings({
      is_estimate_visible_to_creators: input.is_estimate_visible_to_creators
    });
    if (estResult.error) {
      return { ok: false, message: estResult.error, overview: null };
    }
  }

  const afterOverview = await getAdMonetizationOverview();
  const mismatch = buildEstimatePolicyMismatchWarning({
    estimateVisible: afterOverview.estimateSettings.is_estimate_visible_to_creators,
    policyEnabled: afterOverview.policy.is_enabled
  });

  const hdrs = await headers();
  await logAdminAction({
    actorId,
    action: "monetization_settings.ad_revenue_update",
    targetType: "creator_ad_revenue_policy",
    targetId: CREATOR_AD_REVENUE_POLICY_ID,
    metadata: {
      reason: input.reason?.trim() || null,
      before: {
        policy: beforeOverview.policy,
        estimateSettings: beforeOverview.estimateSettings
      },
      after: {
        policy: afterOverview.policy,
        estimateSettings: afterOverview.estimateSettings
      },
      changed: input
    },
    ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: hdrs.get("user-agent")
  });

  let message = "Đã lưu cấu hình quảng cáo & chia sẻ doanh thu.";
  if (mismatch) {
    message += ` Cảnh báo: ${mismatch}`;
  }

  return { ok: true, message, overview: afterOverview };
}
