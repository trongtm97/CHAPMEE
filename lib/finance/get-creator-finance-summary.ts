import { createClient } from "@/lib/supabase/server";
import { getCreatorAccessStatus } from "@/lib/creator-access";
import { getCreatorFinanceConfig } from "@/lib/finance/get-creator-finance-config";
import { calculateCreatorBalance } from "@/lib/finance/calculate-creator-balance";
import { resolveStudioFinanceEligibility } from "@/lib/finance/finance-eligibility";
import { getFinanceIdentityStatus } from "@/lib/finance/get-finance-identity-status";
import { mapBankAccountViews } from "@/lib/finance/map-bank-account-view";
import { getCreatorEarningAggregates } from "@/lib/finance/get-creator-earning-aggregates";
import {
  listCreatorWalletLedger,
  listFinanceSecurityLogs,
  getCreatorWithdrawalSecurity
} from "@/lib/supabase/creator-finance";
import {
  mapPayoutStatusToUi,
  withdrawalStatusLabel
} from "@/lib/finance/withdrawal-status";
import { listCreatorPayoutAccounts, listPayoutRequestsForCreator } from "@/lib/supabase/payouts";
import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import type {
  CreatorEarningSourceType,
  EarningsBreakdownRow,
  EarningsPeriodFilter,
  StudioFinancePageData,
  WithdrawalHistoryRow
} from "@/types/finance";
import type { PayoutMethod } from "@/types/payout";

const METHOD_LABELS: Record<PayoutMethod, string> = {
  bank_transfer: "Chuyển khoản ngân hàng",
  momo: "MoMo",
  zalopay: "ZaloPay",
  manual: "Thủ công (admin xử lý)"
};

const EARNING_SOURCE_LABELS: Record<CreatorEarningSourceType, string> = {
  chapter_unlock: "Mở khóa chương",
  story_unlock: "Mở khóa truyện",
  tip: "Tip / ủng hộ",
  bonus: "Bonus",
  adjustment: "Điều chỉnh"
};

