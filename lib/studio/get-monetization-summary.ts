import { resolveTransactionKind } from "@/lib/studio/monetization-display-utils";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getCreatorAccessStatus } from "@/lib/creator-access";
import { calculateCreatorEligibility } from "@/lib/monetization/eligibility";
import { getOrCreateCreatorMonetizationProfile } from "@/lib/supabase/creator-monetization";
import { listCreatorPayoutAccounts, listPayoutRequestsForCreator } from "@/lib/supabase/payouts";
import {
  buildStudioMonetizationConfigView,
  isStudioMonetizationModuleEnabled
} from "@/lib/studio/monetization-config";
import { sumLockedFullStoryRevenueForCreator } from "@/lib/monetization/story-completion-escrow";
import { getCreatorRevenuePolicyView } from "@/lib/finance/get-creator-revenue-policy-view";
import { countFullStoryEscrowStories } from "@/lib/studio/get-full-story-escrow-stories-page";
import {
  countCreatorStories,
  countPaidStories,
  getMonetizationGenreOptions
} from "@/lib/studio/monetization-stories-query";
import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";
import type {
  StudioMonetizationGateStatus,
  StudioMonetizationPageData,
  StudioMonetizationRecentTransaction,
  StudioMonetizationWithdrawState
} from "@/types/studio-monetization";

function resolveGateStatus(options: {
  configEnabled: boolean;
  monetizationEnabled: boolean;
  profile: CreatorMonetizationProfile | null;
}): StudioMonetizationGateStatus {
  if (!options.configEnabled) {
    return "disabled";
  }

  if (!options.monetizationEnabled) {
    return "admin_disabled";
  }

  if (options.profile?.status === "suspended") {
    return "suspended";
  }

  if (options.profile?.status === "rejected") {
    return "rejected";
  }

  return "approved";
}

