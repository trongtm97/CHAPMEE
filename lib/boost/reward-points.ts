import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { recordRewardPointLedger, type RewardLedgerReason } from "@/lib/boost/reward-point-ledger";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

export async function getUserRewardPointsBalance(userId: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      select balance
      from public.user_reward_points
      where user_id = ${userId}::uuid
      limit 1
    `);

    const row = result.rows[0] as { balance?: number } | undefined;
    return Number(row?.balance ?? 0);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return 0;
    }
    throw error;
  }
}

export async function creditUserRewardPoints(input: {
  userId: string;
  amount: number;
  reason?: RewardLedgerReason;
  createdByAdminId?: string | null;
}): Promise<{ ok: boolean; error: string | null; balance: number | null }> {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) {
    return { ok: false, error: "Số điểm không hợp lệ.", balance: null };
  }

  const reason = input.reason ?? "admin_adjust";

  try {
    const result = await db.execute(sql`
      insert into public.user_reward_points (user_id, balance, lifetime_earned)
      values (${input.userId}::uuid, ${amount}, ${amount})
      on conflict (user_id) do update set
        balance = public.user_reward_points.balance + ${amount},
        lifetime_earned = public.user_reward_points.lifetime_earned + ${amount},
        updated_at = now()
      returning balance
    `);

    const balance = Number((result.rows[0] as { balance: number }).balance);

    await recordRewardPointLedger({
      profileId: input.userId,
      amount,
      direction: "earn",
      reason,
      createdByAdminId: input.createdByAdminId ?? null
    });

    return { ok: true, error: null, balance };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false, error: "Hệ thống điểm thưởng chưa sẵn sàng.", balance: null };
    }
    throw error;
  }
}

export async function debitUserRewardPoints(input: {
  userId: string;
  amount: number;
  reason?: RewardLedgerReason;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}): Promise<{
  ok: boolean;
  error: string | null;
  balance: number | null;
  ledgerId: string | null;
}> {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) {
    return { ok: false, error: "Số điểm không hợp lệ.", balance: null, ledgerId: null };
  }

  try {
    const result = await db.execute(sql`
      update public.user_reward_points
      set
        balance = balance - ${amount},
        lifetime_spent = lifetime_spent + ${amount},
        updated_at = now()
      where user_id = ${input.userId}::uuid
        and balance >= ${amount}
      returning balance
    `);

    const row = result.rows[0] as { balance: number } | undefined;
    if (!row) {
      return { ok: false, error: "Không đủ điểm thưởng.", balance: null, ledgerId: null };
    }

    const ledger = await recordRewardPointLedger({
      profileId: input.userId,
      amount,
      direction: "spend",
      reason: input.reason ?? "story_boost",
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null
    });

    return {
      ok: true,
      error: null,
      balance: Number(row.balance),
      ledgerId: ledger.ledgerId
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Hệ thống điểm thưởng chưa sẵn sàng.",
        balance: null,
        ledgerId: null
      };
    }
    throw error;
  }
}
