import { getMonetizationConfig } from "@/lib/monetization/config";
import { createClient } from "@/lib/supabase/server";
import {
  CREATOR_FEE_REVENUE_SOURCES,
  moduleToRevenueSource,
  revenueSourceToModule
} from "@/lib/admin/creator-fee-policies/constants";
import { getSourceRate, mapCreatorFeePolicyRow, normalizeRevenueSharePercents } from "@/lib/admin/creator-fee-policy-shared";
import type { MonetizationConfigKey } from "@/types/monetization";
import type {
  CreatorFeePolicyRow,
  CreatorFeePolicySnapshot,
  CreatorFeePolicySource,
  CreatorFeeRevenueSourceId,
  CreatorFeeSourceRates,
  ResolvedCreatorFeePolicy
} from "@/types/creator-fee-policy";
import type { CreatorRevenueModule } from "@/types/revenue-share";

export type FeePolicyTransactionType = CreatorRevenueModule | string;

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Mô hình đơn giản: chỉ tỉ lệ ăn chia tác giả / nền tảng trên doanh thu gộp. */
const SIMPLIFIED_POLICY_EXTRAS = {
  paymentProcessingFeePercent: 0,
  paymentProcessingFixedFeeVnd: 0,
  tipPlatformFeePercent: null,
  revenueBasis: "gross" as const,
  calculateOnNetAfterChannelFee: false
};

export function mapTransactionTypeToModule(
  transactionType: FeePolicyTransactionType
): CreatorRevenueModule {
  const normalized = String(transactionType).toLowerCase();
  if (
    normalized === "paid_chapter" ||
    normalized === "chapter_unlock" ||
    normalized === "story_unlock"
  ) {
    return "paid_chapter";
  }
  if (normalized === "early_access") return "early_access";
  if (normalized === "tip") return "tip";
  if (normalized === "gift" || normalized === "virtual_gift") return "gift";
  if (normalized === "fan_club" || normalized === "fan_club_subscription") return "fan_club";
  if (normalized === "vip_pool" || normalized === "vip_subscription") return "vip_pool";
  if (normalized === "rewarded_ads") return "paid_chapter";
  if (normalized === "sponsored_challenge") return "paid_chapter";
  return "paid_chapter";
}

export function mapTransactionTypeToRevenueSource(
  transactionType: FeePolicyTransactionType
): CreatorFeeRevenueSourceId {
  const normalized = String(transactionType).toLowerCase();
  if (normalized === "rewarded_ads") return "rewarded_ads";
  if (normalized === "sponsored_challenge") return "sponsored_challenge";
  const moduleType = mapTransactionTypeToModule(transactionType);
  return moduleToRevenueSource(moduleType) as CreatorFeeRevenueSourceId;
}

function isPolicyEffectiveAt(row: CreatorFeePolicyRow, at: Date): boolean {
  if (!["active", "scheduled"].includes(row.status)) {
    return false;
  }
  const starts = new Date(row.starts_at).getTime();
  const ends = row.ends_at ? new Date(row.ends_at).getTime() : null;
  const ts = at.getTime();
  if (starts > ts) return false;
  if (ends != null && ends < ts) return false;
  return true;
}

async function fetchActivePolicyForCreator(
  creatorId: string,
  at: Date
): Promise<CreatorFeePolicyRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_fee_policies")
    .select("*")
    .eq("creator_id", creatorId)
    .in("status", ["active", "scheduled"])
    .lte("starts_at", at.toISOString())
    .or(`ends_at.is.null,ends_at.gte.${at.toISOString()}`)
    .order("starts_at", { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    return null;
  }

  for (const row of data) {
    const mapped = mapCreatorFeePolicyRow(row as Record<string, unknown>);
    if (isPolicyEffectiveAt(mapped, at)) {
      return mapped;
    }
  }

  return null;
}

export async function buildDefaultSourceRates(): Promise<CreatorFeeSourceRates> {
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const rates: CreatorFeeSourceRates = {};

  for (const source of CREATOR_FEE_REVENUE_SOURCES) {
    const creator = numberValue(
      settings[source.creatorConfigKey as MonetizationConfigKey],
      numberValue(settings["revenue_share.default_creator_percent"], 70)
    );
    const configuredPlatform = numberValue(
      settings[source.platformConfigKey as MonetizationConfigKey],
      Math.max(0, 100 - creator)
    );
    const normalized = normalizeRevenueSharePercents(creator, configuredPlatform);
    rates[source.id] = {
      author_percent: normalized.authorPercent,
      platform_percent: normalized.platformPercent
    };
  }

  return rates;
}

