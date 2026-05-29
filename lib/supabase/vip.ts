import { createClient } from "@/lib/supabase/server";
import type { UserSubscription, UserSubscriptionStatus, VipPlan } from "@/types/vip";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPlan(row: Record<string, unknown>): VipPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    price_vnd: toNumber(row.price_vnd),
    duration_days: toNumber(row.duration_days),
    coin_bonus_amount: toNumber(row.coin_bonus_amount),
    benefits: (row.benefits as Record<string, unknown> | null) ?? null,
    is_active: Boolean(row.is_active),
    sort_order: toNumber(row.sort_order),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapSubscription(row: Record<string, unknown>): UserSubscription {
  const rawPlan = row.vip_plans as Record<string, unknown> | Record<string, unknown>[] | null;
  const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    plan_id: String(row.plan_id),
    status: row.status as UserSubscriptionStatus,
    started_at: (row.started_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    renewal_enabled: Boolean(row.renewal_enabled),
    provider: (row.provider as string | null) ?? null,
    provider_subscription_id: (row.provider_subscription_id as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    plan: plan ? mapPlan(plan) : null
  };
}

export async function listVipPlansForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vip_plans")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return { data: [] as VipPlan[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapPlan), error: null };
}

export async function listActiveVipPlans() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vip_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return { data: [] as VipPlan[], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(mapPlan), error: null };
}

export async function getVipPlanById(planId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vip_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapPlan(data as Record<string, unknown>), error: null };
}

export async function upsertVipPlan(input: {
  id?: string;
  name: string;
  description: string | null;
  priceVnd: number;
  durationDays: number;
  coinBonusAmount: number;
  benefits: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    name: input.name,
    description: input.description,
    price_vnd: input.priceVnd,
    duration_days: input.durationDays,
    coin_bonus_amount: input.coinBonusAmount,
    benefits: input.benefits,
    is_active: input.isActive,
    sort_order: input.sortOrder
  };
  const { data, error } = await supabase
    .from("vip_plans")
    .upsert(payload)
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not save VIP plan." };
  return { data: mapPlan(data as Record<string, unknown>), error: null };
}

export async function getLatestUserSubscription(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*, vip_plans(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? null };
  return { data: mapSubscription(data as Record<string, unknown>), error: null };
}

export async function createUserSubscription(input: {
  userId: string;
  planId: string;
  status: UserSubscriptionStatus;
  startedAt: string | null;
  expiresAt: string | null;
  renewalEnabled?: boolean;
  provider?: string | null;
  providerSubscriptionId?: string | null;
  transactionId?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: input.userId,
      plan_id: input.planId,
      status: input.status,
      started_at: input.startedAt,
      expires_at: input.expiresAt,
      renewal_enabled: Boolean(input.renewalEnabled),
      provider: input.provider ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      transaction_id: input.transactionId ?? null
    })
    .select("*, vip_plans(*)")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create user subscription." };
  }
  return { data: mapSubscription(data as Record<string, unknown>), error: null };
}

export async function updateUserSubscriptionStatus(
  subscriptionId: string,
  status: UserSubscriptionStatus
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .update({ status })
    .eq("id", subscriptionId)
    .select("*, vip_plans(*)")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not update subscription." };
  return { data: mapSubscription(data as Record<string, unknown>), error: null };
}
