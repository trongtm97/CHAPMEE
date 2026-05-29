import { createClient } from "@/lib/supabase/server";
import type { RiskEvent, RiskEventStatus, RiskLevel, RiskSeverity, UserRiskProfile } from "@/types/risk";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRiskEvent(row: Record<string, unknown>): RiskEvent {
  return {
    id: String(row.id),
    user_id: (row.user_id as string | null) ?? null,
    creator_user_id: (row.creator_user_id as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    story_id: (row.story_id as string | null) ?? null,
    chapter_id: (row.chapter_id as string | null) ?? null,
    event_type: String(row.event_type),
    severity: row.severity as RiskSeverity,
    risk_score: toNumber(row.risk_score),
    status: row.status as RiskEventStatus,
    reason: String(row.reason ?? ""),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    admin_note: (row.admin_note as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapRiskProfile(row: Record<string, unknown>): UserRiskProfile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    risk_score: toNumber(row.risk_score),
    risk_level: row.risk_level as RiskLevel,
    payout_blocked: Boolean(row.payout_blocked),
    monetization_blocked: Boolean(row.monetization_blocked),
    last_risk_event_at: (row.last_risk_event_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function createRiskEventRecord(input: {
  userId?: string | null;
  creatorUserId?: string | null;
  transactionId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  eventType: string;
  severity: RiskSeverity;
  riskScore: number;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("risk_events")
    .insert({
      user_id: input.userId ?? null,
      creator_user_id: input.creatorUserId ?? null,
      transaction_id: input.transactionId ?? null,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      event_type: input.eventType,
      severity: input.severity,
      risk_score: input.riskScore,
      reason: input.reason,
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create risk event." };
  }
  return { data: mapRiskEvent(data as Record<string, unknown>), error: null };
}

export async function listRiskEventsForAdmin(limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("risk_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as RiskEvent[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapRiskEvent),
    error: null
  };
}

export async function updateRiskEventStatus(input: {
  riskEventId: string;
  status: RiskEventStatus;
  reviewedBy?: string | null;
  adminNote?: string | null;
}) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status: input.status };
  if (input.reviewedBy) {
    patch.reviewed_by = input.reviewedBy;
    patch.reviewed_at = new Date().toISOString();
  }
  if (input.adminNote !== undefined) {
    patch.admin_note = input.adminNote;
  }

  const { data, error } = await supabase
    .from("risk_events")
    .update(patch)
    .eq("id", input.riskEventId)
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not update risk event." };
  }
  return { data: mapRiskEvent(data as Record<string, unknown>), error: null };
}

export async function getOrCreateUserRiskProfile(userId: string) {
  const supabase = await createClient();
  const existing = await supabase
    .from("user_risk_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.data) {
    return { data: mapRiskProfile(existing.data as Record<string, unknown>), error: null };
  }

  const { data, error } = await supabase
    .from("user_risk_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create risk profile." };
  }
  return { data: mapRiskProfile(data as Record<string, unknown>), error: null };
}

export async function updateUserRiskProfileRecord(
  userId: string,
  patch: Partial<
    Pick<
      UserRiskProfile,
      "risk_score" | "risk_level" | "payout_blocked" | "monetization_blocked" | "metadata" | "last_risk_event_at"
    >
  >
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_risk_profiles")
    .update({
      risk_score: patch.risk_score,
      risk_level: patch.risk_level,
      payout_blocked: patch.payout_blocked,
      monetization_blocked: patch.monetization_blocked,
      metadata: patch.metadata,
      last_risk_event_at: patch.last_risk_event_at
    })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not update risk profile." };
  }
  return { data: mapRiskProfile(data as Record<string, unknown>), error: null };
}

export async function listOpenHighRiskEventsByCreator(creatorUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("risk_events")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .eq("status", "open")
    .in("severity", ["high", "critical"])
    .order("created_at", { ascending: false });
  if (error) return { data: [] as RiskEvent[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapRiskEvent),
    error: null
  };
}