function buildDefaultResolved(
  revenueSource: CreatorFeeRevenueSourceId,
  settings: Record<string, unknown>
): ResolvedCreatorFeePolicy {
  const sourceDef = CREATOR_FEE_REVENUE_SOURCES.find((s) => s.id === revenueSource);
  const creatorRevenueSharePercent = numberValue(
    sourceDef
      ? settings[sourceDef.creatorConfigKey as MonetizationConfigKey]
      : settings["revenue_share.default_creator_percent"],
    70
  );
  const configuredPlatform = sourceDef
    ? numberValue(
        settings[sourceDef.platformConfigKey as MonetizationConfigKey],
        Math.max(0, 100 - creatorRevenueSharePercent)
      )
    : Math.max(0, 100 - creatorRevenueSharePercent);
  const normalized = normalizeRevenueSharePercents(
    creatorRevenueSharePercent,
    configuredPlatform
  );

  return {
    source: "default_config",
    policyId: null,
    policyName: null,
    revenueSource,
    creatorRevenueSharePercent: normalized.authorPercent,
    platformFeePercent: normalized.platformPercent,
    ...SIMPLIFIED_POLICY_EXTRAS,
    minWithdrawAmountOverride: null,
    allowedPriceStepsOverride: null,
    publicNote: null,
    showDetailsToCreator: true,
    policyEffectiveFrom: null,
    appliedPolicyType: "default"
  };
}

function buildOverrideResolved(
  policy: CreatorFeePolicyRow,
  defaults: ResolvedCreatorFeePolicy,
  revenueSource: CreatorFeeRevenueSourceId
): ResolvedCreatorFeePolicy {
  const sourceRate = getSourceRate(policy, revenueSource);
  const normalized = normalizeRevenueSharePercents(
    sourceRate?.author_percent ?? defaults.creatorRevenueSharePercent,
    sourceRate?.platform_percent ?? defaults.platformFeePercent
  );

  const hasCustomSource = sourceRate != null;
  const hasLegacyOverride =
    policy.creator_revenue_share_percent != null ||
    policy.platform_fee_percent != null;

  return {
    source: "creator_override",
    policyId: policy.id,
    policyName: policy.policy_name,
    revenueSource,
    creatorRevenueSharePercent: normalized.authorPercent,
    platformFeePercent: normalized.platformPercent,
    ...SIMPLIFIED_POLICY_EXTRAS,
    minWithdrawAmountOverride: policy.min_withdraw_amount_override,
    allowedPriceStepsOverride: policy.allowed_price_steps_override,
    publicNote: policy.public_note,
    showDetailsToCreator: policy.show_details_to_creator,
    policyEffectiveFrom: policy.starts_at,
    appliedPolicyType: hasCustomSource || hasLegacyOverride ? "custom" : "default"
  };
}

export function toCreatorFeePolicySnapshot(
  resolved: ResolvedCreatorFeePolicy
): CreatorFeePolicySnapshot {
  return {
    policy_source: resolved.source,
    policy_id: resolved.policyId,
    policy_name: resolved.policyName,
    revenue_source_snapshot: resolved.revenueSource,
    applied_policy_type: resolved.appliedPolicyType,
    policy_effective_from_snapshot: resolved.policyEffectiveFrom,
    author_percent_snapshot: resolved.creatorRevenueSharePercent,
    platform_percent_snapshot: resolved.platformFeePercent,
    platform_fee_percent: resolved.platformFeePercent,
    creator_revenue_share_percent: resolved.creatorRevenueSharePercent,
    payment_processing_fee_percent: resolved.paymentProcessingFeePercent,
    payment_processing_fixed_fee_vnd: resolved.paymentProcessingFixedFeeVnd,
    tip_platform_fee_percent: resolved.tipPlatformFeePercent,
    min_withdraw_amount_override: resolved.minWithdrawAmountOverride
  };
}

export async function resolveCreatorFeePolicy(input: {
  creatorId: string;
  transactionType: FeePolicyTransactionType;
  occurredAt?: Date;
}): Promise<ResolvedCreatorFeePolicy> {
  const at = input.occurredAt ?? new Date();
  const revenueSource = mapTransactionTypeToRevenueSource(input.transactionType);
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const defaults = buildDefaultResolved(revenueSource, settings);

  const policy = await fetchActivePolicyForCreator(input.creatorId, at);
  if (!policy) {
    return defaults;
  }

  return buildOverrideResolved(policy, defaults, revenueSource);
}

export async function resolveCreatorFeePolicyForSource(input: {
  creatorId: string;
  revenueSource: CreatorFeeRevenueSourceId;
  occurredAt?: Date;
  policyOverride?: CreatorFeePolicyRow | null;
}): Promise<ResolvedCreatorFeePolicy> {
  const at = input.occurredAt ?? new Date();
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const defaults = buildDefaultResolved(input.revenueSource, settings);

  const policy =
    input.policyOverride ?? (await fetchActivePolicyForCreator(input.creatorId, at));
  if (!policy) {
    return defaults;
  }

  return buildOverrideResolved(policy, defaults, input.revenueSource);
}

export async function getCreatorFeePolicyForStudio(creatorId: string) {
  const resolved = await resolveCreatorFeePolicy({
    creatorId,
    transactionType: "paid_chapter"
  });

  if (resolved.source === "default_config") {
    return {
      hasOverride: false,
      showDetails: true,
      resolved,
      genericMessage:
        "Doanh thu của bạn được tính theo chính sách hiện hành của ChapMee hoặc thỏa thuận riêng nếu có."
    };
  }

  return {
    hasOverride: true,
    showDetails: resolved.showDetailsToCreator,
    resolved,
    genericMessage:
      "Doanh thu của bạn được tính theo chính sách hiện hành của ChapMee hoặc thỏa thuận riêng nếu có."
  };
}

export type { CreatorFeePolicySource };
