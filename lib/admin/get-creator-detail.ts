"use server";

import { assertAnyPermission } from "@/lib/auth/require-permission";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCreatorEligibilityStats } from "@/lib/supabase/creator-stats";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminCreatorDetail,
  CreatorAdminOverrides,
  CreatorMonetizationEligibilityItem,
  CreatorRevenueSharePercents
} from "@/types/admin-creator";

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapCustomShare(
  raw: Record<string, number> | null | undefined
): CreatorRevenueSharePercents | null {
  if (!raw || typeof raw !== "object" || !Object.keys(raw).length) return null;
  return {
    paidChapter: toNumber(raw.paid_chapter ?? raw.paidChapter),
    tip: toNumber(raw.tip),
    fanClub: toNumber(raw.fan_club ?? raw.fanClub),
    vipPool: toNumber(raw.vip_pool ?? raw.vipPool),
    bonusPool: toNumber(raw.bonus_pool ?? raw.bonusPool)
  };
}

function parseOverrides(raw: unknown): CreatorAdminOverrides {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    payoutMinAmount: o.payout_min_amount == null ? null : toNumber(o.payout_min_amount),
    internalNote: (o.internal_note as string) ?? null,
    strategicPartner: Boolean(o.strategic_partner),
    bonusPoolEligible: Boolean(o.bonus_pool_eligible),
    featuredAuthorEligible: Boolean(o.featured_author_eligible),
    monetizationEnabledOverride:
      o.monetization_enabled_override == null
        ? null
        : Boolean(o.monetization_enabled_override)
  };
}

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

async function buildEligibility(
  userId: string,
  creatorId: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CreatorMonetizationEligibilityItem[]> {
  const statsResult = await getCreatorEligibilityStats(userId);
  const stats = statsResult.data;

  let emailVerified = false;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    emailVerified = Boolean(data.user?.email_confirmed_at);
  } catch {
    emailVerified = false;
  }

  const minStories = 1;
  const minChapters = 3;
  const minReads = 100;

  const storyCount = creatorId
    ? (
        await supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
      ).count ?? 0
    : 0;

  return [
    {
      key: "email",
      label: "Email đã xác minh",
      description: "Tài khoản đăng nhập đã xác thực email.",
      met: emailVerified
    },
    {
      key: "age",
      label: "Tài khoản đủ tuổi",
      description: "Tài khoản tạo ít nhất 7 ngày.",
      met: stats.account_age_days >= 7
    },
    {
      key: "stories",
      label: "Số truyện tối thiểu",
      description: `Cần ít nhất ${minStories} truyện.`,
      met: storyCount >= minStories
    },
    {
      key: "chapters",
      label: "Số chương tối thiểu",
      description: `Cần ít nhất ${minChapters} chương.`,
      met: stats.chapters_count >= minChapters
    },
    {
      key: "reads",
      label: "Lượt đọc tối thiểu",
      description: `Cần ít nhất ${minReads.toLocaleString("vi-VN")} lượt đọc.`,
      met: stats.total_reads >= minReads
    },
    {
      key: "strikes",
      label: "Không có strike nghiêm trọng",
      description: "Không có strike đang hiệu lực.",
      met: stats.violations_count === 0
    },
    {
      key: "quality",
      label: "Không có case chất lượng đang xử lý",
      description: "Không có truyện đang bị cảnh báo chất lượng.",
      met: true
    }
  ];
}

