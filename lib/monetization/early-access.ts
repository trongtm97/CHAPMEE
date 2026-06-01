"use server";

import { randomUUID } from "crypto";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { calculateCreatorRevenue } from "@/lib/monetization/creator-revenue";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import {
  createEarlyAccessUnlock,
  getChapterEarlyAccessSetting,
  getEarlyAccessUnlockByUser
} from "@/lib/supabase/early-access";
import { createClient } from "@/lib/supabase/server";
import { recordCreatorNetEarning } from "@/lib/finance/record-creator-net-earning";
import { calculateWalletBalance, debitUserCoins } from "@/lib/wallets/user-wallet";
import { addRiskEvent, detectRapidSpendAfterRewardAds, shouldBlockTransaction, shouldHoldCreatorRevenue } from "@/lib/risk/risk-engine";
import type { CoinLotAllocation } from "@/types/coin-lot";

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hoursUntil(dateIso: string) {
  const now = Date.now();
  const target = new Date(dateIso).getTime();
  return Math.max(0, Math.ceil((target - now) / (60 * 60 * 1000)));
}

export async function getEarlyAccessReaderState(input: {
  userId: string | null;
  storyId: string;
  chapterId: string;
  creatorUserId: string | null;
}) {
  const config = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["early_access.enabled"]);
  if (!enabled || !input.creatorUserId) {
    return { locked: false as const };
  }

  const setting = await getChapterEarlyAccessSetting(input.chapterId);
  if (!setting.data?.enabled || !setting.data.free_at) {
    return { locked: false as const };
  }

  if (new Date(setting.data.free_at).getTime() <= Date.now()) {
    return { locked: false as const };
  }

  if (input.userId) {
    const unlocked = await getEarlyAccessUnlockByUser(input.userId, input.chapterId);
    if (unlocked.data) {
      return { locked: false as const };
    }
  }

  const coinPrice = Math.max(
    toNumber(config.settings["early_access.min_coin_price"], 1),
    toNumber(
      setting.data.coin_price,
      toNumber(config.settings["early_access.default_coin_price"], 10)
    )
  );
  const wallet = input.userId ? await calculateWalletBalance(input.userId) : null;
  const purchasePolicy = await getPurchaseUiPolicyForRequest();

  return {
    locked: true as const,
    coinPrice,
    freeAt: setting.data.free_at,
    remainingHours: hoursUntil(setting.data.free_at),
    purchaseEnabled:
      Boolean(config.settings["coin.purchase_enabled"]) &&
      !purchasePolicy.hideTopUp &&
      purchasePolicy.showSePayTopUp,
    purchaseMode: purchasePolicy.purchaseMode,
    walletBalance: (wallet?.data?.paid_coin_balance ?? 0) + (wallet?.data?.bonus_coin_balance ?? 0)
  };
}

