"use server";

import { DEFAULT_COMMUNITY_SPAM_SETTINGS } from "@/lib/admin/community-admin-labels";
import { calculateUserTrustScore } from "@/lib/community/calculate-user-trust-score";
import { createClient } from "@/lib/supabase/server";
import type { CommunityPostDetail, CommunityQueueItem } from "@/types/community-admin";

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

function hasExternalLink(text: string) {
  return /https?:\/\//i.test(text) || /\bwww\./i.test(text);
}

function matchBlockedKeywords(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((k) => k.trim() && lower.includes(k.trim().toLowerCase()));
}

export async function getCommunityPostDetail(
  postId: string
): Promise<{ detail: CommunityPostDetail | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data: post, error } = await supabase
      .from("community_posts")
      .select(
        "id, type, title, content, created_at, status, report_count, risk_level, is_pinned, is_featured, comments_locked, auto_decision, auto_decision_reason_codes, story_id, creator_id, user_id, profiles!community_posts_user_id_fkey(display_name, username, role, created_at), stories(title, slug), creator_profiles(pen_name), episodes(episode_number, title)"
      )
      .eq("id", postId)
      .maybeSingle();

    if (error || !post) {
      return { detail: null, error: error?.message ?? "Không tìm thấy bài viết." };
    }

    const profile = firstRelation<{
      display_name: string | null;
      username: string | null;
      role: string | null;
      created_at: string;
    }>(post.profiles);
    const story = firstRelation<{ title: string | null; slug: string | null }>(post.stories);
    const studio = firstRelation<{ pen_name: string | null }>(post.creator_profiles);
    const episode = firstRelation<{ episode_number: number | null; title: string | null }>(
      post.episodes
    );

    let authorRole: CommunityQueueItem["authorRole"] = "reader";
    if (profile?.role === "admin" || profile?.role === "moderator") {
      authorRole = "admin";
    } else if (post.creator_id) {
      authorRole = "studio";
    }

    const [
      { count: commentCount },
      { data: comments },
      { count: reportCount },
      { data: spamRow },
      { data: decisionRow }
    ] = await Promise.all([
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("community_post_id", postId),
        supabase
          .from("comments")
          .select("id, content, profiles(display_name, username)")
          .eq("community_post_id", postId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("target_type", "community_post")
          .eq("target_id", postId),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "community_spam_settings")
          .maybeSingle(),
        supabase
          .from("community_moderation_decisions")
          .select("trust_score, matched_rules, reason_codes, decision")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

    const trust = await calculateUserTrustScore(post.user_id as string);

    const spamValue = (spamRow?.value ?? {}) as Record<string, unknown>;
    const blockedKeywords = Array.isArray(spamValue.blockedKeywords)
      ? (spamValue.blockedKeywords as string[])
      : DEFAULT_COMMUNITY_SPAM_SETTINGS.blockedKeywords;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: postsToday } = await supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", post.user_id as string)
      .gte("created_at", todayStart.toISOString());

    const accountCreated = profile?.created_at
      ? Math.floor(
          (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
        )
      : null;

    const content = post.content as string;
    const publicUrl = story?.slug ? `/community?post=${post.id}` : null;

    const item: CommunityQueueItem = {
      id: post.id as string,
      type: post.type as CommunityQueueItem["type"],
      title: post.title as string,
      excerpt: content.slice(0, 160),
      authorName: profile?.display_name ?? null,
      authorUsername: profile?.username ?? null,
      authorRole,
      authorUserId: post.user_id as string,
      storyTitle: story?.title ?? null,
      storySlug: story?.slug ?? null,
      episodeLabel: episode
        ? `Chương ${episode.episode_number ?? ""}${episode.title ? `: ${episode.title}` : ""}`
        : null,
      studioName: studio?.pen_name ?? null,
      commentCount: commentCount ?? 0,
      reportCount: (post.report_count as number) ?? reportCount ?? 0,
      status: post.status as CommunityQueueItem["status"],
      riskLevel: (post.risk_level as CommunityQueueItem["riskLevel"]) ?? "low",
      createdAt: post.created_at as string,
      isPinned: Boolean(post.is_pinned),
      isFeatured: Boolean(post.is_featured),
      commentsLocked: Boolean(post.comments_locked),
      autoDecision: null,
      autoDecisionLabel: null,
      trustScore: null,
      autoReasonCodes: [],
      matchedRules: []
    };

    const previewComments = (comments ?? []).map((c) => {
      const p = firstRelation<{ display_name: string | null; username: string | null }>(
        c.profiles
      );
      return {
        id: c.id as string,
        body: c.content as string,
        authorName: p?.display_name ?? p?.username ?? null,
        reportCount: 0
      };
    });

    return {
      detail: {
        item,
        content,
        publicUrl,
        likeCount: 0,
        trust,
        autoDecision: (post.auto_decision as string) ?? decisionRow?.decision ?? null,
        autoReasonCodes:
          (post.auto_decision_reason_codes as string[]) ??
          (decisionRow?.reason_codes as string[]) ??
          [],
        matchedRules:
          (decisionRow?.matched_rules as Array<{ rule: string; detail?: string }>) ??
          [],
        riskSignals: {
          accountAgeDays: accountCreated,
          postsToday: postsToday ?? 0,
          priorReports: reportCount ?? 0,
          hasBlockedKeywords: matchBlockedKeywords(content, blockedKeywords),
          hasExternalLink: hasExternalLink(content),
          possibleDuplicate: false
        },
        previewComments
      },
      error: null
    };
  } catch (e) {
    return {
      detail: null,
      error: e instanceof Error ? e.message : "Không tải được chi tiết."
    };
  }
}
