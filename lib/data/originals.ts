import { createClient } from "@/lib/data/server";
import type {
  IpDealFinancialRow,
  IpDealRow,
  IpDealStatus,
  IpDealType,
  IpFinancialType,
  StoryOriginalStatus,
  StoryOriginalsStatusRow
} from "@/types/originals";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapOriginalStatus(row: Record<string, unknown>): StoryOriginalsStatusRow {
  return {
    id: String(row.id),
    story_id: String(row.story_id),
    creator_user_id: String(row.creator_user_id),
    status: row.status as StoryOriginalStatus,
    selected_by: (row.selected_by as string | null) ?? null,
    selected_at: (row.selected_at as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapIpDeal(row: Record<string, unknown>): IpDealRow {
  return {
    id: String(row.id),
    story_id: String(row.story_id),
    creator_user_id: String(row.creator_user_id),
    deal_type: row.deal_type as IpDealType,
    rights: (row.rights as Record<string, unknown> | null) ?? null,
    status: row.status as IpDealStatus,
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    advance_amount_vnd:
      row.advance_amount_vnd == null ? null : toNumber(row.advance_amount_vnd),
    revenue_share: (row.revenue_share as Record<string, unknown> | null) ?? null,
    admin_note: (row.admin_note as string | null) ?? null,
    created_by: String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapIpDealFinancial(row: Record<string, unknown>): IpDealFinancialRow {
  return {
    id: String(row.id),
    deal_id: String(row.deal_id),
    type: row.type as IpFinancialType,
    amount_vnd: toNumber(row.amount_vnd),
    description: (row.description as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    created_at: String(row.created_at)
  };
}

export async function upsertStoryOriginalStatus(input: {
  storyId: string;
  creatorUserId: string;
  status: StoryOriginalStatus;
  selectedBy?: string | null;
  note?: string | null;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("story_originals_status")
    .upsert(
      {
        story_id: input.storyId,
        creator_user_id: input.creatorUserId,
        status: input.status,
        selected_by: input.selectedBy ?? null,
        selected_at: input.selectedBy ? new Date().toISOString() : null,
        note: input.note ?? null
      },
      { onConflict: "story_id" }
    )
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not update originals status." };
  }
  return { data: mapOriginalStatus(data as Record<string, unknown>), error: null };
}

export async function getStoryOriginalStatus(storyId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("story_originals_status")
    .select("*")
    .eq("story_id", storyId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: mapOriginalStatus(data as Record<string, unknown>), error: null };
}

export async function listStoryOriginalStatusesForAdmin(limit = 200) {
  const db = await createClient();
  const { data, error } = await db
    .from("story_originals_status")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as StoryOriginalsStatusRow[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapOriginalStatus),
    error: null
  };
}

export async function listStoryOriginalStatusesForCreator(creatorUserId: string, limit = 100) {
  const db = await createClient();
  const { data, error } = await db
    .from("story_originals_status")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as StoryOriginalsStatusRow[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapOriginalStatus),
    error: null
  };
}

export async function createIpDeal(input: {
  storyId: string;
  creatorUserId: string;
  dealType: IpDealType;
  rights?: Record<string, unknown>;
  status: IpDealStatus;
  startDate?: string | null;
  endDate?: string | null;
  advanceAmountVnd?: number | null;
  revenueShare?: Record<string, unknown> | null;
  adminNote?: string | null;
  createdBy: string;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("ip_deals")
    .insert({
      story_id: input.storyId,
      creator_user_id: input.creatorUserId,
      deal_type: input.dealType,
      rights: input.rights ?? {},
      status: input.status,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      advance_amount_vnd: input.advanceAmountVnd ?? null,
      revenue_share: input.revenueShare ?? null,
      admin_note: input.adminNote ?? null,
      created_by: input.createdBy
    })
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not create IP deal." };
  return { data: mapIpDeal(data as Record<string, unknown>), error: null };
}

export async function listIpDealsForAdmin(limit = 200) {
  const db = await createClient();
  const { data, error } = await db
    .from("ip_deals")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as IpDealRow[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapIpDeal), error: null };
}

export async function listIpDealsForCreator(creatorUserId: string, limit = 100) {
  const db = await createClient();
  const { data, error } = await db
    .from("ip_deals")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as IpDealRow[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapIpDeal), error: null };
}

export async function createIpDealFinancial(input: {
  dealId: string;
  type: IpFinancialType;
  amountVnd: number;
  description?: string | null;
  transactionId?: string | null;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("ip_deal_financials")
    .insert({
      deal_id: input.dealId,
      type: input.type,
      amount_vnd: input.amountVnd,
      description: input.description ?? null,
      transaction_id: input.transactionId ?? null
    })
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create IP deal financial entry." };
  }
  return { data: mapIpDealFinancial(data as Record<string, unknown>), error: null };
}

export async function listIpDealFinancials(dealId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("ip_deal_financials")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) return { data: [] as IpDealFinancialRow[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapIpDealFinancial), error: null };
}