export async function unlockEarlyAccessAction(input: {
  storyId: string;
  chapterId: string;
  requestId?: string;
}) {
  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để đọc sớm." };
  }

  try {
    await assertActionAccess("wallet.purchase");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const requestId = input.requestId?.trim() || randomUUID();
  if (await shouldBlockTransaction(user.id, "chapter_unlock")) {
    await addRiskEvent({
      userId: user.id,
      eventType: "transaction_flagged",
      severity: "high",
      reason: "Early access unlock bị chặn bởi risk profile.",
      metadata: { story_id: input.storyId, chapter_id: input.chapterId }
    });
    return { ok: false, error: "Giao dịch đang được xem xét bảo mật." };
  }
  await trackServerEvent({
    eventName: "early_access_unlock_clicked",
    targetType: "chapter",
    targetId: input.chapterId,
    category: "monetization",
    metadata: { story_id: input.storyId, chapter_id: input.chapterId }
  });

  const already = await getEarlyAccessUnlockByUser(user.id, input.chapterId);
  if (already.data) return { ok: true, alreadyUnlocked: true, error: null };

  const config = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["early_access.enabled"]);
  if (!enabled) return { ok: false, error: "Early access đang tắt." };

  const setting = await getChapterEarlyAccessSetting(input.chapterId);
  if (!setting.data?.enabled || !setting.data.free_at) {
    return { ok: false, error: "Chapter này hiện không mở đọc sớm." };
  }
  if (new Date(setting.data.free_at).getTime() <= Date.now()) {
    return { ok: false, error: "Chapter đã miễn phí, không cần unlock." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(setting.data.creator_user_id);
  if (!creatorCanEarn) {
    return { ok: false, error: "Kiếm tiền đang bị tắt bởi ChapMee cho tác giả này." };
  }

  const supabase = await createClient();
  const { data: chapter } = await supabase
    .from("episodes")
    .select("status, stories(status)")
    .eq("id", input.chapterId)
    .maybeSingle();
  const story = chapter?.stories && Array.isArray(chapter.stories)
    ? chapter.stories[0]
    : chapter?.stories;
  const storyStatus =
    story && typeof story === "object" && "status" in story
      ? String((story as { status?: string | null }).status)
      : "";
  if (
    ["hidden", "rejected"].includes(String(chapter?.status)) ||
    ["hidden", "rejected"].includes(storyStatus)
  ) {
    return { ok: false, error: "Nội dung này không hỗ trợ kiếm tiền." };
  }

  const coinPrice = Math.min(
    toNumber(config.settings["early_access.max_coin_price"], 999999),
    Math.max(
      toNumber(config.settings["early_access.min_coin_price"], 1),
      toNumber(
        setting.data.coin_price,
        toNumber(config.settings["early_access.default_coin_price"], 10)
      )
    )
  );

  const wallet = await calculateWalletBalance(user.id);
  const balance = (wallet.data?.paid_coin_balance ?? 0) + (wallet.data?.bonus_coin_balance ?? 0);
  if (balance < coinPrice) {
    return { ok: false, error: "Không đủ coin để đọc sớm chapter này." };
  }

  const debit = await debitUserCoins({
    userId: user.id,
    amount: coinPrice,
    reason: "chapter_unlock",
    source: "unlock",
    transactionCode: `EARLY-UNLOCK-${user.id}-${input.chapterId}`,
    metadata: {
      request_id: requestId,
      early_access: true,
      story_id: input.storyId,
      chapter_id: input.chapterId
    }
  });
  if (!debit.data) {
    await trackServerEvent({
      eventName: "early_access_unlock_failed",
      targetType: "chapter",
      targetId: input.chapterId,
      category: "monetization",
      metadata: {
        story_id: input.storyId,
        chapter_id: input.chapterId,
        reason: debit.error ?? "debit_failed"
      }
    });
    return { ok: false, error: debit.error ?? "Không thể trừ coin." };
  }

  await detectRapidSpendAfterRewardAds({
    userId: user.id,
    transactionId: debit.data.id,
    creatorUserId: setting.data.creator_user_id
  });

  const existingAfterDebit = await getEarlyAccessUnlockByUser(user.id, input.chapterId);
  if (existingAfterDebit.data) {
    return { ok: true, alreadyUnlocked: true, error: null };
  }

  const revenue = await calculateCreatorRevenue({
    moduleType: "early_access",
    creatorUserId: setting.data.creator_user_id,
    coinSpent: coinPrice,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1000),
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    coinLotAllocations: ((debit.data.metadata?.coin_lot_allocations as CoinLotAllocation[] | undefined) ?? []),
    storyId: input.storyId,
    chapterId: input.chapterId,
    metadata: {
      transaction_id: debit.data.id,
      early_access: true
    }
  });

  const unlock = await createEarlyAccessUnlock({
    userId: user.id,
    chapterId: input.chapterId,
    storyId: input.storyId,
    creatorUserId: setting.data.creator_user_id,
    coinAmount: coinPrice,
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    transactionId: debit.data.id
  });
  if (!unlock.data) {
    return { ok: false, error: unlock.error ?? "Không thể lưu unlock đọc sớm." };
  }

  const holdByConfig = Boolean(config.settings["payout.hold_revenue_enabled"]);
  const holdByRisk = await shouldHoldCreatorRevenue(setting.data.creator_user_id);
  const creditStatus = holdByRisk ? "locked" : holdByConfig ? "pending" : "available";

  const credit = await recordCreatorNetEarning({
    creatorUserId: setting.data.creator_user_id,
    buyerUserId: user.id,
    sourceType: "chapter_unlock",
    sourceId: unlock.data.id,
    storyId: input.storyId,
    chapterId: input.chapterId,
    coinAmount: coinPrice,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1000),
    revenue,
    revenueStatus: creditStatus,
    transactionType: "chapter_unlock",
    transactionSource: "unlock",
    metadata: {
      early_access: true,
      request_id: requestId,
      transaction_id: debit.data.id,
      ...revenue.metadata
    }
  });
  if (!credit.data) {
    return { ok: false, error: credit.error ?? "Không thể ghi nhận doanh thu creator." };
  }

  const recentUnlocks = await createClient()
    .then((supabase) =>
      supabase
        .from("early_access_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    );
  if ((recentUnlocks.count ?? 0) >= 8) {
    await addRiskEvent({
      userId: user.id,
      creatorUserId: setting.data.creator_user_id,
      transactionId: debit.data.id,
      storyId: input.storyId,
      chapterId: input.chapterId,
      eventType: "suspicious_unlock_pattern",
      severity: "medium",
      metadata: { unlock_count_15m: recentUnlocks.count ?? 0, mode: "early_access" }
    });
  }

  await trackServerEvent({
    eventName: "early_access_unlocked",
    targetType: "chapter",
    targetId: input.chapterId,
    category: "monetization",
    metadata: {
      story_id: input.storyId,
      chapter_id: input.chapterId,
      creator_user_id: setting.data.creator_user_id,
      coin_price: coinPrice
    }
  });

  try {
    const { trackTaxonomyStoryPurchaseServer } = await import(
      "@/lib/analytics/track-taxonomy-server"
    );
    await trackTaxonomyStoryPurchaseServer({
      storyId: input.storyId,
      chapterId: input.chapterId,
      revenueCoin: coinPrice,
      userId: user.id,
      sourceSurface: "catalog"
    });
  } catch {
    // Non-blocking taxonomy analytics
  }

  return { ok: true, alreadyUnlocked: false, error: null };
}
