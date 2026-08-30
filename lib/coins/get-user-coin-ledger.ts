import { createClient } from "@/lib/data/server";
import type { UserCoinLedgerEntry, UserCoinLedgerType } from "@/types/coins";

function mapRow(row: Record<string, unknown>): UserCoinLedgerEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as UserCoinLedgerType,
    direction: row.direction as "credit" | "debit",
    coinAmount: Number(row.coin_amount),
    coinType: row.coin_type as UserCoinLedgerEntry["coinType"],
    sourceType: (row.source_type as string | null) ?? null,
    sourceId: (row.source_id as string | null) ?? null,
    adminId: (row.admin_id as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at)
  };
}

export async function getUserCoinLedger(input: {
  userId: string;
  limit?: number;
  type?: UserCoinLedgerType | "all";
}) {
  const db = await createClient();
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));

  let query = db
    .from("user_coin_ledger")
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.type && input.type !== "all") {
    query = query.eq("type", input.type);
  }

  const { data, error } = await query;

  if (error) {
    return { entries: [] as UserCoinLedgerEntry[], error: error.message };
  }

  return {
    entries: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
    error: null
  };
}
