import { getMonetizationConfig } from "@/lib/monetization/config";
import { readPayoutProcessingDaysLabel } from "@/lib/finance/payout-processing-display";
import { getCreatorAccessStatus } from "@/lib/creator-access";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { createClient } from "@/lib/data/server";
import {
  CREATOR_FEE_REVENUE_SOURCES
} from "@/lib/admin/creator-fee-policies/constants";
import { mapCreatorFeePolicyRow, normalizeRevenueSharePercents } from "@/lib/admin/creator-fee-policy-shared";
import {
  buildDefaultSourceRates,
  resolveCreatorFeePolicyForSource
} from "@/lib/finance/resolve-creator-fee-policy";
import type { CreatorFeePolicyRow, CreatorFeeRevenueSourceId } from "@/types/creator-fee-policy";
import type { StudioCreatorRevenuePolicyView } from "@/types/studio-monetization";

const POLICY_TABLE_SOURCES: Array<{
  id: CreatorFeeRevenueSourceId | "full_story";
  label: string;
  resolveAs: CreatorFeeRevenueSourceId;
  note: string;
}> = [
  {
    id: "paid_chapter",
    label: "Chương trả phí",
    resolveAs: "paid_chapter",
    note: "Theo giá từng chương"
  },
  {
    id: "full_story",
    label: "Trọn bộ",
    resolveAs: "paid_chapter",
    note: "Giữ tiền nếu chưa hoàn thành"
  },
  {
    id: "tip",
    label: "Tip",
    resolveAs: "tip",
    note: "Theo cài đặt tip"
  }
];

function formatPolicyDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function fetchActiveOverridePolicy(
  creatorId: string,
  at: Date
): Promise<CreatorFeePolicyRow | null> {
  const db = await createClient();
  const { data } = await db
    .from("creator_fee_policies")
    .select("*")
    .eq("creator_id", creatorId)
    .in("status", ["active", "scheduled"])
    .lte("starts_at", at.toISOString())
    .or(`ends_at.is.null,ends_at.gte.${at.toISOString()}`)
    .order("starts_at", { ascending: false })
    .limit(5);

  if (!data?.length) return null;

  for (const row of data) {
    const mapped = mapCreatorFeePolicyRow(row as Record<string, unknown>);
    const starts = new Date(mapped.starts_at).getTime();
    const ends = mapped.ends_at ? new Date(mapped.ends_at).getTime() : null;
    const ts = at.getTime();
    if (starts <= ts && (ends == null || ends >= ts)) {
      return mapped;
    }
  }
  return null;
}

