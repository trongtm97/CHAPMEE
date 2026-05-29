import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { UserTrustScoreBreakdown } from "@/types/community-auto-moderation";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function tierFromScore(score: number): UserTrustScoreBreakdown["tier"] {
  if (score >= 80) return "very_trusted";
  if (score >= 60) return "trusted";
  if (score >= 30) return "normal";
  return "high_risk";
}

export async function calculateUserTrustScore(
  userId: string,
  options?: { emailVerified?: boolean }
): Promise<UserTrustScoreBreakdown> {
  const supabase = await createClient();
  const factors: UserTrustScoreBreakdown["factors"] = [];
  let score = 50;

  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const since90d = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const now = new Date().toISOString();

  const [
    profileRes,
    approvedRes,
    rejectedRes,
    strikesRes,
    monetizationRes,
    violationsRes
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "created_at, is_verified, verification_type, community_trusted, community_restricted, community_restricted_until"
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "approved"),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "rejected")
      .gte("created_at", since30d),
    supabase
      .from("account_strikes")
      .select("id, points")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gt("expires_at", now),
    supabase
      .from("creator_monetization_profiles")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("violations")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", since90d)
      .limit(1)
  ]);

  const profile = profileRes.data;
  const accountAgeDays = profile?.created_at
    ? Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
      )
    : 0;

  const emailVerified = options?.emailVerified ?? false;
  if (emailVerified) {
    score += 10;
    factors.push({ key: "email_verified", label: "Email đã xác minh", delta: 10 });
  }

  if (accountAgeDays >= 30) {
    score += 10;
    factors.push({ key: "account_age_30", label: "Tài khoản ≥ 30 ngày", delta: 10 });
  } else if (accountAgeDays >= 7) {
    score += 5;
    factors.push({ key: "account_age_7", label: "Tài khoản ≥ 7 ngày", delta: 5 });
  } else if (accountAgeDays < 3) {
    score -= 15;
    factors.push({ key: "account_age_new", label: "Tài khoản < 3 ngày", delta: -15 });
  }

  const approvedCount = approvedRes.count ?? 0;
  if (approvedCount >= 20) {
    score += 20;
    factors.push({
      key: "approved_20",
      label: "≥ 20 bài đã duyệt",
      delta: 20
    });
  } else if (approvedCount >= 5) {
    score += 10;
    factors.push({
      key: "approved_5",
      label: "≥ 5 bài đã duyệt",
      delta: 10
    });
  }

  const rejected30 = rejectedRes.count ?? 0;
  if (rejected30 > 0) {
    const penalty = rejected30 * -5;
    score += penalty;
    factors.push({
      key: "rejected_30d",
      label: `${rejected30} bài từ chối/30 ngày`,
      delta: penalty
    });
  }

  const activeStrikeCount = (strikesRes.data ?? []).length;
  if (activeStrikeCount > 0) {
    const penalty = activeStrikeCount * -20;
    score += penalty;
    factors.push({
      key: "strikes",
      label: `${activeStrikeCount} strike đang hoạt động`,
      delta: penalty
    });
  }

  const isVerifiedAuthor = Boolean(profile?.is_verified);
  if (isVerifiedAuthor) {
    score += 20;
    factors.push({
      key: "verified_author",
      label: "Tác giả xác thực (tick)",
      delta: 20
    });
  }

  const monetizationApproved =
    !monetizationRes.error && monetizationRes.data?.status === "approved";
  if (monetizationApproved) {
    score += 10;
    factors.push({
      key: "monetization",
      label: "Studio kiếm tiền đã duyệt",
      delta: 10
    });
  }

  const communityTrusted = Boolean(profile?.community_trusted);
  if (communityTrusted) {
    score += 10;
    factors.push({
      key: "community_trusted",
      label: "Đánh dấu tin cậy cộng đồng",
      delta: 10
    });
  }

  const hasViolation90d = (violationsRes.data ?? []).length > 0;
  if (!hasViolation90d && accountAgeDays >= 30) {
    score += 10;
    factors.push({
      key: "no_violation_90d",
      label: "Không vi phạm 90 ngày",
      delta: 10
    });
  }

  let validReportCount30d = 0;
  const { data: userPosts } = await supabase
    .from("community_posts")
    .select("id")
    .eq("user_id", userId)
    .limit(200);

  const postIds = (userPosts ?? []).map((p) => p.id as string);
  if (postIds.length) {
    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "community_post")
      .in("target_id", postIds)
      .in("status", ["resolved", "reviewing"])
      .gte("created_at", since30d);
    validReportCount30d = count ?? 0;
    if (validReportCount30d > 0) {
      const penalty = validReportCount30d * -5;
      score += penalty;
      factors.push({
        key: "reports_30d",
        label: `${validReportCount30d} báo cáo/30 ngày`,
        delta: penalty
      });
    }
  }

  const communityRestricted = Boolean(profile?.community_restricted);
  if (
    communityRestricted &&
    profile?.community_restricted_until &&
    new Date(profile.community_restricted_until) > new Date()
  ) {
    score -= 30;
    factors.push({
      key: "restricted",
      label: "Đang bị hạn chế đăng",
      delta: -30
    });
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    tier: tierFromScore(finalScore),
    factors,
    emailVerified,
    accountAgeDays,
    approvedPostCount: approvedCount,
    rejectedPostCount30d: rejected30,
    validReportCount30d,
    activeStrikeCount,
    isVerifiedAuthor,
    communityTrusted,
    communityRestricted,
    monetizationApproved
  };
}
