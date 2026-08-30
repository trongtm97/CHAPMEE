"use server";

import { randomUUID } from "crypto";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { calculateCreatorRevenue } from "@/lib/monetization/creator-revenue";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import {
  createStoryFullAccessUnlock,
  getStoryFullAccessUnlock,
  getStoryMonetizationSettings
} from "@/lib/data/story-monetization";
import { createClient } from "@/lib/data/server";
import { recordCreatorNetEarning } from "@/lib/finance/record-creator-net-earning";
import { resolveFullStoryPurchaseRevenue } from "@/lib/monetization/story-completion-escrow";
import { calculateWalletBalance, debitUserCoins } from "@/lib/wallets/user-wallet";
import {
  addRiskEvent,
  detectRapidSpendAfterRewardAds,
  shouldBlockTransaction,
  shouldHoldCreatorRevenue
} from "@/lib/risk/risk-engine";
import type { CoinLotAllocation } from "@/types/coin-lot";
import { loadStoryOriginPolicy } from "@/lib/content-origin/load-story-origin-policy";

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function unlockStoryFullAccessAction(input: {
  storyId: string;
  requestId?: string;
}) {
  const originPolicy = await loadStoryOriginPolicy(input.storyId);
  if (!originPolicy.canSellStoryBundle || !originPolicy.canUseCoinUnlock) {
    return { ok: false, error: "Story nay khong ho tro mua tron bo." };
  }

  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để mua trọn bộ." };
  }

  try {
    await assertActionAccess("chapter.purchase");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const requestId = input.requestId?.trim() || randomUUID();
  if (await shouldBlockTransaction(user.id, "story_unlock")) {
    await addRiskEvent({
      userId: user.id,
      eventType: "transaction_flagged",
      severity: "high",
      reason: "Story unlock bị chặn bởi risk profile.",
      metadata: { story_id: input.storyId }
    });
    return { ok: false, error: "Giao dịch đang được xem xét bảo mật." };
  }

  const existing = await getStoryFullAccessUnlock(user.id, input.storyId);
  if (existing.data) {
    return { ok: true, alreadyUnlocked: true, error: null };
  }

  const db = await createClient();
  const { data: story } = await db
    .from("stories")
    .select("id, status, visibility, creator_profiles(user_id)")
    .eq("id", input.storyId)
    .maybeSingle();

  if (!story) {
    return { ok: false, error: "Không tìm thấy truyện." };
  }

  const creator = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;
  const creatorUserId = creator?.user_id;
  if (!creatorUserId) {
    return { ok: false, error: "Không xác định được tác giả." };
  }

  if (["hidden", "rejected"].includes(String(story.status))) {
    return { ok: false, error: "Truyện này không hỗ trợ mua trọn bộ." };
  }

  const config = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["paid_chapters.enabled"]);

  if (!enabled) {
    return { ok: false, error: "Mua trọn bộ đang tắt." };
  }

  const settingsResult = await getStoryMonetizationSettings(input.storyId);
  const settings = settingsResult.data;
  if (!settings?.full_access_enabled || settings.full_access_price_coin == null) {
    return { ok: false, error: "Truyện chưa bật bán trọn bộ." };
  }

  const creatorCanEarn = await isCreatorMonetizationAllowed(creatorUserId);
  if (!creatorCanEarn) {
    return { ok: false, error: "Kiếm tiền đang bị tắt cho tác giả này." };
  }

  const storyPrice = settings.full_access_price_coin;
  const wallet = await calculateWalletBalance(user.id);
  const currentBalance =
    (wallet.data?.paid_coin_balance ?? 0) + (wallet.data?.bonus_coin_balance ?? 0);

  if (currentBalance < storyPrice) {
    return { ok: false, error: "Không đủ coin để mua trọn bộ." };
  }

  const debit = await debitUserCoins({
    userId: user.id,
    amount: storyPrice,
    spendRule: Boolean(config.settings["rewarded_ads.allowed_use_for_paid_chapters"])
      ? "bonus_first"
      : "paid_first",
    reason: "story_unlock",
    source: "unlock",
    transactionCode: `STORY-FULL-${user.id}-${input.storyId}`,
    metadata: {
      request_id: requestId,
      story_id: input.storyId,
      creator_user_id: creatorUserId,
      purchase_type: "full_story"
    }
  });

  if (!debit.data) {
    const duplicated = await getStoryFullAccessUnlock(user.id, input.storyId);
    if (duplicated.data) {
      return { ok: true, alreadyUnlocked: true, error: null };
    }
    return { ok: false, error: debit.error ?? "Không thể trừ coin." };
  }

  await detectRapidSpendAfterRewardAds({
    userId: user.id,
    transactionId: debit.data.id,
    creatorUserId
  });

  const revenue = await calculateCreatorRevenue({
    moduleType: "paid_chapter",
    creatorUserId,
    coinSpent: storyPrice,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1),
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    coinLotAllocations:
      (debit.data.metadata?.coin_lot_allocations as CoinLotAllocation[] | undefined) ?? [],
    storyId: input.storyId,
    metadata: { transaction_id: debit.data.id, purchase_type: "full_story" }
  });

  const unlockRecord = await createStoryFullAccessUnlock({
    userId: user.id,
    storyId: input.storyId,
    creatorUserId,
    coinAmount: storyPrice,
    priceCoinSnapshot: storyPrice,
    includesFutureChapters: settings.full_access_includes_future_chapters,
    transactionId: debit.data.id
  });

  if (!unlockRecord.data) {
    return { ok: false, error: unlockRecord.error ?? "Không thể lưu quyền trọn bộ." };
  }

  const holdByConfig = Boolean(config.settings["payout.hold_revenue_enabled"]);
  const holdByRisk = await shouldHoldCreatorRevenue(creatorUserId);
  const baseRevenueStatus = holdByRisk ? "locked" : holdByConfig ? "pending" : "available";
  const escrow = await resolveFullStoryPurchaseRevenue({
    storyId: input.storyId,
    baseRevenueStatus
  });
  const creditStatus = escrow.revenueStatus;

  const credit = await recordCreatorNetEarning({
    creatorUserId,
    buyerUserId: user.id,
    sourceType: "story_unlock",
    sourceId: unlockRecord.data.id as string,
    storyId: input.storyId,
    coinAmount: storyPrice,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1),
    revenue,
    revenueStatus: creditStatus,
    releaseStatus: escrow.releaseStatus,
    lockedReason: escrow.lockedReason,
    transactionType: "story_unlock",
    transactionSource: "unlock",
    metadata: {
      request_id: requestId,
      transaction_id: debit.data.id,
      paid_coin_amount: debit.data.paid_coin_amount ?? 0,
      bonus_coin_amount: debit.data.bonus_coin_amount ?? 0,
      includes_future_chapters: settings.full_access_includes_future_chapters,
      purchase_type: "full_story",
      release_status: escrow.releaseStatus,
      locked_reason: escrow.lockedReason,
      story_completion_escrow: escrow.escrowHeld,
      ...revenue.metadata
    }
  });

  if (!credit.data) {
    return { ok: false, error: credit.error ?? "Không thể ghi nhận doanh thu creator." };
  }

  await trackServerEvent({
    eventName: "paid_chapter_unlocked",
    targetType: "story",
    targetId: input.storyId,
    category: "monetization",
    metadata: {
      coin_price: storyPrice,
      creator_user_id: creatorUserId,
      purchase_type: "full_story"
    }
  });

  return { ok: true, alreadyUnlocked: false, error: null };
}
