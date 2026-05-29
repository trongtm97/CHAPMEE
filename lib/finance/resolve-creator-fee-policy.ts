import { getMonetizationConfig } from "@/lib/monetization/config";
import { createClient } from "@/lib/supabase/server";
import type { MonetizationConfigKey } from "@/types/monetization";
import type {
  CreatorFeePolicyRow,
  CreatorFeePolicySnapshot,
  CreatorFeePolicySource,
  ResolvedCreatorFeePolicy
} from "@/types/creator-fee-policy";
import type { CreatorRevenueModule } from "@/types/revenue-share";

export type FeePolicyTransactionType = CreatorRevenueModule | string;

const MODULE_CREATOR_PERCENT_KEY: Record<CreatorRevenueModule, MonetizationConfigKey> = {
  paid_chapter: "revenue_share.paid_chapter_creator_percent",
  early_access: "revenue_share.early_access_creator_percent",
  tip: "revenue_share.tip_creator_percent",
  gift: "revenue_share.gift_creator_percent",
  fan_club: "revenue_share.fan_club_creator_percent",
  vip_pool: "revenue_share.vip_creator_pool_percent"
};

const MODULE_PLATFORM_PERCENT_KEY: Partial<Record<CreatorRevenueModule, MonetizationConfigKey>> = {
  paid_chapter: "revenue_share.paid_chapter_platform_percent",
  tip: "revenue_share.tip_platform_percent"
};

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
  if (normalized === "gift") return "gift";
  if (normalized === "fan_club") return "fan_club";
  if (normalized === "vip_pool") return "vip_pool";
  return "paid_chapter";
}

function mapRow(row: Record<string, unknown>): CreatorFeePolicyRow {
  return {
    id: String(row.id),
    creator_id: String(row.creator_id),
    policy_name: String(row.policy_name),
    creator_revenue_share_percent:
      row.creator_revenue_share_percent == null
        ? null
        : numberValue(row.creator_revenue_share_percent),
    platform_fee_percent:
      row.platform_fee_percent == null ? null : numberValue(row.platform_fee_percent),
    payment_processing_fee_percent:
      row.payment_processing_fee_percent == null
        ? null
        : numberValue(row.payment_processing_fee_percent),
    payment_processing_fixed_fee:
      row.payment_processing_fixed_fee == null
        ? null
        : numberValue(row.payment_processing_fixed_fee),
    tip_platform_fee_percent:
      row.tip_platform_fee_percent == null ? null : numberValue(row.tip_platform_fee_percent),
    min_withdraw_amount_override:
      row.min_withdraw_amount_override == null
        ? null
        : numberValue(row.min_withdraw_amount_override),
    allowed_price_steps_override: Array.isArray(row.allowed_price_steps_override)
      ? row.allowed_price_steps_override.map((v) => numberValue(v))
      : null,
    note: (row.note as string | null) ?? null,
    public_note: (row.public_note as string | null) ?? null,
    show_details_to_creator: row.show_details_to_creator !== false,
    status: row.status as CreatorFeePolicyRow["status"],
    starts_at: String(row.starts_at),
    ends_at: row.ends_at ? String(row.ends_at) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
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
    const mapped = mapRow(row as Record<string, unknown>);
    if (isPolicyEffectiveAt(mapped, at)) {
      return mapped;
    }
  }

  return null;
}

function buildDefaultResolved(
  moduleType: CreatorRevenueModule,
  settings: Record<string, unknown>
): ResolvedCreatorFeePolicy {
  const creatorKey = MODULE_CREATOR_PERCENT_KEY[moduleType];
  const platformKey = MODULE_PLATFORM_PERCENT_KEY[moduleType];
  const creatorRevenueSharePercent = numberValue(settings[creatorKey], 0);
  const platformFromConfig = platformKey
    ? numberValue(settings[platformKey], Math.max(0, 100 - creatorRevenueSharePercent))
    : Math.max(0, 100 - creatorRevenueSharePercent);

  return {
    source: "default_config",
    policyId: null,
    policyName: null,
    creatorRevenueSharePercent,
    platformFeePercent: platformFromConfig,
    paymentProcessingFeePercent: numberValue(
      settings["finance.payment_processing_fee_percent"],
      0
    ),
    paymentProcessingFixedFeeVnd: numberValue(
      settings["finance.payment_processing_fixed_fee_vnd"],
      0
    ),
    tipPlatformFeePercent:
      moduleType === "tip"
        ? numberValue(settings["revenue_share.tip_platform_percent"], 0)
        : null,
    minWithdrawAmountOverride: null,
    allowedPriceStepsOverride: null,
    publicNote: null,
    showDetailsToCreator: true,
    revenueBasis: settings["revenue_share.calculate_on_net_after_channel_fee"]
      ? "net"
      : "gross",
    calculateOnNetAfterChannelFee: Boolean(
      settings["revenue_share.calculate_on_net_after_channel_fee"]
    )
  };
}

function buildOverrideResolved(
  policy: CreatorFeePolicyRow,
  defaults: ResolvedCreatorFeePolicy,
  moduleType: CreatorRevenueModule
): ResolvedCreatorFeePolicy {
  const creatorRevenueSharePercent =
    policy.creator_revenue_share_percent ?? defaults.creatorRevenueSharePercent;
  const platformFeePercent =
    policy.platform_fee_percent ??
    (policy.creator_revenue_share_percent != null
      ? Math.max(0, 100 - creatorRevenueSharePercent)
      : defaults.platformFeePercent);

  return {
    source: "creator_override",
    policyId: policy.id,
    policyName: policy.policy_name,
    creatorRevenueSharePercent,
    platformFeePercent,
    paymentProcessingFeePercent:
      policy.payment_processing_fee_percent ?? defaults.paymentProcessingFeePercent,
    paymentProcessingFixedFeeVnd:
      policy.payment_processing_fixed_fee ?? defaults.paymentProcessingFixedFeeVnd,
    tipPlatformFeePercent:
      moduleType === "tip"
        ? (policy.tip_platform_fee_percent ?? defaults.tipPlatformFeePercent)
        : null,
    minWithdrawAmountOverride: policy.min_withdraw_amount_override,
    allowedPriceStepsOverride: policy.allowed_price_steps_override,
    publicNote: policy.public_note,
    showDetailsToCreator: policy.show_details_to_creator,
    revenueBasis: defaults.revenueBasis,
    calculateOnNetAfterChannelFee: defaults.calculateOnNetAfterChannelFee
  };
}

export function toCreatorFeePolicySnapshot(
  resolved: ResolvedCreatorFeePolicy
): CreatorFeePolicySnapshot {
  return {
    policy_source: resolved.source,
    policy_id: resolved.policyId,
    policy_name: resolved.policyName,
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
  const moduleType = mapTransactionTypeToModule(input.transactionType);
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const defaults = buildDefaultResolved(moduleType, settings);

  const policy = await fetchActivePolicyForCreator(input.creatorId, at);
  if (!policy) {
    return defaults;
  }

  return buildOverrideResolved(policy, defaults, moduleType);
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
