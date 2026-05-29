"use server";

import { assertPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { UserOperationsSummary } from "@/types/admin-user";

export async function getUserOperationsSummary(): Promise<UserOperationsSummary> {
  await assertPermission("admin.user.view");
  const supabase = await createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [
    totalRes,
    new24hRes,
    active7dRes,
    creatorsRes,
    bannedRes,
    pendingVerRes,
    strikesRes,
    accountRestrictedRes,
    messagingRestrictedRes
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", since7d),
    supabase
      .from("creator_profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "banned"),
    supabase
      .from("account_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("violations")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", since7d),
    supabase
      .from("account_restrictions")
      .select("user_id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`),
    supabase
      .from("messaging_restrictions")
      .select("user_id", { count: "exact", head: true })
      .eq("is_active", true)
  ]);

  return {
    totalUsers: totalRes.count ?? 0,
    newUsers24h: new24hRes.count ?? 0,
    active7d: active7dRes.count ?? 0,
    creators: creatorsRes.count ?? 0,
    restrictedUsers:
      (accountRestrictedRes.count ?? 0) + (messagingRestrictedRes.count ?? 0),
    bannedUsers: bannedRes.count ?? 0,
    pendingVerification: pendingVerRes.count ?? 0,
    usersWithStrikes: strikesRes.count ?? 0
  };
}
