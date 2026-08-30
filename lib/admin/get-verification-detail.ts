"use server";

import { assertAnyPermission } from "@/lib/auth/require-permission";
import { checkUsernameVerificationRisk } from "@/lib/admin/check-username-verification-risk";
import { createClient } from "@/lib/data/server";
import type {
  VerificationAuditEntry,
  VerificationDetail,
  VerificationHistoryEntry,
  VerificationNote,
  VerificationRiskFlag,
  VerificationUserProfile
} from "@/types/admin-verification";
import type { VerificationSource, VerificationStatus, VerificationType } from "@/types/verification";

async function fetchUserEmail(userId: string) {
  try {
    const { createAdminClient } = await import("@/lib/data/admin");
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

function buildHistory(
  row: Record<string, unknown>,
  auditLogs: VerificationAuditEntry[]
): VerificationHistoryEntry[] {
  const entries: VerificationHistoryEntry[] = [];

  if (row.submitted_at || row.created_at) {
    entries.push({
      id: `submit-${row.id}`,
      action: "Gửi yêu cầu",
      actorId: String(row.user_id),
      actorName: null,
      note: (row.request_reason as string | null) ?? null,
      oldValue: null,
      newValue: String(row.status),
      createdAt: String(row.submitted_at ?? row.created_at)
    });
  }

  for (const log of auditLogs) {
    entries.push({
      id: log.id,
      action: formatAuditAction(log.action),
      actorId: log.actorId,
      actorName: log.actorName,
      note: log.reason,
      oldValue: log.oldValue,
      newValue: log.newValue,
      createdAt: log.createdAt
    });
  }

  if (row.reviewed_at && row.status === "approved") {
    const hasApprove = entries.some((e) => e.action.includes("Duyệt"));
    if (!hasApprove) {
      entries.push({
        id: `approve-${row.id}`,
        action: row.source === "admin_direct" ? "Cấp thủ công" : "Duyệt xác thực",
        actorId: (row.reviewed_by as string | null) ?? null,
        actorName: null,
        note: (row.public_note as string | null) ?? null,
        oldValue: "pending",
        newValue: "approved",
        createdAt: String(row.reviewed_at)
      });
    }
  }

  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return entries;
}

function formatAuditAction(action: string) {
  const map: Record<string, string> = {
    verification_request_viewed: "Admin xem chi tiết",
    verification_approved: "Duyệt xác thực",
    verification_grant: "Duyệt xác thực",
    verification_rejected: "Từ chối",
    verification_reject: "Từ chối",
    verification_needs_more_info: "Yêu cầu bổ sung",
    verification_revoked: "Thu hồi xác thực",
    verification_revoke: "Thu hồi xác thực",
    verification_manual_granted: "Cấp thủ công",
    verification_public_badge_enabled: "Bật badge công khai",
    verification_public_badge_disabled: "Tắt badge công khai",
    verification_label_changed: "Đổi nhãn công khai",
    verification_update: "Cập nhật xác thực",
    verification_note_added: "Thêm ghi chú nội bộ"
  };
  return map[action] ?? action;
}

function computeRiskFlags(input: {
  accountCreatedAt: string | null;
  emailVerified: boolean;
  usernameRisky: boolean;
  reportCount: number;
  strikeCount: number;
  restricted: boolean;
  storyCount: number;
  isAuthor: boolean;
  hasStudio: boolean;
  verificationType: string;
}): VerificationRiskFlag[] {
  const flags: VerificationRiskFlag[] = [];
  if (input.accountCreatedAt) {
    const age = Date.now() - new Date(input.accountCreatedAt).getTime();
    if (age < 30 * 86400000) flags.push("new_account");
  }
  if (!input.emailVerified) flags.push("email_unverified");
  if (input.usernameRisky) flags.push("sensitive_username");
  if (input.reportCount > 0) flags.push("has_reports");
  if (input.strikeCount > 0) flags.push("has_strikes");
  if (input.restricted) flags.push("restricted");
  if (input.storyCount === 0) flags.push("no_public_content");
  if (
    ["author_verified", "identity_verified", "notable_author"].includes(
      input.verificationType
    ) &&
    input.isAuthor &&
    !input.hasStudio
  ) {
    flags.push("no_studio");
  }
  return flags;
}

async function creatorProfilePromise(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: creator } = await db
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!creator?.id) {
    return { storyCount: 0, readCount: 0 };
  }

  const { data: stories } = await db
    .from("stories")
    .select("read_count")
    .eq("creator_id", creator.id);

  const storyCount = stories?.length ?? 0;
  const readCount = (stories ?? []).reduce(
    (sum, row) => sum + (Number(row.read_count) || 0),
    0
  );
  return { storyCount, readCount };
}

