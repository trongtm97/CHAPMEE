"use server";

import { assertPermission } from "@/lib/auth/require-permission";
import { mapRoleRowsWithAssigners } from "@/lib/admin/get-users";
import { getUserCoinBalance } from "@/lib/coins/get-user-coin-balance";
import { createClient } from "@/lib/supabase/server";
import type { AdminUserDetailFull } from "@/types/admin-user";

async function fetchUserEmail(userId: string): Promise<string | null> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function getAdminUserDetailFull(
  userId: string
): Promise<{ detail: AdminUserDetailFull | null; error: string | null }> {
  await assertPermission("admin.user.view");
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, role, status, created_at, updated_at, is_verified, verification_type, verification_label"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { detail: null, error: error?.message ?? "Không tìm thấy người dùng." };
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    roleRows,
    activeBan,
    coinBalance,
    savesCount,
    followsCount,
    postsCount,
    commentsCount,
    reportsSent,
    reportsReceived,
    safetyBlocked,
    accountRestrictions,
    messagingRestrictions,
    strikes,
    creatorProfile,
    verifications,
    auditLogs,
    email
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("assigned_at, assigned_by, roles(code, name)")
      .eq("user_id", userId),
    supabase
      .from("user_bans")
      .select("id, reason, ends_at, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    getUserCoinBalance(userId),
    supabase
      .from("story_saves")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", userId),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", userId),
    supabase
      .from("message_safety_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since24h)
      .eq("status", "blocked"),
    supabase
      .from("account_restrictions")
      .select("id, restriction_type, reason, ends_at")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("messaging_restrictions")
      .select("id, restriction_type, reason_code, ends_at")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("violations")
      .select("id, policy_area, severity, action_taken, note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("creator_profiles")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("account_verifications")
      .select("id, verification_type, status, submitted_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("admin_audit_logs")
      .select(
        `id, action, metadata, created_at,
         actor:profiles!admin_audit_logs_actor_id_fkey(display_name, username)`
      )
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
    fetchUserEmail(userId)
  ]);

  let storyCountVal = 0;
  if (creatorProfile.data?.id) {
    const { count } = await supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorProfile.data.id as string);
    storyCountVal = count ?? 0;
  }

  const restrictions = [
    ...(accountRestrictions.data ?? []).map((r) => ({
      id: r.id as string,
      type: r.restriction_type as string,
      reason: r.reason as string | null,
      endsAt: r.ends_at as string | null,
      source: "account" as const
    })),
    ...(messagingRestrictions.data ?? []).map((r) => ({
      id: r.id as string,
      type: r.restriction_type as string,
      reason: r.reason_code as string | null,
      endsAt: r.ends_at as string | null,
      source: "messaging" as const
    }))
  ];

  const recentAuditLogs = (auditLogs.data ?? []).map((row) => {
    const actorRaw = row.actor as unknown;
    const actor = (Array.isArray(actorRaw) ? actorRaw[0] : actorRaw) as {
      display_name: string | null;
      username: string | null;
    } | null;
    return {
      id: row.id as string,
      action: row.action as string,
      actorName: actor?.display_name ?? actor?.username ?? "Hệ thống",
      createdAt: row.created_at as string,
      metadata: (row.metadata ?? {}) as Record<string, unknown>
    };
  });

  return {
    detail: {
      id: profile.id as string,
      username: profile.username as string | null,
      displayName: profile.display_name as string | null,
      avatarUrl: profile.avatar_url as string | null,
      email,
      profileRole: profile.role,
      status: (profile.status as string) ?? "active",
      isVerified: Boolean(profile.is_verified),
      verificationType: profile.verification_type as string | null,
      verificationLabel: profile.verification_label as string | null,
      createdAt: profile.created_at as string,
      updatedAt: profile.updated_at as string | null,
      roles: await mapRoleRowsWithAssigners(supabase, roleRows.data ?? []),
      activeBan: activeBan.data
        ? {
            id: activeBan.data.id as string,
            reason: activeBan.data.reason as string,
            endsAt: activeBan.data.ends_at as string | null,
            createdAt: activeBan.data.created_at as string
          }
        : null,
      coinBalance: coinBalance.data,
      stats: {
        storiesReading: 0,
        saves: savesCount.count ?? 0,
        following: followsCount.count ?? 0,
        communityPosts: postsCount.count ?? 0,
        comments: commentsCount.count ?? 0,
        reportsSent: reportsSent.count ?? 0,
        reportsReceived: reportsReceived.count ?? 0,
        safetyBlocked24h: safetyBlocked.count ?? 0
      },
      restrictions,
      strikes: (strikes.data ?? []).map((s) => ({
        id: s.id as string,
        policyArea: s.policy_area as string,
        severity: s.severity as string,
        actionTaken: s.action_taken as string,
        note: s.note as string | null,
        createdAt: s.created_at as string
      })),
      creatorStudio: creatorProfile.data
        ? {
            displayName:
              (profile.display_name as string | null)?.trim() ||
              (profile.username as string | null)?.trim() ||
              "Tác giả",
            status: creatorProfile.data.status as string,
            storyCount: storyCountVal
          }
        : null,
      verifications: (verifications.data ?? []).map((v) => ({
        id: v.id as string,
        type: v.verification_type as string,
        status: v.status as string,
        submittedAt: v.submitted_at as string | null
      })),
      recentAuditLogs
    },
    error: null
  };
}