function formatVnd(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function periodStartIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function transactionTypeLabel(type: string, source: string) {
  if (type === "chapter_unlock" || type === "story_unlock" || source === "unlock") {
    return "Mở khóa chương";
  }
  if (type === "author_tip" || type === "virtual_gift" || source === "tip") {
    return "Tip";
  }
  if (type === "reversal" || type === "refund") {
    return "Hoàn tiền";
  }
  if (
    type === "admin_coin_adjustment" ||
    type === "creator_revenue_adjustment" ||
    source === "admin"
  ) {
    return "Điều chỉnh bởi admin";
  }
  return "Giao dịch";
}

function transactionStatusLabel(status: string) {
  if (status === "completed" || status === "settled") return "Hoàn tất";
  if (status === "pending") return "Đang xử lý";
  if (status === "failed" || status === "reversed") return "Không thành công";
  return status;
}

function buildWithdrawState(options: {
  configPayoutsEnabled: boolean;
  creatorAccess: Awaited<ReturnType<typeof getCreatorAccessStatus>>;
  availableRevenueVnd: number;
  minWithdrawAmountVnd: number;
}): StudioMonetizationWithdrawState {
  let blockReason: string | null = null;
  let amountNeededVnd: number | null = null;

  if (!options.configPayoutsEnabled) {
    blockReason = "Rút tiền đang tắt trên toàn nền tảng.";
  } else if (!options.creatorAccess.withdrawalEnabled) {
    blockReason =
      options.creatorAccess.withdrawalDisabledReason ??
      "Tài khoản của bạn đang bị khóa rút tiền. Vui lòng xem thông báo từ ChapMee.";
  } else if (options.availableRevenueVnd < options.minWithdrawAmountVnd) {
    amountNeededVnd = formatVnd(options.minWithdrawAmountVnd - options.availableRevenueVnd);
    blockReason = `Bạn cần thêm ${amountNeededVnd.toLocaleString("vi-VN")} ₫ để đạt mức rút tối thiểu.`;
  }

  const canRequestWithdrawal =
    options.configPayoutsEnabled &&
    options.creatorAccess.withdrawalEnabled &&
    options.availableRevenueVnd >= options.minWithdrawAmountVnd;

  return {
    canRequestWithdrawal,
    blockReason,
    amountNeededVnd
  };
}

export async function getStudioMonetizationSummary(
  creatorProfile: CreatorProfile,
  profileUserId: string
): Promise<StudioMonetizationPageData> {
  const config = await buildStudioMonetizationConfigView({ includePrivate: true });

  const configEnabled = isStudioMonetizationModuleEnabled(config);

  const [
    eligibility,
    profileResult,
    walletResult,
    payoutAccounts,
    payoutRequests,
    storiesCountResult,
    genreOptions
  ] = await Promise.all([
    calculateCreatorEligibility(profileUserId),
    getOrCreateCreatorMonetizationProfile(profileUserId),
    configEnabled ? getOrCreateCreatorWallet(profileUserId) : Promise.resolve({ data: null, error: null }),
    configEnabled
      ? listCreatorPayoutAccounts(profileUserId)
      : Promise.resolve({ data: [], error: null }),
    configEnabled
      ? listPayoutRequestsForCreator(profileUserId, 10)
      : Promise.resolve({ data: [], error: null }),
    countCreatorStories(creatorProfile.id),
    getMonetizationGenreOptions(creatorProfile.id)
  ]);

  const profile = profileResult.data;
  const wallet = walletResult.data;
  const availableRevenueVnd = formatVnd(wallet?.available_revenue_vnd ?? 0);

  const creatorAccess = await getCreatorAccessStatus(profileUserId, {
    minWithdrawAmountVnd: config.minWithdrawAmountVnd,
    availableBalanceVnd: availableRevenueVnd
  });

  const gateStatus = resolveGateStatus({
    configEnabled,
    monetizationEnabled: creatorAccess.monetizationEnabled,
    profile
  });

  const canConfigure = configEnabled && creatorAccess.monetizationEnabled;

  const emptyOverview = {
    availableRevenueVnd: 0,
    pendingRevenueVnd: 0,
    lockedRevenueVnd: 0,
    totalEarnedVnd: 0,
    totalWithdrawnVnd: 0,
    tipsReceivedVnd: 0,
    paidUnlockCount: 0,
    paidUnlockRevenueVnd: 0,
    chapterUnlockRevenueVnd: 0,
    fullAccessRevenueVnd: 0,
    lockedFullStoryRevenueVnd: 0,
    fullStoryEscrowStoriesCount: 0,
    grossRevenueVnd: 0,
    platformFeeVnd: 0,
    creatorNetRevenueVnd: 0,
    revenue7dVnd: 0,
    revenue30dVnd: 0,
    paidStoriesCount: 0,
    hasWallet: false
  };

  const withdrawState = buildWithdrawState({
    configPayoutsEnabled: config.payoutsEnabled,
    creatorAccess,
    availableRevenueVnd,
    minWithdrawAmountVnd: config.minWithdrawAmountVnd
  });

  if (!configEnabled) {
    return {
      gateStatus: "disabled",
      canConfigure: false,
      creatorAccess,
      config,
      overview: emptyOverview,
      eligibility,
      profile,
      storiesTotalCount: 0,
      genreOptions: [],
      recentTransactions: [],
      withdrawState,
      wallet: null,
      payoutAccounts: [],
      payoutRequests: [],
      revenuePolicy: null,
      error: null
    };
  }

  const supabase = await createClient();

  let tipsReceivedVnd = 0;
  let paidUnlockCount = 0;
  let paidUnlockRevenueVnd = 0;
  let chapterUnlockRevenueVnd = 0;
  let fullAccessRevenueVnd = 0;
  let grossRevenueVnd = 0;
  let platformFeeVnd = 0;
  let creatorNetRevenueVnd = 0;
  let revenue7dVnd = 0;
  let revenue30dVnd = 0;
  let recentTransactions: StudioMonetizationRecentTransaction[] = [];

  const iso7d = periodStartIso(7);
  const iso30d = periodStartIso(30);

  if (canConfigure) {
    const { data: txRows } = await supabase
      .from("transactions")
      .select(
        "id, story_id, chapter_id, type, source, net_amount_vnd, creator_gross_vnd, platform_fee_vnd, status, created_at, coin_amount"
      )
      .eq("creator_user_id", profileUserId)
      .order("created_at", { ascending: false })
      .limit(200);

    const storyIds = [
      ...new Set((txRows ?? []).map((row) => row.story_id).filter(Boolean) as string[])
    ];
    const chapterIds = [
      ...new Set((txRows ?? []).map((row) => row.chapter_id).filter(Boolean) as string[])
    ];

    const [{ data: stories }, { data: chapters }] = await Promise.all([
      storyIds.length > 0
        ? supabase.from("stories").select("id, title").in("id", storyIds)
        : Promise.resolve({ data: [] }),
      chapterIds.length > 0
        ? supabase.from("episodes").select("id, title, episode_number").in("id", chapterIds)
        : Promise.resolve({ data: [] })
    ]);

    const storyTitle = new Map((stories ?? []).map((row) => [row.id as string, String(row.title)]));
    const episodeTitle = new Map(
      (chapters ?? []).map((row) => [
        row.id as string,
        row.title ? String(row.title) : `Chương ${row.episode_number ?? "?"}`
      ])
    );

    for (const tx of txRows ?? []) {
      if (tx.status !== "completed") {
        continue;
      }

      const net = Number(tx.net_amount_vnd ?? tx.creator_gross_vnd ?? 0);
      const gross = Number(tx.creator_gross_vnd ?? net);
      const fee = Number(tx.platform_fee_vnd ?? Math.max(0, gross - net));
      const createdAt = String(tx.created_at);

      creatorNetRevenueVnd += net;
      grossRevenueVnd += gross;
      platformFeeVnd += fee;

      if (createdAt >= iso7d) {
        revenue7dVnd += net;
      }
      if (createdAt >= iso30d) {
        revenue30dVnd += net;
      }

      if (tx.type === "author_tip" || tx.type === "virtual_gift" || tx.source === "tip") {
        tipsReceivedVnd += net;
      }

      if (tx.type === "chapter_unlock" || tx.type === "story_unlock" || tx.source === "unlock") {
        paidUnlockCount += 1;
        paidUnlockRevenueVnd += net;
        if (tx.type === "story_unlock") {
          fullAccessRevenueVnd += net;
        } else {
          chapterUnlockRevenueVnd += net;
        }
      }
    }

    recentTransactions = (txRows ?? []).slice(0, 8).map((tx) => {
      const storyId = tx.story_id as string | null;
      const chapterId = tx.chapter_id as string | null;
      const contentParts = [
        storyId ? storyTitle.get(storyId) : null,
        chapterId ? episodeTitle.get(chapterId) : null
      ].filter(Boolean);

      return {
        id: String(tx.id),
        typeLabel: transactionTypeLabel(String(tx.type), String(tx.source ?? "")),
        amountVnd: formatVnd(Number(tx.net_amount_vnd ?? tx.creator_gross_vnd ?? 0)),
        coinAmount:
          tx.coin_amount != null && Number.isFinite(Number(tx.coin_amount))
            ? Number(tx.coin_amount)
            : null,
        contentLabel: contentParts.join(" · ") || "—",
        createdAt: String(tx.created_at),
        status: String(tx.status),
        statusLabel: transactionStatusLabel(String(tx.status)),
        kind: resolveTransactionKind(String(tx.type), String(tx.source ?? ""))
      };
    });
  }

  const paidStoriesCount = await countPaidStories(creatorProfile.id);
  const lockedFullStoryRevenueVnd = canConfigure
    ? formatVnd(await sumLockedFullStoryRevenueForCreator(profileUserId))
    : 0;
  const fullStoryEscrowStoriesCount = canConfigure
    ? await countFullStoryEscrowStories(creatorProfile.id, profileUserId)
    : 0;

  const revenuePolicy = canConfigure
    ? await getCreatorRevenuePolicyView(profileUserId)
    : null;

  return {
    gateStatus,
    canConfigure,
    creatorAccess,
    config,
    overview: {
      availableRevenueVnd,
      pendingRevenueVnd: formatVnd(wallet?.pending_revenue_vnd ?? 0),
      lockedRevenueVnd: formatVnd(wallet?.locked_revenue_vnd ?? 0),
      totalEarnedVnd: formatVnd(wallet?.total_earned_vnd ?? 0),
      totalWithdrawnVnd: formatVnd(wallet?.total_withdrawn_vnd ?? 0),
      tipsReceivedVnd: formatVnd(tipsReceivedVnd),
      paidUnlockCount,
      paidUnlockRevenueVnd: formatVnd(paidUnlockRevenueVnd),
      chapterUnlockRevenueVnd: formatVnd(chapterUnlockRevenueVnd),
      fullAccessRevenueVnd: formatVnd(fullAccessRevenueVnd),
      lockedFullStoryRevenueVnd,
      fullStoryEscrowStoriesCount,
      grossRevenueVnd: formatVnd(grossRevenueVnd || wallet?.total_earned_vnd || 0),
      platformFeeVnd: formatVnd(platformFeeVnd),
      creatorNetRevenueVnd: formatVnd(
        creatorNetRevenueVnd ||
          (wallet?.available_revenue_vnd ?? 0) + (wallet?.pending_revenue_vnd ?? 0)
      ),
      revenue7dVnd: formatVnd(revenue7dVnd),
      revenue30dVnd: formatVnd(revenue30dVnd),
      paidStoriesCount,
      hasWallet: Boolean(wallet)
    },
    eligibility,
    profile,
    storiesTotalCount: storiesCountResult.count,
    genreOptions,
    recentTransactions,
    withdrawState,
    wallet,
    payoutAccounts: payoutAccounts.data,
    payoutRequests: payoutRequests.data,
    revenuePolicy,
    error: profileResult.error ?? storiesCountResult.error
  };
}
