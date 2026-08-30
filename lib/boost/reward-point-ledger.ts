import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

export type RewardLedgerDirection = "earn" | "spend" | "adjust";
export type RewardLedgerReason =
  | "daily_login"
  | "reading"
  | "comment"
  | "review"
  | "story_boost"
  | "admin_adjust"
  | "other";

export type RecordRewardLedgerInput = {
  profileId: string;
  amount: number;
  direction: RewardLedgerDirection;
  reason: RewardLedgerReason;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdByAdminId?: string | null;
};

export async function recordRewardPointLedger(
  input: RecordRewardLedgerInput
): Promise<{ ok: boolean; ledgerId: string | null }> {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) {
    return { ok: false, ledgerId: null };
  }

  try {
    const result = await db.execute(sql`
      insert into public.reward_point_ledger (
        profile_id,
        amount,
        direction,
        reason,
        related_entity_type,
        related_entity_id,
        created_by_admin_id
      )
      values (
        ${input.profileId}::uuid,
        ${amount},
        ${input.direction},
        ${input.reason},
        ${input.relatedEntityType ?? null},
        ${input.relatedEntityId ?? null},
        ${input.createdByAdminId ?? null}
      )
      returning id
    `);

    return {
      ok: true,
      ledgerId: String((result.rows[0] as { id: string }).id)
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { ok: false, ledgerId: null };
    }
    throw error;
  }
}
