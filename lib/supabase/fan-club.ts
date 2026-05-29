import { createClient } from "@/lib/supabase/server";
import type { FanClubMembership, FanClubMembershipStatus, FanClubPlan } from "@/types/fan-club";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPlan(row: Record<string, unknown>): FanClubPlan {
  return {
    id: String(row.id),
    creator_user_id: String(row.creator_user_id),
    story_id: (row.story_id as string | null) ?? null,
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    coin_price: toNumber(row.coin_price),
    duration_days: toNumber(row.duration_days),
    benefits: (row.benefits as Record<string, unknown> | null) ?? null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapMembership(row: Record<string, unknown>): FanClubMembership {
  const rawPlan = row.fan_club_plans as Record<string, unknown> | Record<string, unknown>[] | null;
  const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    creator_user_id: String(row.creator_user_id),
    story_id: (row.story_id as string | null) ?? null,
    plan_id: String(row.plan_id),
    status: row.status as FanClubMembershipStatus,
    started_at: (row.started_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    plan: plan ? mapPlan(plan) : null
  };
}

export async function listFanClubPlansByCreator(creatorUserId: string, storyId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("fan_club_plans")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false });
  if (storyId) query = query.eq("story_id", storyId);
  const { data, error } = await query;
  if (error) return { data: [] as FanClubPlan[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapPlan), error: null };
}

export async function listActiveFanClubPlansByCreator(creatorUserId: string, storyId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("fan_club_plans")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (storyId) {
    query = query.or(`story_id.eq.${storyId},story_id.is.null`);
  }
  const { data, error } = await query;
  if (error) return { data: [] as FanClubPlan[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapPlan), error: null };
}

export async function getFanClubPlanById(planId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("fan_club_plans").select("*").eq("id", planId).maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapPlan(data as Record<string, unknown>), error: null };
}

export async function upsertFanClubPlan(input: {
  id?: string;
  creatorUserId: string;
  storyId: string | null;
  name: string;
  description: string | null;
  coinPrice: number;
  durationDays: number;
  benefits: Record<string, unknown>;
  isActive: boolean;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fan_club_plans")
    .upsert({
      ...(input.id ? { id: input.id } : {}),
      creator_user_id: input.creatorUserId,
      story_id: input.storyId,
      name: input.name,
      description: input.description,
      coin_price: input.coinPrice,
      duration_days: input.durationDays,
      benefits: input.benefits,
      is_active: input.isActive
    })
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not save fan club plan." };
  return { data: mapPlan(data as Record<string, unknown>), error: null };
}

export async function getFanClubMembership(userId: string, creatorUserId: string, storyId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("fan_club_memberships")
    .select("*, fan_club_plans(*)")
    .eq("user_id", userId)
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (storyId) query = query.eq("story_id", storyId);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapMembership(data as Record<string, unknown>), error: null };
}

export async function createFanClubMembership(input: {
  userId: string;
  creatorUserId: string;
  storyId: string | null;
  planId: string;
  status: FanClubMembershipStatus;
  startedAt: string;
  expiresAt: string;
  transactionId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fan_club_memberships")
    .insert({
      user_id: input.userId,
      creator_user_id: input.creatorUserId,
      story_id: input.storyId,
      plan_id: input.planId,
      status: input.status,
      started_at: input.startedAt,
      expires_at: input.expiresAt,
      transaction_id: input.transactionId
    })
    .select("*, fan_club_plans(*)")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not create membership." };
  return { data: mapMembership(data as Record<string, unknown>), error: null };
}

export async function listFanClubMembersByCreator(creatorUserId: string, limit = 30) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fan_club_memberships")
    .select("*, fan_club_plans(*)")
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as FanClubMembership[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapMembership), error: null };
}
