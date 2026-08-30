import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  AccountRestrictionRecord,
  AccountStatusSummary,
  AccountStrikeRecord,
  ViolationRecord
} from "@/types/moderation";

function mapViolation(row: Record<string, unknown>): ViolationRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    policyArea: row.policy_area as ViolationRecord["policyArea"],
    severity: row.severity as ViolationRecord["severity"],
    actionTaken: String(row.action_taken),
    strikeCount: Number(row.strike_count ?? 0),
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null
  };
}

export async function getAccountStatus(
  userId: string
): Promise<AccountStatusSummary> {
  const db = await createClient();
  const now = new Date().toISOString();

  const empty: AccountStatusSummary = {
    accountOk: true,
    activeStrikes: [],
    activeRestrictions: [],
    recentViolations: [],
    warningsCount: 0
  };

  const [strikesRes, restrictionsRes, violationsRes] = await Promise.all([
    db
      .from("account_strikes")
      .select("id, policy_area, points, created_at, expires_at, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
    db
      .from("account_restrictions")
      .select(
        "id, restriction_type, reason, starts_at, ends_at, is_active"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("created_at", { ascending: false }),
    db
      .from("violations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  if (
    isMissingSchemaError(strikesRes.error) ||
    isMissingSchemaError(restrictionsRes.error)
  ) {
    return empty;
  }

  const activeStrikes: AccountStrikeRecord[] = (strikesRes.data ?? []).map(
    (row) => ({
      id: row.id,
      policyArea: row.policy_area,
      points: row.points,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      isActive: row.is_active
    })
  );

  const activeRestrictions: AccountRestrictionRecord[] = (
    restrictionsRes.data ?? []
  ).map((row) => ({
    id: row.id,
    restrictionType: row.restriction_type,
    reason: row.reason,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active
  }));

  const recentViolations = (violationsRes.data ?? []).map((row) =>
    mapViolation(row as Record<string, unknown>)
  );

  const warningsCount = recentViolations.filter(
    (v) => v.severity === "warning"
  ).length;

  return {
    accountOk:
      activeRestrictions.length === 0 && activeStrikes.length === 0,
    activeStrikes,
    activeRestrictions,
    recentViolations,
    warningsCount
  };
}