export async function getVerificationDetail(
  verificationId: string,
  options?: { includeInternalNotes?: boolean }
): Promise<{ detail: VerificationDetail | null; error: string | null }> {
  await assertAnyPermission(["admin.user.update", "admin.user.view"]);

  const db = await createClient();
  const { data: row, error } = await db
    .from("account_verifications")
    .select("*")
    .eq("id", verificationId)
    .maybeSingle();

  if (error || !row) {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("[getVerificationDetail]", error.message);
    }
    return { detail: null, error: "load_failed" };
  }

  const userId = String(row.user_id);
  const reviewerId = row.reviewed_by ? String(row.reviewed_by) : null;
  const revokerId = row.revoked_by ? String(row.revoked_by) : null;

  const [
    profileResult,
    email,
    creatorProfile,
    storyStats,
    followerCount,
    postsCount,
    commentsCount,
    reportsCount,
    strikesCount,
    restrictionsCount,
    monetization,
    wallet,
    payoutPending,
    notesResult,
    auditResult
  ] = await Promise.all([
    db
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, status, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    fetchUserEmail(userId),
    db
      .from("creator_profiles")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle(),
    creatorProfilePromise(db, userId),
    db
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    db
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", userId),
    db
      .from("violations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("account_restrictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true),
    db
      .from("creator_monetization_profiles")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("creator_wallets")
      .select("total_earned_vnd")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("payout_requests")
      .select("id", { count: "exact", head: true })
      .eq("creator_user_id", userId)
      .in("status", ["requested", "under_review"]),
    options?.includeInternalNotes !== false
      ? db
          .from("verification_notes")
          .select("id, verification_id, admin_id, note, tag, created_at")
          .eq("verification_id", verificationId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    db
      .from("admin_audit_logs")
      .select("id, action, actor_id, metadata, created_at")
      .eq("target_type", "account_verification")
      .eq("target_id", verificationId)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  const profile = profileResult.data;
  const usernameRiskCheck = await checkUsernameVerificationRisk(profile?.username);

  let actorProfiles = new Map<string, { display_name: string | null; username: string | null }>();
  const actorIds = [
    ...new Set([
      ...(notesResult.data ?? []).map((n) => n.admin_id),
      ...(auditResult.data ?? []).map((a) => a.actor_id),
      reviewerId,
      revokerId
    ].filter(Boolean))
  ] as string[];

  if (actorIds.length) {
    const { data: actors } = await db
      .from("profiles")
      .select("id, display_name, username")
      .in("id", actorIds);
    for (const actor of actors ?? []) {
      actorProfiles.set(actor.id, actor);
    }
  }

  const auditLogs: VerificationAuditEntry[] = (auditResult.data ?? []).map((log) => {
    const meta = (log.metadata ?? {}) as Record<string, unknown>;
    const actor = log.actor_id ? actorProfiles.get(log.actor_id) : null;
    return {
      id: log.id,
      action: log.action,
      actorId: log.actor_id,
      actorName: actor?.display_name ?? actor?.username ?? null,
      oldValue: meta.before ? JSON.stringify(meta.before) : null,
      newValue: meta.after ? JSON.stringify(meta.after) : null,
      reason: (meta.reason as string | null) ?? (meta.note as string | null) ?? null,
      createdAt: log.created_at
    };
  });

  const notes: VerificationNote[] = (notesResult.data ?? []).map((note) => {
    const admin = actorProfiles.get(note.admin_id);
    return {
      id: note.id,
      verificationId: note.verification_id,
      adminId: note.admin_id,
      adminName: admin?.display_name ?? admin?.username ?? null,
      note: note.note,
      tag: note.tag as VerificationNote["tag"],
      createdAt: note.created_at
    };
  });

  const userProfile: VerificationUserProfile = {
    userId,
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    email,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? null,
    accountStatus: profile?.status ?? null,
    createdAt: profile?.created_at ?? null,
    isAuthor: Boolean(creatorProfile.data),
    studioName:
      profile?.display_name?.trim() ||
      profile?.username?.trim() ||
      null,
    storyCount: storyStats.storyCount,
    followerCount: followerCount.count ?? 0,
    readCount: storyStats.readCount,
    monetizationStatus: monetization.data?.status ?? null,
    violationStatus: (strikesCount.count ?? 0) > 0 ? "có vi phạm" : "bình thường",
    lastActiveAt: profile?.updated_at ?? null,
    communityPostCount: postsCount.count ?? 0,
    commentCount: commentsCount.count ?? 0,
    reportCount: reportsCount.count ?? 0,
    strikeCount: strikesCount.count ?? 0,
    revenueVnd: Number(wallet.data?.total_earned_vnd) || 0,
    pendingPayout: (payoutPending.count ?? 0) > 0
  };

  const reviewer = reviewerId ? actorProfiles.get(reviewerId) : null;
  const revoker = revokerId ? actorProfiles.get(revokerId) : null;

  const riskFlags = computeRiskFlags({
    accountCreatedAt: profile?.created_at ?? null,
    emailVerified: Boolean(email),
    usernameRisky: usernameRiskCheck.risky,
    reportCount: reportsCount.count ?? 0,
    strikeCount: strikesCount.count ?? 0,
    restricted: (restrictionsCount.count ?? 0) > 0,
    storyCount: storyStats.storyCount,
    isAuthor: Boolean(creatorProfile.data),
    hasStudio: Boolean(creatorProfile.data),
    verificationType: String(row.verification_type)
  });

  const detail: VerificationDetail = {
    id: String(row.id),
    userId,
    verificationType: row.verification_type as VerificationType,
    status: row.status as VerificationStatus,
    source: (row.source ?? "user_request") as VerificationSource,
    publicBadgeEnabled: Boolean(row.display_badge),
    publicLabel: row.public_label,
    requestReason: row.request_reason,
    rejectionReason: row.rejection_reason ?? (row.status === "rejected" ? row.public_label : null),
    publicNote: row.public_note,
    adminNote: options?.includeInternalNotes !== false ? row.admin_note : null,
    revokeReason: row.revoke_reason,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedById: reviewerId,
    reviewedByName: reviewer?.display_name ?? reviewer?.username ?? null,
    revokedAt: row.revoked_at,
    revokedById: revokerId,
    revokedByName: revoker?.display_name ?? revoker?.username ?? null,
    needsMoreInfoDeadline: row.needs_more_info_deadline ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: userProfile,
    riskFlags,
    usernameRiskWarning: usernameRiskCheck.warning,
    notes,
    history: buildHistory(row as Record<string, unknown>, auditLogs),
    auditLogs
  };

  return { detail, error: null };
}

export async function loadVerificationDetailAction(verificationId: string) {
  return getVerificationDetail(verificationId);
}
