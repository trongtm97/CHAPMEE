import { createClient } from "@/lib/data/server";
import type { CreatorBonusAllocation, CreatorBonusAllocationStatus, CreatorBonusPool, CreatorBonusPoolStatus } from "@/types/creator-bonus";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPool(row: Record<string, unknown>): CreatorBonusPool {
  return {
    id: String(row.id),
    name: String(row.name),
    period_start: String(row.period_start),
    period_end: String(row.period_end),
    total_amount_vnd: toNumber(row.total_amount_vnd),
    status: row.status as CreatorBonusPoolStatus,
    rules: (row.rules as Record<string, unknown> | null) ?? null,
    created_by: String(row.created_by),
    approved_by: (row.approved_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapAllocation(row: Record<string, unknown>): CreatorBonusAllocation {
  return {
    id: String(row.id),
    pool_id: String(row.pool_id),
    creator_user_id: String(row.creator_user_id),
    score: toNumber(row.score),
    amount_vnd: toNumber(row.amount_vnd),
    status: row.status as CreatorBonusAllocationStatus,
    transaction_id: (row.transaction_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function createCreatorBonusPool(input: {
  name: string;
  periodStart: string;
  periodEnd: string;
  totalAmountVnd: number;
  rules?: Record<string, unknown>;
  createdBy: string;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_bonus_pools")
    .insert({
      name: input.name,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      total_amount_vnd: input.totalAmountVnd,
      status: "draft",
      rules: input.rules ?? {},
      created_by: input.createdBy
    })
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not create bonus pool." };
  return { data: mapPool(data as Record<string, unknown>), error: null };
}

export async function listCreatorBonusPools(limit = 50) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_bonus_pools")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as CreatorBonusPool[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapPool), error: null };
}

export async function getCreatorBonusPoolById(poolId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_bonus_pools")
    .select("*")
    .eq("id", poolId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Bonus pool not found." };
  return { data: mapPool(data as Record<string, unknown>), error: null };
}

export async function updateCreatorBonusPoolStatus(input: {
  poolId: string;
  status: CreatorBonusPoolStatus;
  approvedBy?: string | null;
}) {
  const db = await createClient();
  const patch: Record<string, unknown> = { status: input.status };
  if (input.approvedBy !== undefined) patch.approved_by = input.approvedBy;
  const { data, error } = await db
    .from("creator_bonus_pools")
    .update(patch)
    .eq("id", input.poolId)
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not update bonus pool." };
  return { data: mapPool(data as Record<string, unknown>), error: null };
}

export async function upsertCreatorBonusAllocations(input: {
  poolId: string;
  rows: Array<{
    creatorUserId: string;
    score: number;
    amountVnd: number;
    status: CreatorBonusAllocationStatus;
    metadata?: Record<string, unknown>;
  }>;
}) {
  const db = await createClient();
  const payload = input.rows.map((row) => ({
    pool_id: input.poolId,
    creator_user_id: row.creatorUserId,
    score: row.score,
    amount_vnd: row.amountVnd,
    status: row.status,
    metadata: row.metadata ?? {}
  }));
  const { data, error } = await db
    .from("creator_bonus_allocations")
    .upsert(payload, { onConflict: "pool_id,creator_user_id" })
    .select("*");
  if (error) return { data: [] as CreatorBonusAllocation[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapAllocation), error: null };
}

export async function listCreatorBonusAllocationsByPool(poolId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_bonus_allocations")
    .select("*")
    .eq("pool_id", poolId)
    .order("amount_vnd", { ascending: false });
  if (error) return { data: [] as CreatorBonusAllocation[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapAllocation), error: null };
}

export async function listCreatorBonusAllocationsForCreator(creatorUserId: string, limit = 20) {
  const db = await createClient();
  const { data, error } = await db
    .from("creator_bonus_allocations")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as CreatorBonusAllocation[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapAllocation), error: null };
}

export async function updateCreatorBonusAllocation(input: {
  allocationId: string;
  status?: CreatorBonusAllocationStatus;
  transactionId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.transactionId !== undefined) patch.transaction_id = input.transactionId;
  if (input.metadata) patch.metadata = input.metadata;
  const { data, error } = await db
    .from("creator_bonus_allocations")
    .update(patch)
    .eq("id", input.allocationId)
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not update allocation." };
  return { data: mapAllocation(data as Record<string, unknown>), error: null };
}
