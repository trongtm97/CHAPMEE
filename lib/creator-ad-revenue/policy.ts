import { createAdminClient } from "@/lib/data/admin";
import { createClient } from "@/lib/data/server";
import { updateAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";
import { DEFAULT_CREATOR_AD_REVENUE_POLICY_TEXT } from "@/lib/creator-ad-revenue/default-policy-text";
import { logCreatorAdPolicyAudit } from "@/lib/creator-ad-revenue/audit";
import { publishCreatorAdPolicyVersion } from "@/lib/creator-ad-revenue/policy-versions";
import {
  CREATOR_AD_REVENUE_POLICY_ID,
  type CreatorAdRevenuePolicy,
  type CreatorAdRevenuePolicyInput
} from "@/types/creator-ad-revenue-policy";

const DEFAULT_POLICY: CreatorAdRevenuePolicy = {
  id: CREATOR_AD_REVENUE_POLICY_ID,
  is_enabled: false,
  beta_mode: true,
  creator_pool_percent: 30,
  reserve_percent: 15,
  reserve_hold_days: 60,
  min_payout_vnd: 200000,
  payout_cycle: "monthly_m2_day_5_10",
  require_kyc: true,
  require_tax_info: true,
  require_payout_setup: true,
  require_good_standing: true,
  min_monthly_valid_reads: 0,
  min_monthly_ad_impressions: 0,
  invalid_traffic_hold_enabled: true,
  internal_tracking_only: true,
  show_estimated_revenue_to_creators: true,
  estimated_revenue_disclaimer_enabled: true,
  max_invalid_traffic_rate: 0.15,
  max_suspicious_ctr: 0.08,
  auto_hold_invalid_traffic: true,
  auto_hold_suspicious_ctr: true,
  auto_hold_traffic_spike: true,
  auto_hold_reported_content: true,
  auto_hold_copyright_dispute: true,
  auto_hold_missing_compliance: true,
  policy_version: "1.0",
  policy_status: "draft",
  policy_effective_at: null,
  policy_published_at: null,
  policy_text: DEFAULT_CREATOR_AD_REVENUE_POLICY_TEXT,
  updated_by: null,
  updated_at: new Date().toISOString()
};

function mapPolicy(row: Record<string, unknown>): CreatorAdRevenuePolicy {
  return {
    id: String(row.id),
    is_enabled: Boolean(row.is_enabled),
    beta_mode: Boolean(row.beta_mode),
    creator_pool_percent: Number(row.creator_pool_percent ?? 30),
    reserve_percent: Number(row.reserve_percent ?? 15),
    reserve_hold_days: Number(row.reserve_hold_days ?? 60),
    min_payout_vnd: Number(row.min_payout_vnd ?? 200000),
    payout_cycle: String(row.payout_cycle ?? "monthly_m2_day_5_10"),
    require_kyc: Boolean(row.require_kyc ?? true),
    require_tax_info: Boolean(row.require_tax_info ?? true),
    require_payout_setup: Boolean(row.require_payout_setup ?? true),
    require_good_standing: Boolean(row.require_good_standing ?? true),
    min_monthly_valid_reads: Number(row.min_monthly_valid_reads ?? 0),
    min_monthly_ad_impressions: Number(row.min_monthly_ad_impressions ?? 0),
    invalid_traffic_hold_enabled: Boolean(row.invalid_traffic_hold_enabled ?? true),
    internal_tracking_only: row.internal_tracking_only !== false,
    show_estimated_revenue_to_creators: row.show_estimated_revenue_to_creators !== false,
    estimated_revenue_disclaimer_enabled: row.estimated_revenue_disclaimer_enabled !== false,
    max_invalid_traffic_rate: Number(row.max_invalid_traffic_rate ?? 0.15),
    max_suspicious_ctr: Number(row.max_suspicious_ctr ?? 0.08),
    auto_hold_invalid_traffic: row.auto_hold_invalid_traffic !== false,
    auto_hold_suspicious_ctr: row.auto_hold_suspicious_ctr !== false,
    auto_hold_traffic_spike: row.auto_hold_traffic_spike !== false,
    auto_hold_reported_content: row.auto_hold_reported_content !== false,
    auto_hold_copyright_dispute: row.auto_hold_copyright_dispute !== false,
    auto_hold_missing_compliance: row.auto_hold_missing_compliance !== false,
    policy_version: String(row.policy_version ?? "1.0"),
    policy_status: (row.policy_status as CreatorAdRevenuePolicy["policy_status"]) ?? "draft",
    policy_effective_at: (row.policy_effective_at as string | null) ?? null,
    policy_published_at: (row.policy_published_at as string | null) ?? null,
    policy_text:
      (row.policy_text as string | null)?.trim() ||
      DEFAULT_CREATOR_AD_REVENUE_POLICY_TEXT,
    updated_by: (row.updated_by as string | null) ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

export async function getCreatorAdRevenuePolicy(options?: {
  useAdmin?: boolean;
}): Promise<CreatorAdRevenuePolicy> {
  try {
    const db = options?.useAdmin ? createAdminClient() : await createClient();
    const { data, error } = await db
      .from("creator_ad_revenue_policy")
      .select("*")
      .eq("id", CREATOR_AD_REVENUE_POLICY_ID)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_POLICY;
    }
    return mapPolicy(data as Record<string, unknown>);
  } catch {
    return DEFAULT_POLICY;
  }
}

export async function updateCreatorAdRevenuePolicy(
  input: CreatorAdRevenuePolicyInput,
  actorId: string,
  options?: { auditNote?: string | null }
): Promise<{ policy: CreatorAdRevenuePolicy | null; error: string | null }> {
  try {
    const before = await getCreatorAdRevenuePolicy({ useAdmin: true });
    const db = createAdminClient();
    const patch: Record<string, unknown> = { updated_by: actorId };

    const keys: (keyof CreatorAdRevenuePolicyInput)[] = [
      "is_enabled",
      "beta_mode",
      "creator_pool_percent",
      "reserve_percent",
      "reserve_hold_days",
      "min_payout_vnd",
      "payout_cycle",
      "require_kyc",
      "require_tax_info",
      "require_payout_setup",
      "require_good_standing",
      "min_monthly_valid_reads",
      "min_monthly_ad_impressions",
      "invalid_traffic_hold_enabled",
      "internal_tracking_only",
      "show_estimated_revenue_to_creators",
      "estimated_revenue_disclaimer_enabled",
      "max_invalid_traffic_rate",
      "max_suspicious_ctr",
      "auto_hold_invalid_traffic",
      "auto_hold_suspicious_ctr",
      "auto_hold_traffic_spike",
      "auto_hold_reported_content",
      "auto_hold_copyright_dispute",
      "auto_hold_missing_compliance",
      "policy_version",
      "policy_status",
      "policy_effective_at",
      "policy_published_at",
      "policy_text"
    ];

    for (const key of keys) {
      if (input[key] !== undefined) {
        patch[key] = input[key];
      }
    }

    const { data, error } = await db
      .from("creator_ad_revenue_policy")
      .update(patch)
      .eq("id", CREATOR_AD_REVENUE_POLICY_ID)
      .select("*")
      .single();

    if (error) {
      return { policy: null, error: error.message };
    }

    const policy = mapPolicy(data as Record<string, unknown>);

    await logCreatorAdPolicyAudit({
      actorId,
      action: input.policy_status === "published" ? "policy_published" : "policy_updated",
      before: before as unknown as Record<string, unknown>,
      after: policy as unknown as Record<string, unknown>,
      note: options?.auditNote ?? null
    });

    if (input.policy_status === "published") {
      await publishCreatorAdPolicyVersion({
        policy,
        actorId,
        effectiveAt: policy.policy_effective_at
      });
    }

    if (
      input.creator_pool_percent !== undefined ||
      input.reserve_percent !== undefined ||
      input.reserve_hold_days !== undefined ||
      input.min_payout_vnd !== undefined ||
      input.is_enabled !== undefined
    ) {
      await updateAdRevenueEstimateSettings({
        creator_pool_percent: policy.creator_pool_percent,
        reserve_percent: policy.reserve_percent,
        reserve_hold_days: policy.reserve_hold_days,
        min_payout_vnd: policy.min_payout_vnd,
        is_creator_ads_revenue_enabled: policy.is_enabled,
        is_estimate_visible_to_creators: policy.show_estimated_revenue_to_creators
      });
    }

    if (input.show_estimated_revenue_to_creators !== undefined) {
      await updateAdRevenueEstimateSettings({
        is_estimate_visible_to_creators: policy.show_estimated_revenue_to_creators
      });
    }

    return { policy, error: null };
  } catch {
    return { policy: null, error: "Không cập nhật được chính sách chia doanh thu quảng cáo." };
  }
}

export function getDefaultCreatorAdRevenuePolicyText() {
  return DEFAULT_CREATOR_AD_REVENUE_POLICY_TEXT;
}
