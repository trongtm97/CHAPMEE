"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAdFraudSignalRow = {
  id: string;
  rule_key: string;
  severity: string;
  author_id: string | null;
  username: string | null;
  month: string | null;
  status: string;
  created_at: string;
  admin_note: string | null;
};

export async function listAdFraudSignalsForPolicyAdmin(options?: {
  limit?: number;
  status?: string;
}): Promise<{ signals: AdminAdFraudSignalRow[]; error: string | null }> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("ad_fraud_signals")
      .select(
        `
        id, rule_key, severity, author_id, month, status, admin_note, created_at,
        author:profiles!ad_fraud_signals_author_id_fkey(username)
      `
      )
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 30);

    if (options?.status) {
      query = query.eq("status", options.status);
    } else {
      query = query.in("status", ["open", "reviewing"]);
    }

    const { data, error } = await query;
    if (error) return { signals: [], error: error.message };

    const signals = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const author = (row as { author?: { username?: string } }).author;
      return {
        id: String(r.id),
        rule_key: String(r.rule_key),
        severity: String(r.severity),
        author_id: (r.author_id as string | null) ?? null,
        username: author?.username ?? null,
        month: (r.month as string | null) ?? null,
        status: String(r.status),
        created_at: String(r.created_at),
        admin_note: (r.admin_note as string | null) ?? null
      };
    });

    return { signals, error: null };
  } catch {
    return { signals: [], error: "Không tải được tín hiệu fraud." };
  }
}
