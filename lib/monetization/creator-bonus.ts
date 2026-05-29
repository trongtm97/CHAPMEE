"use server";

import { randomUUID } from "crypto";
import { BRAND_NAME } from "@/lib/brand/constants";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { logFinanceAdminAction } from "@/lib/auth/finance-guards";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { calculateCreatorBonusCandidates, DEFAULT_BONUS_WEIGHTS } from "@/lib/bonus/creator-bonus-formula";
import { getMonetizationConfig } from "@/lib/monetization/config";
import {
  createCreatorBonusPool,
  getCreatorBonusPoolById,
  listCreatorBonusAllocationsByPool,
  listCreatorBonusPools,
  updateCreatorBonusAllocation,
  updateCreatorBonusPoolStatus,
  upsertCreatorBonusAllocations
} from "@/lib/supabase/creator-bonus";
import { listOpenHighRiskEventsByCreator } from "@/lib/supabase/risk";
import { getCreatorMonetizationProfile } from "@/lib/supabase/creator-monetization";
import { buildAdminBonusRevenue } from "@/lib/finance/calculate-creator-earning-breakdown";
import { recordCreatorNetEarning } from "@/lib/finance/record-creator-net-earning";

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

async function assertBonusPoolEnabled() {
  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(settings["monetization.enabled"]) &&
    Boolean(settings["creator_monetization.enabled"]) &&
    Boolean(settings["creator_bonus_pool.enabled"]);
  return enabled;
}

async function assertBonusStaff() {
  const auth = await checkStaffAnyPermission(["finance.wallet.adjust"]);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, userId: null };
  }
  return { ok: true as const, error: null, userId: auth.userId };
}

export async function createCreatorBonusPoolAction(input: {
  name: string;
  periodStart: string;
  periodEnd: string;
  totalAmountVnd: number;
  rules?: Record<string, unknown>;
}) {
  const auth = await assertBonusStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  if (!(await assertBonusPoolEnabled())) return { ok: false, error: "Creator bonus pool đang tắt.", data: null };

  const pool = await createCreatorBonusPool({
    name: input.name.trim(),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totalAmountVnd: num(input.totalAmountVnd),
    rules: input.rules ?? DEFAULT_BONUS_WEIGHTS,
    createdBy: auth.userId
  });
  if (!pool.data) return { ok: false, error: pool.error ?? "Không thể tạo bonus pool.", data: null };

  await trackServerEvent({
    eventName: "creator_bonus_pool_created",
    category: "monetization",
    targetType: "page",
    targetId: "/admin/bonus-pools",
    metadata: { pool_id: pool.data.id, total_amount_vnd: pool.data.total_amount_vnd }
  });

  return { ok: true, error: null, data: pool.data };
}

export async function calculateCreatorBonusPoolPreviewAction(poolId: string) {
  const auth = await assertBonusStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  if (!(await assertBonusPoolEnabled())) return { ok: false, error: "Creator bonus pool đang tắt.", data: null };

  const pool = await getCreatorBonusPoolById(poolId);
  if (!pool.data) return { ok: false, error: pool.error ?? "Không tìm thấy bonus pool.", data: null };

  const candidates = await calculateCreatorBonusCandidates({
    periodStart: pool.data.period_start,
    periodEnd: pool.data.period_end,
    weights: (pool.data.rules ?? {}) as Record<string, unknown>
  });

  const eligible: typeof candidates = [];
  for (const row of candidates) {
    const profile = await getCreatorMonetizationProfile(row.creatorUserId);
    if (!profile.data) continue;
    if (profile.data.status !== "approved" || !profile.data.monetization_enabled) continue;
    const openHigh = await listOpenHighRiskEventsByCreator(row.creatorUserId);
    if (openHigh.data.length > 0) continue;
    eligible.push(row);
  }

  const totalScore = eligible.reduce((sum, row) => sum + row.score, 0);
  const rows = totalScore <= 0
    ? []
    : eligible.map((row) => ({
        creatorUserId: row.creatorUserId,
        score: row.score,
        amountVnd: num((row.score / totalScore) * pool.data!.total_amount_vnd),
        metadata: row.metadata
      }));

  const upserted = await upsertCreatorBonusAllocations({
    poolId: pool.data.id,
    rows: rows.map((row) => ({
      creatorUserId: row.creatorUserId,
      score: row.score,
      amountVnd: row.amountVnd,
      status: "pending",
      metadata: row.metadata
    }))
  });
  if (upserted.error) return { ok: false, error: upserted.error, data: null };

  await updateCreatorBonusPoolStatus({ poolId: pool.data.id, status: "calculated" });
  await trackServerEvent({
    eventName: "creator_bonus_calculated",
    category: "monetization",
    targetType: "page",
    targetId: "/admin/bonus-pools",
    metadata: { pool_id: pool.data.id, creator_count: upserted.data.length }
  });

  return { ok: true, error: null, data: upserted.data };
}