export async function getAdminCreatorDetail(
  userId: string
): Promise<{ detail: AdminCreatorDetail | null; error: string | null }> {
  await assertAnyPermission(["admin.settings.view", "admin.settings.update", "admin.user.view"]);

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, is_verified, verification_type, verification_label, created_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { detail: null, error: profileError?.message ?? "Không tìm thấy tác giả." };
  }

  const { data: creatorProfileRow } = await supabase
    .from("creator_profiles")
    .select("id, pen_name, bio, status, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  const creatorId = creatorProfileRow?.id as string | undefined;

  const [
    monetization,
    wallet,
    email,
    follows,
    comments,
    saves,
    stories,
    qualityReviews,
    strikes,
    verifications,
    auditLogs,
    ledger,
    shareHistory,
    payoutRequests,
    monetizationConfig
  ] = await Promise.all([
    supabase
      .from("creator_monetization_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("creator_wallets").select("*").eq("user_id", userId).maybeSingle(),
    fetchUserEmail(userId),
    creatorId
      ? supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", creatorId)
          .eq("following_type", "creator")
      : Promise.resolve({ count: 0 }),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("story_saves")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    creatorId
      ? supabase
          .from("stories")
          .select("id, title, slug, status, monetization_status, read_count")
          .eq("creator_id", creatorId)
          .order("updated_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    creatorId
      ? supabase
          .from("content_quality_reviews")
          .select("id, story_id, attempt_number, action, created_at, stories(title)")
          .eq("author_id", creatorId)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
    supabase
      .from("account_strikes")
      .select("id, reason, created_at, expires_at, is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("account_verifications")
      .select("id, verification_type, status, submitted_at, reviewed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_audit_logs")
      .select("id, action, actor_id, created_at, metadata")
      .or(`target_id.eq.${userId},metadata->>target_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_wallet_ledger")
      .select("id, type, amount_vnd, direction, created_at, description")
      .eq("creator_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("creator_revenue_share_history")
      .select("id, enabled, paid_chapter_percent, tip_percent, fan_club_percent, vip_pool_percent, bonus_pool_percent, reason, created_at, created_by")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payout_requests")
      .select(
        "id, amount_vnd, status, requested_at, reviewed_at, completed_at, admin_note"
      )
      .eq("creator_user_id", userId)
      .order("requested_at", { ascending: false })
      .limit(20),
    getMonetizationConfig({ includePrivate: true })
  ]);

  let chapterCount = 0;
  if (creatorId) {
    const { count } = await supabase
      .from("episodes")
      .select("id, stories!inner(creator_id)", { count: "exact", head: true })
      .eq("stories.creator_id", creatorId);
    chapterCount = count ?? 0;
  }

  const storyList = stories.data ?? [];
  const totalReads = storyList.reduce((sum, s) => sum + toNumber(s.read_count), 0);

  const settings = monetizationConfig.settings;
  const defaultRevenueShare: CreatorRevenueSharePercents = {
    paidChapter: toNumber(settings["revenue_share.paid_chapter_creator_percent"] ?? 60),
    tip: toNumber(settings["revenue_share.tip_creator_percent"] ?? 70),
    fanClub: toNumber(settings["revenue_share.fan_club_creator_percent"] ?? 70),
    vipPool: toNumber(settings["revenue_share.vip_creator_pool_percent"] ?? 50),
    bonusPool: toNumber(settings["revenue_share.default_creator_percent"] ?? 70)
  };

  const customShare = mapCustomShare(
    monetization.data?.custom_revenue_share as Record<string, number> | null
  );

  const actorIds = [
    ...new Set(
      (auditLogs.data ?? [])
        .map((l) => l.actor_id as string | null)
        .filter(Boolean) as string[]
    )
  ];
  const historyActorIds = [
    ...new Set(
      (shareHistory.data ?? [])
        .map((h) => h.created_by as string | null)
        .filter(Boolean) as string[]
    )
  ];
  const allActorIds = [...new Set([...actorIds, ...historyActorIds])];
  const { data: actors } = allActorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", allActorIds)
    : { data: [] };
  const actorLabels = new Map(
    (actors ?? []).map((a) => [
      a.id as string,
      (a.display_name as string) ?? (a.username as string) ?? (a.id as string)
    ])
  );

  const eligibility = await buildEligibility(userId, creatorId ?? null, supabase);

  const detail: AdminCreatorDetail = {
    userId,
    creatorProfileId: creatorId ?? null,
    monetizationProfileId: (monetization.data?.id as string) ?? null,
    displayName: profile.display_name as string | null,
    username: profile.username as string | null,
    email,
    avatarUrl: profile.avatar_url as string | null,
    accountCreatedAt: profile.created_at as string,
    studioCreatedAt: (creatorProfileRow?.created_at as string) ?? null,
    studioName: (creatorProfileRow?.pen_name as string) ?? null,
    studioBio: (creatorProfileRow?.bio as string) ?? null,
    studioStatus: creatorProfileRow
      ? creatorProfileRow.status === "suspended"
        ? "suspended"
        : "active"
      : "none",
    monetizationStatus:
      (monetization.data?.status as AdminCreatorDetail["monetizationStatus"]) ?? "none",
    monetizationEnabled: Boolean(monetization.data?.monetization_enabled),
    payoutEnabled: Boolean(monetization.data?.payout_enabled),
    isVerified: Boolean(profile.is_verified),
    verificationType: (profile.verification_type as string) ?? null,
    verificationLabel: (profile.verification_label as string) ?? null,
    hasBlueTick: Boolean(profile.is_verified && profile.verification_type),
    hasActiveWarning: (strikes.data ?? []).some((s) => s.is_active),
    customRevenueShare: customShare,
    useCustomRevenueShare: Boolean(customShare),
    adminOverrides: parseOverrides(monetization.data?.admin_overrides),
    stats: {
      storyCount: storyList.length,
      chapterCount,
      totalReads,
      followCount: follows.count ?? 0,
      commentCount: comments.count ?? 0,
      saveCount: saves.count ?? 0,
      netRevenueVnd: toNumber(wallet.data?.total_earned_vnd),
      availableBalanceVnd: toNumber(wallet.data?.available_revenue_vnd),
      pendingRevenueVnd: toNumber(wallet.data?.pending_revenue_vnd),
      totalWithdrawnVnd: toNumber(wallet.data?.total_withdrawn_vnd)
    },
    eligibility,
    rejectedReason: (monetization.data?.rejected_reason as string) ?? null,
    suspendedReason: (monetization.data?.suspended_reason as string) ?? null,
    defaultRevenueShare,
    revenueShareHistory: (shareHistory.data ?? []).map((h) => ({
      id: h.id as string,
      enabled: Boolean(h.enabled),
      percents: {
        paidChapter: toNumber(h.paid_chapter_percent),
        tip: toNumber(h.tip_percent),
        fanClub: toNumber(h.fan_club_percent),
        vipPool: toNumber(h.vip_pool_percent),
        bonusPool: toNumber(h.bonus_pool_percent)
      },
      reason: h.reason as string,
      createdAt: h.created_at as string,
      createdByLabel: h.created_by
        ? (actorLabels.get(h.created_by as string) ?? null)
        : null
    })),
    payoutRequests: (payoutRequests.data ?? []).map((p) => ({
      id: p.id as string,
      amountVnd: toNumber(p.amount_vnd),
      status: p.status as string,
      requestedAt: p.requested_at as string,
      reviewedAt: (p.reviewed_at as string) ?? null,
      completedAt: (p.completed_at as string) ?? null,
      adminNote: (p.admin_note as string) ?? null
    })),
    recentStories: storyList.map((s) => ({
      id: s.id as string,
      title: s.title as string,
      slug: s.slug as string,
      status: s.status as string,
      monetizationStatus: (s.monetization_status as string) ?? "paid",
      readCount: toNumber(s.read_count)
    })),
    qualityCases: (qualityReviews.data ?? []).map((q) => {
      const story = q.stories as { title: string } | { title: string }[] | null;
      const title = Array.isArray(story) ? story[0]?.title : story?.title;
      return {
        id: q.id as string,
        storyId: q.story_id as string,
        storyTitle: title ?? "—",
        attempt: toNumber(q.attempt_number),
        action: q.action as string,
        createdAt: q.created_at as string
      };
    }),
    strikes: (strikes.data ?? []).map((s) => ({
      id: s.id as string,
      reason: (s.reason as string) ?? null,
      createdAt: s.created_at as string,
      expiresAt: (s.expires_at as string) ?? null,
      isActive: Boolean(s.is_active)
    })),
    verifications: (verifications.data ?? []).map((v) => ({
      id: v.id as string,
      type: v.verification_type as string,
      status: v.status as string,
      submittedAt: (v.submitted_at as string) ?? null,
      reviewedAt: (v.reviewed_at as string) ?? null
    })),
    auditLogs: (auditLogs.data ?? []).map((l) => {
      const meta = (l.metadata as Record<string, unknown>) ?? {};
      return {
        id: l.id as string,
        action: l.action as string,
        actorLabel: l.actor_id ? (actorLabels.get(l.actor_id as string) ?? null) : null,
        createdAt: l.created_at as string,
        reason: (meta.note as string) ?? (meta.reason as string) ?? null,
        oldValue: (meta.before as Record<string, unknown>) ?? null,
        newValue: (meta.after as Record<string, unknown>) ?? null
      };
    }),
    ledgerPreview: (ledger.data ?? []).map((e) => ({
      id: e.id as string,
      type: e.type as string,
      amountVnd: toNumber(e.amount_vnd),
      direction: e.direction as string,
      createdAt: e.created_at as string,
      description: (e.description as string) ?? null
    }))
  };

  return { detail, error: null };
}