function periodStart(filter: EarningsPeriodFilter): string | null {
  if (filter === "all") return null;
  const days = filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function revenueSourceLabel(type: string, source: string): string {
  if (type === "chapter_unlock") return "Mở khóa chương";
  if (type === "story_unlock") return "Mở khóa truyện";
  if (type === "author_tip" || type === "virtual_gift" || source === "tip") return "Tip";
  if (type === "creator_bonus") return "Bonus";
  if (type === "admin_coin_adjustment" || type === "reversal") return "Điều chỉnh";
  if (type === "creator_revenue_share") return "Doanh thu tác giả";
  return type;
}

function formatPayoutMasked(snapshot: Record<string, unknown> | null): string {
  if (!snapshot) return "—";
  const bank = snapshot.bank_account_number_masked as string | undefined;
  const wallet = snapshot.wallet_phone_masked as string | undefined;
  const holder = snapshot.account_holder_name as string | undefined;
  const masked = bank ?? wallet ?? "—";
  return holder ? `${holder} · ${masked}` : masked;
}

export async function getCreatorFinanceSummary(input: {
  creatorUserId: string;
  earningsFilter?: EarningsPeriodFilter;
}): Promise<StudioFinancePageData & { payoutAccounts: Awaited<ReturnType<typeof listCreatorPayoutAccounts>>["data"] }> {
  const earningsFilter = input.earningsFilter ?? "30d";
  const config = await getCreatorFinanceConfig();

  const [
    creatorAccess,
    balanceResult,
    aggregatesResult,
    walletResult,
    ledgerResult,
    securityLogsResult,
    securityResult,
    payoutAccounts,
    payoutRequests,
    identityResult
  ] = await Promise.all([
    getCreatorAccessStatus(input.creatorUserId, {
      minWithdrawAmountVnd: config.minWithdrawAmountVnd,
      availableBalanceVnd: 0
    }),
    calculateCreatorBalance(input.creatorUserId),
    getCreatorEarningAggregates(input.creatorUserId),
    getOrCreateCreatorWallet(input.creatorUserId),
    listCreatorWalletLedger(input.creatorUserId, 80),
    listFinanceSecurityLogs(input.creatorUserId, 40),
    getCreatorWithdrawalSecurity(input.creatorUserId),
    listCreatorPayoutAccounts(input.creatorUserId),
    listPayoutRequestsForCreator(input.creatorUserId, 30),
    getFinanceIdentityStatus(input.creatorUserId)
  ]);

  const supabase = await createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();
  const userEmail = authUser?.email ?? null;

  const fromIso = periodStart(earningsFilter);

  let earningsQuery = supabase
    .from("creator_earning_transactions")
    .select(
      "id, created_at, story_id, chapter_id, source_type, status, gross_amount_vnd, platform_fee_vnd, payment_processing_fee_vnd, tax_or_adjustment_vnd, creator_net_amount_vnd, coin_amount"
    )
    .eq("creator_user_id", input.creatorUserId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (fromIso) {
    earningsQuery = earningsQuery.gte("created_at", fromIso);
  }

  const { data: earningRows, error: earningError } = await earningsQuery;

  const storyIds = [
    ...new Set((earningRows ?? []).map((row) => row.story_id).filter(Boolean) as string[])
  ];
  const chapterIds = [
    ...new Set((earningRows ?? []).map((row) => row.chapter_id).filter(Boolean) as string[])
  ];

  const [{ data: stories }, { data: chapters }] = await Promise.all([
    storyIds.length > 0
      ? supabase.from("stories").select("id, title").in("id", storyIds)
      : Promise.resolve({ data: [] }),
    chapterIds.length > 0
      ? supabase.from("episodes").select("id, title, episode_number").in("id", chapterIds)
      : Promise.resolve({ data: [] })
  ]);

  const storyTitle = new Map((stories ?? []).map((s) => [s.id as string, s.title as string]));
  const chapterLabel = new Map(
    (chapters ?? []).map((c) => [
      c.id as string,
      c.title ? String(c.title) : `Chương ${c.episode_number ?? "?"}`
    ])
  );

  let earningsRows: EarningsBreakdownRow[] = (earningRows ?? []).map((tx) => {
    const gross = Number(tx.gross_amount_vnd ?? 0);
    const platformFee = Number(tx.platform_fee_vnd ?? 0);
    const paymentProcessingFee = Number(tx.payment_processing_fee_vnd ?? 0);
    const taxOrAdjustment = Number(tx.tax_or_adjustment_vnd ?? 0);
    const totalFees = platformFee + paymentProcessingFee + taxOrAdjustment;
    const net = Number(tx.creator_net_amount_vnd ?? 0);
    const storyId = tx.story_id as string | null;
    const chapterId = tx.chapter_id as string | null;
    const sourceType = tx.source_type as CreatorEarningSourceType;
    const contentLabel =
      [storyId ? storyTitle.get(storyId) : null, chapterId ? chapterLabel.get(chapterId) : null]
        .filter(Boolean)
        .join(" · ") || "—";

    return {
      id: String(tx.id),
      createdAt: String(tx.created_at),
      contentLabel,
      sourceLabel: EARNING_SOURCE_LABELS[sourceType] ?? String(sourceType),
      grossVnd: gross,
      platformFeeVnd: platformFee,
      paymentProcessingFeeVnd: paymentProcessingFee,
      taxOrAdjustmentVnd: taxOrAdjustment,
      totalFeesVnd: totalFees,
      creatorNetVnd: net,
      status: String(tx.status),
      storyId,
      chapterId,
      coinAmount: tx.coin_amount == null ? null : Number(tx.coin_amount)
    };
  });

  let txError: string | null = earningError?.message ?? null;

  if (earningsRows.length === 0) {
    let legacyQuery = supabase
      .from("transactions")
      .select(
        "id, created_at, story_id, chapter_id, type, source, status, creator_gross_vnd, platform_fee_vnd, creator_net_vnd, net_amount_vnd, metadata"
      )
      .eq("creator_user_id", input.creatorUserId)
      .in("type", [
        "chapter_unlock",
        "story_unlock",
        "author_tip",
        "virtual_gift",
        "creator_revenue_share",
        "creator_bonus",
        "reversal",
        "admin_coin_adjustment"
      ])
      .order("created_at", { ascending: false })
      .limit(200);

    if (fromIso) {
      legacyQuery = legacyQuery.gte("created_at", fromIso);
    }

    const { data: txRows, error: legacyError } = await legacyQuery;
    txError = legacyError?.message ?? txError;

    const legacyStoryIds = [
      ...new Set((txRows ?? []).map((row) => row.story_id).filter(Boolean) as string[])
    ];
    const legacyChapterIds = [
      ...new Set((txRows ?? []).map((row) => row.chapter_id).filter(Boolean) as string[])
    ];

    const [{ data: legacyStories }, { data: legacyChapters }] = await Promise.all([
      legacyStoryIds.length > 0
        ? supabase.from("stories").select("id, title").in("id", legacyStoryIds)
        : Promise.resolve({ data: [] }),
      legacyChapterIds.length > 0
        ? supabase.from("episodes").select("id, title, episode_number").in("id", legacyChapterIds)
        : Promise.resolve({ data: [] })
    ]);

    const legacyStoryTitle = new Map(
      (legacyStories ?? []).map((s) => [s.id as string, s.title as string])
    );
    const legacyChapterLabel = new Map(
      (legacyChapters ?? []).map((c) => [
        c.id as string,
        c.title ? String(c.title) : `Chương ${c.episode_number ?? "?"}`
      ])
    );

    earningsRows = (txRows ?? []).map((tx) => {
      const meta = (tx.metadata as Record<string, unknown>) ?? {};
      const gross = Number(
        tx.creator_gross_vnd ?? meta.gross_value_vnd ?? tx.net_amount_vnd ?? 0
      );
      const platformFee = Number(tx.platform_fee_vnd ?? meta.platform_revenue_vnd ?? 0);
      const processingFee = Number(
        (meta.provider_fee_vnd as number | undefined) ?? 0
      ) + Number((meta.store_fee_vnd as number | undefined) ?? 0);
      const net = Number(tx.creator_net_vnd ?? tx.net_amount_vnd ?? gross - platformFee - processingFee);
      const storyId = tx.story_id as string | null;
      const chapterId = tx.chapter_id as string | null;
      const contentLabel =
        [
          storyId ? legacyStoryTitle.get(storyId) : null,
          chapterId ? legacyChapterLabel.get(chapterId) : null
        ]
          .filter(Boolean)
          .join(" · ") || "—";

      return {
        id: String(tx.id),
        createdAt: String(tx.created_at),
        contentLabel,
        sourceLabel: revenueSourceLabel(String(tx.type), String(tx.source ?? "")),
        grossVnd: gross,
        platformFeeVnd: platformFee,
        paymentProcessingFeeVnd: processingFee,
        taxOrAdjustmentVnd: 0,
        totalFeesVnd: platformFee + processingFee,
        creatorNetVnd: net,
        status: String(tx.status),
        storyId,
        chapterId,
        coinAmount: null
      };
    });
  }

  const withdrawalHistory: WithdrawalHistoryRow[] = (payoutRequests.data ?? []).map((req) => {
    const ui = mapPayoutStatusToUi(req.status);
    const processedAt = req.completed_at ?? req.reviewed_at ?? null;
    return {
      id: req.id,
      amountVnd: req.amount_vnd,
      method: req.method,
      methodLabel: METHOD_LABELS[req.method],
      payoutMasked: formatPayoutMasked(req.payout_account_snapshot),
      status: ui,
      statusLabel: withdrawalStatusLabel(ui),
      requestedAt: req.requested_at,
      processedAt,
      adminNote: req.admin_note,
      creatorNote: (req as { creator_note?: string | null }).creator_note ?? null,
      rawStatus: req.status
    };
  });

  const pendingWithdrawalVnd = withdrawalHistory
    .filter((row) => ["pending", "approved", "processing"].includes(row.status))
    .reduce((sum, row) => sum + row.amountVnd, 0);

  const pinLocked = Boolean(
    securityResult.data?.locked_until &&
      new Date(securityResult.data.locked_until).getTime() > Date.now()
  );

  const accountsList = payoutAccounts.data ?? [];
  const availableBalanceVnd = balanceResult.data?.availableBalanceVnd ?? 0;
  const identity = identityResult;
  const bankAccounts = mapBankAccountViews(accountsList, identity);

  const eligibility = resolveStudioFinanceEligibility({
    config,
    creatorAccessWithdrawalEnabled: creatorAccess.withdrawalEnabled,
    creatorAccessWithdrawalDisabledReason: creatorAccess.withdrawalDisabledReason,
    identity,
    bankAccounts,
    pinConfigured: Boolean(securityResult.data?.pin_hash),
    pinLocked,
    availableBalanceVnd
  });

  const withdrawBlockReason = eligibility.primaryBlockReason;
  const canWithdraw = eligibility.canWithdraw;

  const balance = balanceResult.data ?? {
    availableBalanceVnd: 0,
    pendingBalanceVnd: 0,
    lockedBalanceVnd: 0,
    totalEarnedVnd: 0,
    totalWithdrawnVnd: 0,
    monthEarningsVnd: 0,
    ledgerCreditsVnd: 0,
    ledgerDebitsVnd: 0,
    ledgerHoldsVnd: 0,
    totalGrossRevenueVnd: 0,
    totalFeesDeductedVnd: 0,
    totalNetReceivedVnd: 0,
    pendingWithdrawalVnd: 0
  };

  balance.totalGrossRevenueVnd = aggregatesResult.totalGrossRevenueVnd;
  balance.totalFeesDeductedVnd = aggregatesResult.totalFeesDeductedVnd;
  balance.totalNetReceivedVnd = aggregatesResult.totalNetReceivedVnd;
  balance.pendingWithdrawalVnd = pendingWithdrawalVnd;

  if (balance.monthEarningsVnd === 0 && earningsRows.length > 0) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    balance.monthEarningsVnd = earningsRows
      .filter((row) => new Date(row.createdAt) >= monthStart && row.status === "settled")
      .reduce((sum, row) => sum + row.creatorNetVnd, 0);
  }

  return {
    config,
    balance,
    wallet: walletResult.data,
    earningsRows,
    earningsFilter,
    ledgerRows: ledgerResult.data,
    withdrawalHistory,
    securityLogs: securityLogsResult.data,
    pinConfigured: Boolean(securityResult.data?.pin_hash),
    pinLocked,
    pinLockedUntil: securityResult.data?.locked_until ?? null,
    payoutsEnabled: config.withdrawalsEnabled,
    canWithdraw,
    withdrawBlockReason,
    payoutProfile: null,
    userEmail,
    identity,
    bankAccounts,
    eligibility,
    payoutAccounts: accountsList,
    error: txError ?? balanceResult.error ?? ledgerResult.error ?? aggregatesResult.error ?? null
  };
}
