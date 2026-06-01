import { createAdminClient } from "@/lib/supabase/admin";
import { logAdFraudAudit } from "@/lib/ads/fraud-audit";
import type { AdFraudSignal, AdFraudSignalListItem, AdFraudSignalStatus } from "@/types/ad-fraud";

function mapSignal(row: Record<string, unknown>): AdFraudSignal {
  return {
    id: String(row.id),
    rule_key: String(row.rule_key),
    severity: row.severity as AdFraudSignal["severity"],
    author_id: (row.author_id as string | null) ?? null,
    story_id: (row.story_id as string | null) ?? null,
    chapter_id: (row.chapter_id as string | null) ?? null,
    month: (row.month as string | null) ?? null,
    event_date: row.event_date ? String(row.event_date) : null,
    signal_data: (row.signal_data as Record<string, unknown>) ?? {},
    status: row.status as AdFraudSignalStatus,
    admin_note: (row.admin_note as string | null) ?? null,
    created_at: String(row.created_at),
    resolved_by: (row.resolved_by as string | null) ?? null,
    resolved_at: (row.resolved_at as string | null) ?? null
  };
}

export async function listAdFraudSignals(filters: {
  status?: string;
  severity?: string;
  rule_key?: string;
  month?: string;
  author_id?: string;
  limit?: number;
}): Promise<{ signals: AdFraudSignalListItem[]; error: string | null }> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("ad_fraud_signals")
      .select(
        `
        *,
        author:profiles!ad_fraud_signals_author_id_fkey(username, display_name),
        story:stories!ad_fraud_signals_story_id_fkey(title)
      `
      )
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 100);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.rule_key) query = query.eq("rule_key", filters.rule_key);
    if (filters.month) query = query.eq("month", filters.month);
    if (filters.author_id) query = query.eq("author_id", filters.author_id);

    const { data, error } = await query;
    if (error) return { signals: [], error: error.message };

    const ruleKeys = [...new Set((data ?? []).map((r) => String((r as { rule_key: string }).rule_key)))];
    const { data: rules } = await supabase
      .from("ad_fraud_rules")
      .select("rule_key, name")
      .in("rule_key", ruleKeys.length ? ruleKeys : ["__none__"]);
    const ruleNameMap = new Map((rules ?? []).map((r) => [String(r.rule_key), String(r.name)]));

    const signals = (data ?? []).map((row) => {
      const base = mapSignal(row as Record<string, unknown>);
      const author = (row as { author?: { username?: string; display_name?: string } }).author;
      const story = (row as { story?: { title?: string } }).story;
      return {
        ...base,
        author_username: author?.username ?? null,
        author_display_name: author?.display_name ?? null,
        story_title: story?.title ?? null,
        rule_name: ruleNameMap.get(base.rule_key) ?? base.rule_key
      };
    });

    return { signals, error: null };
  } catch {
    return { signals: [], error: "Không tải được signals." };
  }
}

export async function updateAdFraudSignalStatus(input: {
  signalId: string;
  status: AdFraudSignalStatus;
  adminNote?: string;
  actorId: string;
}): Promise<{ signal: AdFraudSignal | null; error: string | null }> {
  const supabase = createAdminClient();
  const { data: beforeRow } = await supabase
    .from("ad_fraud_signals")
    .select("*")
    .eq("id", input.signalId)
    .maybeSingle();

  if (!beforeRow) return { signal: null, error: "Không tìm thấy signal." };

  const patch: Record<string, unknown> = {
    status: input.status,
    admin_note: input.adminNote ?? (beforeRow.admin_note as string | null)
  };

  if (input.status === "resolved" || input.status === "dismissed") {
    patch.resolved_by = input.actorId;
    patch.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("ad_fraud_signals")
    .update(patch)
    .eq("id", input.signalId)
    .select("*")
    .single();

  if (error) return { signal: null, error: error.message };

  const signal = mapSignal(data as Record<string, unknown>);
  await logAdFraudAudit({
    actorId: input.actorId,
    action: `signal_${input.status}`,
    signalId: input.signalId,
    before: beforeRow as Record<string, unknown>,
    after: signal as unknown as Record<string, unknown>
  });

  return { signal, error: null };
}

export async function insertAdFraudSignalIfNew(input: {
  rule_key: string;
  severity: AdFraudSignal["severity"];
  author_id?: string | null;
  story_id?: string | null;
  chapter_id?: string | null;
  month?: string | null;
  event_date?: string | null;
  signal_data?: Record<string, unknown>;
}): Promise<{ created: boolean; error: string | null }> {
  const supabase = createAdminClient();

  let dupQuery = supabase
    .from("ad_fraud_signals")
    .select("id")
    .eq("rule_key", input.rule_key)
    .in("status", ["open", "reviewing"]);

  if (input.author_id) dupQuery = dupQuery.eq("author_id", input.author_id);
  else dupQuery = dupQuery.is("author_id", null);

  if (input.story_id) dupQuery = dupQuery.eq("story_id", input.story_id);
  else dupQuery = dupQuery.is("story_id", null);

  if (input.chapter_id) dupQuery = dupQuery.eq("chapter_id", input.chapter_id);
  else dupQuery = dupQuery.is("chapter_id", null);

  if (input.event_date) dupQuery = dupQuery.eq("event_date", input.event_date);
  else dupQuery = dupQuery.is("event_date", null);

  if (input.month) dupQuery = dupQuery.eq("month", input.month);
  else dupQuery = dupQuery.is("month", null);

  const { data: existing } = await dupQuery.maybeSingle();
  if (existing) return { created: false, error: null };

  const { error } = await supabase.from("ad_fraud_signals").insert({
    rule_key: input.rule_key,
    severity: input.severity,
    author_id: input.author_id ?? null,
    story_id: input.story_id ?? null,
    chapter_id: input.chapter_id ?? null,
    month: input.month ?? null,
    event_date: input.event_date ?? null,
    signal_data: input.signal_data ?? {}
  });

  if (error) {
    if (error.code === "23505") return { created: false, error: null };
    return { created: false, error: error.message };
  }
  return { created: true, error: null };
}
