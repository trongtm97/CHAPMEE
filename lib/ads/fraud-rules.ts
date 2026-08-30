import { createAdminClient } from "@/lib/data/admin";
import type { AdFraudRule, AdFraudRuleInput } from "@/types/ad-fraud";

function mapRule(row: Record<string, unknown>): AdFraudRule {
  return {
    id: String(row.id),
    rule_key: String(row.rule_key),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    is_enabled: Boolean(row.is_enabled),
    severity: row.severity as AdFraudRule["severity"],
    threshold_config: (row.threshold_config as Record<string, unknown>) ?? {},
    action: row.action as AdFraudRule["action"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function listAdFraudRules(): Promise<{ rules: AdFraudRule[]; error: string | null }> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("ad_fraud_rules")
      .select("*")
      .order("rule_key");
    if (error) return { rules: [], error: error.message };
    return { rules: (data ?? []).map((r) => mapRule(r as Record<string, unknown>)), error: null };
  } catch {
    return { rules: [], error: "Không tải được fraud rules." };
  }
}

export async function updateAdFraudRule(
  ruleKey: string,
  input: AdFraudRuleInput
): Promise<{ rule: AdFraudRule | null; error: string | null }> {
  try {
    const db = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (input.is_enabled !== undefined) patch.is_enabled = input.is_enabled;
    if (input.severity !== undefined) patch.severity = input.severity;
    if (input.threshold_config !== undefined) patch.threshold_config = input.threshold_config;
    if (input.action !== undefined) patch.action = input.action;
    if (input.description !== undefined) patch.description = input.description;

    const { data, error } = await db
      .from("ad_fraud_rules")
      .update(patch)
      .eq("rule_key", ruleKey)
      .select("*")
      .single();

    if (error) return { rule: null, error: error.message };
    return { rule: mapRule(data as Record<string, unknown>), error: null };
  } catch {
    return { rule: null, error: "Không cập nhật được rule." };
  }
}

export function getThresholdNumber(
  config: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const v = config[key];
  return typeof v === "number" ? v : Number(v) || fallback;
}
