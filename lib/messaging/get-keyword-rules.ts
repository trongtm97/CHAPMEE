import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { MessageSafetyKeywordRule } from "@/types/messaging-safety";

let cachedRules: MessageSafetyKeywordRule[] | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

function mapRow(row: Record<string, unknown>): MessageSafetyKeywordRule {
  return {
    id: row.id as string,
    keyword: row.keyword as string,
    action: row.action as MessageSafetyKeywordRule["action"],
    severity: row.severity as MessageSafetyKeywordRule["severity"],
    category: (row.category as MessageSafetyKeywordRule["category"]) ?? null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string
  };
}

export async function getActiveKeywordRules(): Promise<MessageSafetyKeywordRule[]> {
  if (cachedRules && Date.now() - cacheAt < CACHE_MS) {
    return cachedRules;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_safety_keyword_rules")
    .select("id, keyword, action, severity, category, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    return [];
  }

  cachedRules = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  cacheAt = Date.now();
  return cachedRules;
}

export function invalidateKeywordRulesCache() {
  cachedRules = null;
  cacheAt = 0;
}
