"use server";

import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { createRiskEventRecord, getOrCreateUserRiskProfile, listOpenHighRiskEventsByCreator, updateUserRiskProfileRecord } from "@/lib/data/risk";
import { createClient } from "@/lib/data/server";
import { getTransactionsForAdmin } from "@/lib/data/transactions";
import { getRiskRule } from "@/lib/risk/risk-rules";
import type { RiskSeverity, UserRiskProfile } from "@/types/risk";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { updateRiskEventStatus } from "@/lib/data/risk";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

function isRiskEngineEnabled(settings: Record<string, unknown>) {
  return Boolean(settings["monetization.enabled"]) && Boolean(settings["fraud.enabled"]);
}

function riskLevelFromScore(score: number): UserRiskProfile["risk_level"] {
  if (score >= 85) return "blocked";
  if (score >= 65) return "high";
  if (score >= 35) return "watch";
  return "normal";
}

export async function calculateRiskScore(
  eventType: string,
  metadata?: Record<string, unknown>
) {
  const rule = getRiskRule(eventType);
  const multiplier = Number(metadata?.risk_multiplier ?? 1);
  return clampScore(rule.baseScore * (Number.isFinite(multiplier) ? multiplier : 1));
}

export async function addRiskEvent(input: {
  userId?: string | null;
  creatorUserId?: string | null;
  transactionId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  eventType: string;
  severity?: RiskSeverity;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const config = await getMonetizationConfig({ includePrivate: true });
  const settings = config.settings as Record<string, unknown>;
  if (!isRiskEngineEnabled(settings)) {
    return { data: null, error: null };
  }

  const rule = getRiskRule(input.eventType);
  const score = await calculateRiskScore(input.eventType, input.metadata);
  const created = await createRiskEventRecord({
    userId: input.userId ?? null,
    creatorUserId: input.creatorUserId ?? null,
    transactionId: input.transactionId ?? null,
    storyId: input.storyId ?? null,
    chapterId: input.chapterId ?? null,
    eventType: input.eventType,
    severity: input.severity ?? rule.defaultSeverity,
    riskScore: score,
    reason: input.reason ?? rule.reason,
    metadata: input.metadata ?? {}
  });

  if (created.data?.user_id) {
    await updateUserRiskProfile(created.data.user_id);
  }
  if (created.data?.creator_user_id) {
    await updateUserRiskProfile(created.data.creator_user_id);
  }

  await trackServerEvent({
    eventName: "risk_event_created",
    category: "monetization",
    targetType: "user",
    targetId: input.userId ?? input.creatorUserId ?? null,
    metadata: {
      event_type: input.eventType,
      severity: input.severity ?? rule.defaultSeverity,
      transaction_id: input.transactionId ?? null
    }
  });

  return created;
}

export async function updateUserRiskProfile(userId: string) {
  const profile = await getOrCreateUserRiskProfile(userId);
  if (!profile.data) {
    return { data: null, error: profile.error ?? "Could not load risk profile." };
  }

  const events = await listUserRiskEvents(userId, 60);
  if (events.error) {
    return { data: profile.data, error: events.error };
  }

  const now = Date.now();
  let totalScore = 0;
  let lastEventAt: string | null = null;
  for (const event of events.data) {
    const ageDays = (now - new Date(event.created_at).getTime()) / (24 * 60 * 60 * 1000);
    const decay = Math.max(0.2, 1 - ageDays / 30);
    totalScore += event.risk_score * decay;
    if (!lastEventAt || event.created_at > lastEventAt) {
      lastEventAt = event.created_at;
    }
  }

  const score = clampScore(totalScore);
  const riskLevel = riskLevelFromScore(score);
  const payoutBlocked = profile.data.payout_blocked || riskLevel === "blocked" || riskLevel === "high";
  const monetizationBlocked = profile.data.monetization_blocked || riskLevel === "blocked";

  return updateUserRiskProfileRecord(userId, {
    risk_score: score,
    risk_level: riskLevel,
    payout_blocked: payoutBlocked,
    monetization_blocked: monetizationBlocked,
    last_risk_event_at: lastEventAt ?? profile.data.last_risk_event_at,
    metadata: profile.data.metadata ?? {}
  });
}

async function listUserRiskEvents(userId: string, limit = 50) {
  const db = await createClient();
  const { data, error } = await db
    .from("risk_events")
    .select("*")
    .or(`user_id.eq.${userId},creator_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return { data: [], error: error.message };
  }
  return {
    data: (data ?? []) as Array<{ risk_score: number; created_at: string }>,
    error: null
  };
}

export async function shouldHoldCreatorRevenue(creatorUserId: string) {
  const config = await getMonetizationConfig({ includePrivate: true });
  const settings = config.settings as Record<string, unknown>;
  if (!isRiskEngineEnabled(settings)) return false;
  const profile = await getOrCreateUserRiskProfile(creatorUserId);
  if (!profile.data) return false;
  if (profile.data.monetization_blocked || profile.data.risk_level === "blocked") {
    return true;
  }
  const openHigh = await listOpenHighRiskEventsByCreator(creatorUserId);
  return openHigh.data.length > 0;
}

export async function shouldBlockPayout(creatorUserId: string) {
  const config = await getMonetizationConfig({ includePrivate: true });
  const settings = config.settings as Record<string, unknown>;
  if (!isRiskEngineEnabled(settings)) return false;
  const profile = await getOrCreateUserRiskProfile(creatorUserId);
  if (!profile.data) return false;
  if (profile.data.payout_blocked || profile.data.risk_level === "blocked") return true;
  const openHigh = await listOpenHighRiskEventsByCreator(creatorUserId);
  return openHigh.data.length > 0;
}

export async function shouldBlockTransaction(
  userId: string,
  transactionType: string
) {
  const config = await getMonetizationConfig({ includePrivate: true });
  const settings = config.settings as Record<string, unknown>;
  if (!isRiskEngineEnabled(settings)) return false;
  const profile = await getOrCreateUserRiskProfile(userId);
  if (!profile.data) return false;
  if (profile.data.monetization_blocked || profile.data.risk_level === "blocked") return true;
  if (profile.data.risk_level === "high" && ["author_tip", "virtual_gift", "chapter_unlock"].includes(transactionType)) {
    return true;
  }
  return false;
}

export async function detectRapidSpendAfterRewardAds(input: {
  userId: string;
  transactionId: string;
  creatorUserId?: string | null;
}) {
  const txs = await getTransactionsForAdmin({ limit: 30 });
  if (txs.error) return;
  const nowTx = txs.data.find((tx) => tx.id === input.transactionId);
  if (!nowTx) return;
  const recentReward = txs.data.find(
    (tx) =>
      tx.user_id === input.userId &&
      tx.type === "rewarded_ad_coin" &&
      new Date(nowTx.created_at).getTime() - new Date(tx.created_at).getTime() <=
        5 * 60 * 1000
  );
  if (!recentReward) return;

  await addRiskEvent({
    userId: input.userId,
    creatorUserId: input.creatorUserId ?? null,
    transactionId: input.transactionId,
    eventType: "rapid_coin_spend_after_reward_ads",
    metadata: {
      recent_reward_transaction_id: recentReward.id
    }
  });
}

export async function adminUpdateRiskEventAction(input: {
  riskEventId: string;
  status: "reviewing" | "resolved" | "ignored";
  adminNote?: string;
}) {
  const auth = await checkStaffPermission("finance.wallet.adjust");
  if (!auth.ok) {
    return { ok: false, error: auth.error, data: null };
  }
  const user = { id: auth.userId };
  const updated = await updateRiskEventStatus({
    riskEventId: input.riskEventId,
    status: input.status,
    reviewedBy: user.id,
    adminNote: input.adminNote ?? null
  });
  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể cập nhật risk event.", data: null };
  }
  await trackServerEvent({
    eventName: "fraud_review_action_taken",
    category: "monetization",
    targetType: "user",
    targetId: updated.data.user_id ?? updated.data.creator_user_id ?? null,
    metadata: { risk_event_id: updated.data.id, action: input.status }
  });
  return { ok: true, error: null, data: updated.data };
}

export async function adminSetPayoutBlockAction(input: {
  userId: string;
  blocked: boolean;
  adminNote?: string;
}) {
  const auth = await checkStaffPermission("finance.wallet.adjust");
  if (!auth.ok) {
    return { ok: false, error: auth.error, data: null };
  }
  const profileResult = await getOrCreateUserRiskProfile(input.userId);
  if (!profileResult.data) {
    return { ok: false, error: profileResult.error ?? "Không thể load risk profile.", data: null };
  }
  const updated = await updateUserRiskProfileRecord(input.userId, {
    payout_blocked: input.blocked,
    metadata: {
      ...(profileResult.data.metadata ?? {}),
      payout_block_admin_note: input.adminNote ?? null,
      payout_block_updated_at: new Date().toISOString()
    }
  });
  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể cập nhật payout block.", data: null };
  }
  return { ok: true, error: null, data: updated.data };
}

export async function adminSetMonetizationBlockAction(input: {
  userId: string;
  blocked: boolean;
  adminNote?: string;
}) {
  const auth = await checkStaffPermission("finance.wallet.adjust");
  if (!auth.ok) {
    return { ok: false, error: auth.error, data: null };
  }
  const profileResult = await getOrCreateUserRiskProfile(input.userId);
  if (!profileResult.data) {
    return { ok: false, error: profileResult.error ?? "Không thể load risk profile.", data: null };
  }
  const updated = await updateUserRiskProfileRecord(input.userId, {
    monetization_blocked: input.blocked,
    metadata: {
      ...(profileResult.data.metadata ?? {}),
      monetization_block_admin_note: input.adminNote ?? null,
      monetization_block_updated_at: new Date().toISOString()
    }
  });
  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể cập nhật monetization block.", data: null };
  }
  return { ok: true, error: null, data: updated.data };
}