export async function approveCreatorBonusPoolAction(poolId: string) {
  const auth = await assertBonusStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  const pool = await updateCreatorBonusPoolStatus({
    poolId,
    status: "approved",
    approvedBy: auth.userId
  });
  if (!pool.data) return { ok: false, error: pool.error ?? "Không thể approve bonus pool.", data: null };

  const allocations = await listCreatorBonusAllocationsByPool(poolId);
  for (const allocation of allocations.data) {
    if (allocation.status === "pending") {
      await updateCreatorBonusAllocation({ allocationId: allocation.id, status: "approved" });
    }
  }
  await trackServerEvent({
    eventName: "creator_bonus_approved",
    category: "monetization",
    targetType: "page",
    targetId: "/admin/bonus-pools",
    metadata: { pool_id: poolId }
  });
  return { ok: true, error: null, data: pool.data };
}

export async function creditCreatorBonusPoolAction(poolId: string) {
  const auth = await assertBonusStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  if (!(await assertBonusPoolEnabled())) return { ok: false, error: "Creator bonus pool đang tắt.", data: null };

  const pool = await getCreatorBonusPoolById(poolId);
  if (!pool.data) return { ok: false, error: pool.error ?? "Không tìm thấy bonus pool.", data: null };
  const allocations = await listCreatorBonusAllocationsByPool(poolId);
  const credited: string[] = [];

  for (const allocation of allocations.data) {
    if (allocation.status !== "approved") continue;
    if (allocation.transaction_id) continue;
    const txCode = `CRBONUS-${poolId}-${allocation.creator_user_id}-${randomUUID()}`;
    const { settings } = await getMonetizationConfig({ includePrivate: true });
    const coinToVndRate = num(settings["coin.exchange_rate_vnd"] ?? 1000);
    const bonusRevenue = buildAdminBonusRevenue(allocation.amount_vnd);
    const credit = await recordCreatorNetEarning({
      creatorUserId: allocation.creator_user_id,
      sourceType: "bonus",
      sourceId: allocation.id,
      coinToVndRate,
      revenue: bonusRevenue,
      revenueStatus: "pending",
      transactionType: "creator_bonus",
      transactionSource: "system",
      transactionCode: txCode,
      metadata: {
        bonus_pool_id: poolId,
        bonus_pool_name: pool.data.name,
        period_start: pool.data.period_start,
        period_end: pool.data.period_end,
        summary: `${BRAND_NAME} creator bonus`
      }
    });
    if (!credit.data) continue;
    await updateCreatorBonusAllocation({
      allocationId: allocation.id,
      status: "credited",
      transactionId: credit.data.transactionId
    });
    credited.push(allocation.id);
  }

  if (credited.length > 0) {
    await updateCreatorBonusPoolStatus({ poolId, status: "paid" });
    await logFinanceAdminAction({
      action: "creator_bonus_credited",
      targetType: "creator_bonus_pool",
      targetId: poolId,
      metadata: {
        credited_count: credited.length,
        amount_vnd: allocations.data.reduce(
          (sum, row) => sum + (credited.includes(row.id) ? row.amount_vnd : 0),
          0
        )
      }
    });
  }
  await trackServerEvent({
    eventName: "creator_bonus_credited",
    category: "monetization",
    targetType: "page",
    targetId: "/admin/bonus-pools",
    metadata: { pool_id: poolId, credited_count: credited.length }
  });
  return { ok: true, error: null, data: { creditedCount: credited.length } };
}

export async function listCreatorBonusPoolsAction() {
  if (!(await assertBonusPoolEnabled())) return { ok: true, error: null, data: [] };
  return listCreatorBonusPools(100);
}
