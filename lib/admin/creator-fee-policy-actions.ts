"use server";

import { mapCreatorFeePolicyRow } from "@/lib/admin/creator-fee-policy-shared";
import { requireCreatorFeeViewAccess } from "@/lib/auth/creator-fee-guards";
import { resolveCreatorFeePolicy } from "@/lib/finance/resolve-creator-fee-policy";
import { createClient } from "@/lib/data/server";
import type { CreatorFeePolicyAdminView } from "@/types/creator-fee-policy";

async function countTransactionsForPolicy(policyId: string): Promise<number> {
  const db = await createClient();
  const { count, error } = await db
    .from("creator_earning_transactions")
    .select("id", { count: "exact", head: true })
    .filter("calculation_snapshot->>policy_id", "eq", policyId);

  if (error) {
    return 0;
  }
  return count ?? 0;
}

export async function fetchCreatorFeePoliciesForUserAction(creatorId: string) {
  const guard = await requireCreatorFeeViewAccess();
  if (!guard.ok) {
    return {
      policies: [] as CreatorFeePolicyAdminView[],
      current: null,
      defaultResolved: null,
      error: guard.error
    };
  }

  const db = await createClient();
  const { data: profile } = await db
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", creatorId)
    .maybeSingle();

  const creatorLabel =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    creatorId.slice(0, 8);

  const { data, error } = await db
    .from("creator_fee_policies")
    .select("*")
    .eq("creator_id", creatorId)
    .order("starts_at", { ascending: false });

  if (error) {
    return {
      policies: [],
      current: null,
      defaultResolved: null,
      error: "Không thể tải chính sách phí. Vui lòng thử lại."
    };
  }

  const policies: CreatorFeePolicyAdminView[] = await Promise.all(
    (data ?? []).map(async (row) => {
      const mapped = mapCreatorFeePolicyRow(row as Record<string, unknown>);
      const transaction_count = await countTransactionsForPolicy(mapped.id);
      return {
        ...mapped,
        transaction_count,
        creator_label: creatorLabel,
        creator_username: (profile?.username as string) ?? null,
        creator_email: null,
        creator_avatar_url: (profile?.avatar_url as string) ?? null,
        studio_name: null,
        updated_by_label: null
      };
    })
  );

  const current = policies.find((p) => p.status === "active" || p.status === "scheduled") ?? null;
  const defaultResolved = await resolveCreatorFeePolicy({
    creatorId,
    transactionType: "paid_chapter"
  });

  return { policies, current, defaultResolved, error: null };
}

export async function fetchCreatorFeePolicyTransactionsAction(policyId: string, limit = 20) {
  const guard = await requireCreatorFeeViewAccess();
  if (!guard.ok) {
    return { rows: [], error: guard.error };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("creator_earning_transactions")
    .select(
      "id, creator_user_id, source_type, gross_amount_vnd, platform_fee_vnd, creator_net_amount_vnd, created_at, calculation_snapshot"
    )
    .filter("calculation_snapshot->>policy_id", "eq", policyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: "Không thể tải giao dịch." };
  }

  return { rows: data ?? [], error: null };
}
