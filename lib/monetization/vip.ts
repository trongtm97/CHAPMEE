"use server";

import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { createTransaction } from "@/lib/supabase/transactions";
import {
  createUserSubscription,
  getLatestUserSubscription,
  getVipPlanById,
  listActiveVipPlans
} from "@/lib/supabase/vip";
import { creditUserCoins } from "@/lib/wallets/user-wallet";
import type { VipBenefitKey } from "@/types/vip";

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function isVipModuleEnabled() {
  const config = await getMonetizationConfig({ includePrivate: true });
  return (
    Boolean(config.settings["monetization.enabled"]) &&
    Boolean(config.settings["vip_subscription.enabled"])
  );
}

export async function getUserVipStatus(userId: string) {
  const subscription = await getLatestUserSubscription(userId);
  if (!subscription.data) {
    return { isActive: false, subscription: null, plan: null };
  }

  const current = subscription.data;
  const expired =
    current.expires_at != null &&
    new Date(current.expires_at).getTime() <= Date.now();

  if (expired || current.status !== "active") {
    return { isActive: false, subscription: current, plan: current.plan ?? null };
  }

  return { isActive: true, subscription: current, plan: current.plan ?? null };
}

export async function hasVipBenefit(userId: string, benefitKey: VipBenefitKey) {
  const vip = await getUserVipStatus(userId);
  if (!vip.isActive || !vip.plan?.benefits) return false;
  return Boolean(vip.plan.benefits[benefitKey]);
}

export async function getVipDiscount(
  userId: string,
  type: "early_access_discount_percent" | "paid_chapter_discount_percent"
) {
  const vip = await getUserVipStatus(userId);
  if (!vip.isActive || !vip.plan?.benefits) return 0;
  return Math.max(0, toNumber(vip.plan.benefits[type], 0));
}

export async function purchaseVipMockAction(planId: string) {
  const { user } = await getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để mua VIP." };

  try {
    await assertActionAccess("wallet.purchase");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const [moduleEnabled, config, planResult] = await Promise.all([
    isVipModuleEnabled(),
    getMonetizationConfig({ includePrivate: true }),
    getVipPlanById(planId)
  ]);

  if (!moduleEnabled) return { ok: false, error: "VIP đang tắt bởi admin." };
  if (!Boolean(config.settings["monetization.test_mode"])) {
    return { ok: false, error: "Mock purchase chỉ dùng trong test mode." };
  }
  if (!planResult.data || !planResult.data.is_active) {
    return { ok: false, error: "VIP plan không tồn tại hoặc đang tắt." };
  }
  const existingVip = await getUserVipStatus(user.id);
  if (existingVip.isActive) {
    return { ok: true, error: null };
  }

  const startedAt = new Date();
  const expiresAt = new Date(
    startedAt.getTime() + planResult.data.duration_days * 24 * 60 * 60 * 1000
  );
  const txCode = `VIPSUB-${user.id}-${planResult.data.id}-${startedAt.toISOString().slice(0, 10)}`;
  const tx = await createTransaction({
    transactionCode: txCode,
    type: "vip_subscription",
    direction: "credit",
    source: "payment",
    status: "completed",
    userId: user.id,
    moneyAmountVnd: planResult.data.price_vnd,
    metadata: { plan_id: planResult.data.id, mock: true }
  });
  if (!tx.data) {
    if (!(tx.error ?? "").toLowerCase().includes("duplicate")) {
      return { ok: false, error: tx.error ?? "Không thể tạo giao dịch VIP." };
    }
  }

  const subscription = await createUserSubscription({
    userId: user.id,
    planId: planResult.data.id,
    status: "active",
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    provider: "mock_test",
    providerSubscriptionId: `mock-${user.id}-${planResult.data.id}`,
    transactionId: tx.data?.id ?? null
  });
  if (!subscription.data) {
    return { ok: false, error: subscription.error ?? "Không thể kích hoạt VIP." };
  }

  if (planResult.data.coin_bonus_amount > 0) {
    const bonusCredit = await creditUserCoins({
      userId: user.id,
      amount: planResult.data.coin_bonus_amount,
      coinType: "bonus",
      reason: "bonus_coin_grant",
      source: "bonus",
      transactionCode: `VIPBONUS-${subscription.data.id}`,
      metadata: { subscription_id: subscription.data.id, plan_id: planResult.data.id, non_withdrawable: true }
    });
    if (bonusCredit.error && !bonusCredit.error.toLowerCase().includes("duplicate")) {
      return { ok: false, error: bonusCredit.error };
    }
  }

  return { ok: true, error: null };
}

export async function getVipPageData(userId: string | null) {
  const enabled = await isVipModuleEnabled();
  if (!enabled) return { enabled: false, plans: [], vipStatus: null };

  const plans = await listActiveVipPlans();
  const vipStatus = userId ? await getUserVipStatus(userId) : null;

  return {
    enabled: true,
    plans: plans.data,
    vipStatus
  };
}