async function fetchScheduledPolicy(creatorId: string, after: Date) {
  const db = await createClient();
  const { data } = await db
    .from("creator_fee_policies")
    .select("*")
    .eq("creator_id", creatorId)
    .in("status", ["active", "scheduled"])
    .gt("starts_at", after.toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ? mapCreatorFeePolicyRow(data as Record<string, unknown>) : null;
}

function splitCoinExample(coinPrice: number, authorPercent: number, platformPercent: number) {
  const normalized = normalizeRevenueSharePercents(authorPercent, platformPercent);
  const authorCoin = Math.round((coinPrice * normalized.authorPercent) / 100);
  const platformCoin = Math.max(0, coinPrice - authorCoin);
  return { authorCoin, platformCoin, ...normalized };
}

export async function getCreatorRevenuePolicyView(
  creatorUserId: string
): Promise<StudioCreatorRevenuePolicyView> {
  const now = new Date();
  const [config, { settings }, activeOverride, scheduledPolicy, creatorAccess] =
    await Promise.all([
      buildStudioMonetizationConfigView({ includePrivate: true }),
      getMonetizationConfig({ includePrivate: true }),
      fetchActiveOverridePolicy(creatorUserId, now),
      fetchScheduledPolicy(creatorUserId, now),
      getCreatorAccessStatus(creatorUserId, {
        minWithdrawAmountVnd: 0,
        availableBalanceVnd: 0
      })
    ]);

  const hasOverride = Boolean(activeOverride);
  const showDetails = !hasOverride || activeOverride?.show_details_to_creator !== false;

  const sourceRows = await Promise.all(
    POLICY_TABLE_SOURCES.map(async (source) => {
      const resolved = await resolveCreatorFeePolicyForSource({
        creatorId: creatorUserId,
        revenueSource: source.resolveAs,
        occurredAt: now,
        policyOverride: activeOverride
      });

      const share = normalizeRevenueSharePercents(
        resolved.creatorRevenueSharePercent,
        resolved.platformFeePercent
      );

      return {
        id: source.id,
        label: source.label,
        authorPercent: share.authorPercent,
        platformPercent: share.platformPercent,
        note: source.note
      };
    })
  );

  const exampleCoin = config.paidChapterDefaultCoinPrice;
  const paidChapterRow = sourceRows.find((row) => row.id === "paid_chapter");
  const example = splitCoinExample(
    exampleCoin,
    paidChapterRow?.authorPercent ?? config.revenueSharePaidChapterCreatorPercent,
    paidChapterRow?.platformPercent ??
      100 - config.revenueSharePaidChapterCreatorPercent
  );

  const minWithdrawVnd =
    activeOverride?.min_withdraw_amount_override != null
      ? Number(activeOverride.min_withdraw_amount_override)
      : config.minWithdrawAmountVnd;

  const holdDaysAfterCompletion = Number(
    (settings as Record<string, unknown>)["payout.hold_days"] ?? config.payoutHoldDays ?? 0
  );
  const processingDaysLabel = readPayoutProcessingDaysLabel(
    settings as Record<string, unknown>
  );


  return {
    badgeLabel: hasOverride ? "Chính sách riêng" : "Theo chính sách mặc định",
    policyName: activeOverride?.policy_name ?? null,
    effectiveFromLabel: hasOverride
      ? formatPolicyDate(activeOverride?.starts_at ?? null)
      : null,
    scheduledChangeLabel: scheduledPolicy
      ? formatPolicyDate(scheduledPolicy.starts_at)
      : null,
    scheduledPolicyName: scheduledPolicy?.policy_name ?? null,
    publicNote: activeOverride?.public_note ?? null,
    showDetails,
    sourceRows,
    paidChapterExample: {
      coinPrice: exampleCoin,
      authorCoin: example.authorCoin,
      platformCoin: example.platformCoin,
      coinDisplayName: config.coinDisplayName
    },
    tipNote: undefined,
    fullStoryHoldRules: [
      "Doanh thu bán trọn bộ của truyện chưa hoàn thành sẽ được giữ lại, chưa cho rút.",
      "Chỉ mở khóa khi truyện được đánh dấu hoàn thành và admin xác nhận hoàn thành.",
      holdDaysAfterCompletion > 0
        ? `Sau khi admin xác nhận hoàn thành, doanh thu có thể được giữ thêm ${holdDaysAfterCompletion} ngày theo chính sách nền tảng.`
        : "Sau khi admin xác nhận hoàn thành, doanh thu trọn bộ được mở khóa để rút (nếu đủ điều kiện khác)."
    ],
    fullStoryHoldDaysAfterCompletion: holdDaysAfterCompletion,
    withdrawal: {
      minWithdrawVnd,
      processingDaysLabel,
      requiresAdminApproval: Boolean(settings["payout.manual_review_required"] ?? true),
      requiresIdentityVerification: config.payoutKycRequired,
      requiresPin: Boolean(settings["payout.withdrawal_pin_required"] ?? true),
      platformWithdrawalsEnabled: config.payoutsEnabled,
      creatorWithdrawalBlocked: !creatorAccess.withdrawalEnabled,
      creatorWithdrawalBlockReason: creatorAccess.withdrawalDisabledReason
    },
    coinToVndRate: config.coinExchangeRateVnd,
    coinDisplayName: config.coinDisplayName
  };
}

export async function getOptionalRevenueSourceRows(creatorUserId: string) {
  const defaults = await buildDefaultSourceRates();
  const optionalSources = CREATOR_FEE_REVENUE_SOURCES.filter(
    (source) =>
      !["paid_chapter", "tip"].includes(source.id) &&
      defaults[source.id as CreatorFeeRevenueSourceId]
  );

  const rows = await Promise.all(
    optionalSources.map(async (source) => {
      const resolved = await resolveCreatorFeePolicyForSource({
        creatorId: creatorUserId,
        revenueSource: source.id as CreatorFeeRevenueSourceId
      });
      const share = normalizeRevenueSharePercents(
        resolved.creatorRevenueSharePercent,
        resolved.platformFeePercent
      );
      return {
        id: source.id,
        label: source.label,
        authorPercent: share.authorPercent,
        platformPercent: share.platformPercent,
        note: "Theo cấu hình nền tảng"
      };
    })
  );

  return rows.filter(
    (row) => row.authorPercent !== 70 || row.platformPercent !== 30
  );
}
