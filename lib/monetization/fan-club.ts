"use server";

import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCreatorMonetizationProfile } from "@/lib/supabase/creator-monetization";
import {
  createFanClubMembership,
  getFanClubMembership,
  getFanClubPlanById
} from "@/lib/supabase/fan-club";
import { debitUserCoins } from "@/lib/wallets/user-wallet";
import { recordCreatorNetEarning } from "@/lib/finance/record-creator-net-earning";
import { calculateCreatorRevenue } from "@/lib/monetization/creator-revenue";
import { shouldHoldCreatorRevenue } from "@/lib/risk/risk-engine";
import type { CoinLotAllocation } from "@/types/coin-lot";

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function isFanClubEnabled() {
  const config = await getMonetizationConfig({ includePrivate: true });
  return (
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["coin.enabled"]) &&
    Boolean(config.settings["creator_monetization.enabled"]) &&
    Boolean(config.settings["fan_club.enabled"])
  );
}

export async function isFanClubActive(userId: string, creatorUserId: string, storyId?: string | null) {
  const membership = await getFanClubMembership(userId, creatorUserId, storyId);
  const data = membership.data;
  if (!data) return { active: false, membership: null };
  const expired = data.expires_at ? new Date(data.expires_at).getTime() <= Date.now() : true;
  return { active: data.status === "active" && !expired, membership: data };
}

export async function joinFanClubAction(input: { planId: string }) {
  const { user } = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để tham gia Fan Club." };

  try {
    await assertActionAccess("wallet.purchase");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  if (!(await isFanClubEnabled())) return { ok: false, error: "Fan Club đang tắt." };

  const plan = await getFanClubPlanById(input.planId);
  if (!plan.data || !plan.data.is_active) {
    return { ok: false, error: "Plan Fan Club không tồn tại hoặc đang tắt." };
  }
  if (plan.data.creator_user_id === user.id) {
    return { ok: false, error: "Bạn không thể tự tham gia Fan Club của mình." };
  }

  await trackServerEvent({
    eventName: "fan_club_join_clicked",
    targetType: "creator",
    targetId: plan.data.creator_user_id,
    category: "monetization",
    metadata: { plan_id: plan.data.id, story_id: plan.data.story_id }
  });

  const creatorProfile = await getCreatorMonetizationProfile(plan.data.creator_user_id);
  if (
    !creatorProfile.data ||
    creatorProfile.data.status !== "approved" ||
    !creatorProfile.data.monetization_enabled
  ) {
    return { ok: false, error: "Creator chưa đủ điều kiện mở Fan Club." };
  }

  const existing = await isFanClubActive(
    user.id,
    plan.data.creator_user_id,
    plan.data.story_id
  );
  if (existing.active) return { ok: true, error: null, alreadyJoined: true };

  const debit = await debitUserCoins({
    userId: user.id,
    amount: plan.data.coin_price,
    reason: "fan_club_subscription",
    source: "vip",
    transactionCode: `FANCLUB-${user.id}-${plan.data.id}`,
    metadata: { plan_id: plan.data.id, creator_user_id: plan.data.creator_user_id, story_id: plan.data.story_id }
  });
  if (!debit.data) {
    await trackServerEvent({
      eventName: "fan_club_join_failed",
      targetType: "creator",
      targetId: plan.data.creator_user_id,
      category: "monetization",
      metadata: { plan_id: plan.data.id, reason: debit.error ?? "debit_failed" }
    });
    return { ok: false, error: debit.error ?? "Không thể trừ coin." };
  }

  const config = await getMonetizationConfig({ includePrivate: true });
  const revenue = await calculateCreatorRevenue({
    moduleType: "fan_club",
    creatorUserId: plan.data.creator_user_id,
    coinSpent: plan.data.coin_price,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1000),
    paidCoinAmount: debit.data.paid_coin_amount ?? 0,
    bonusCoinAmount: debit.data.bonus_coin_amount ?? 0,
    coinLotAllocations: ((debit.data.metadata?.coin_lot_allocations as CoinLotAllocation[] | undefined) ?? []),
    storyId: plan.data.story_id,
    metadata: {
      fan_club: true,
      plan_id: plan.data.id,
      transaction_id: debit.data.id
    }
  });

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + plan.data.duration_days * 24 * 60 * 60 * 1000);
  const membership = await createFanClubMembership({
    userId: user.id,
    creatorUserId: plan.data.creator_user_id,
    storyId: plan.data.story_id,
    planId: plan.data.id,
    status: "active",
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    transactionId: debit.data.id
  });
  if (!membership.data) return { ok: false, error: membership.error ?? "Không thể tạo membership." };

  const holdByConfig = Boolean(config.settings["payout.hold_revenue_enabled"]);
  const holdByRisk = await shouldHoldCreatorRevenue(plan.data.creator_user_id);
  const creditStatus = holdByRisk ? "locked" : holdByConfig ? "pending" : "available";

  const credit = await recordCreatorNetEarning({
    creatorUserId: plan.data.creator_user_id,
    buyerUserId: user.id,
    sourceType: "story_unlock",
    sourceId: membership.data.id,
    storyId: plan.data.story_id,
    coinAmount: plan.data.coin_price,
    coinToVndRate: toNumber(config.settings["coin.exchange_rate_vnd"], 1000),
    revenue,
    revenueStatus: creditStatus,
    transactionType: "creator_revenue_share",
    transactionSource: "vip",
    metadata: {
      fan_club: true,
      plan_id: plan.data.id,
      transaction_id: debit.data.id,
      ...revenue.metadata
    }
  });
  if (!credit.data) return { ok: false, error: credit.error ?? "Không thể ghi doanh thu creator." };

  await trackServerEvent({
    eventName: "fan_club_joined",
    targetType: "creator",
    targetId: plan.data.creator_user_id,
    category: "monetization",
    metadata: { plan_id: plan.data.id, story_id: plan.data.story_id, coin_price: plan.data.coin_price }
  });

  return { ok: true, error: null };
}
