import {
  ADMIN_CREATOR_JOIN,
  resolveAdminCreatorName,
  resolveAdminStudioName
} from "@/lib/admin/creator-display";
import { startOfTodayIso } from "@/lib/admin/messaging-date-range";
import {
  COMMUNITY_AUDIT_ACTIONS,
  communityAuditActionLabel,
  DEFAULT_COMMUNITY_SPAM_SETTINGS
} from "@/lib/admin/community-admin-labels";
import { AUTO_DECISION_LABELS } from "@/lib/community/auto-moderation-labels";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type {
  CommunityAdminPageData,
  CommunityAdminPermissions,
  CommunityAuthorGroupItem,
  CommunityChallengeItem,
  CommunityCommentItem,
  CommunityPollItem,
  CommunityQueueItem,
  CommunityRecentlyHandledItem,
  CommunitySpamSettings,
  CommunityStoryGroupItem
} from "@/types/community-admin";
import type { PermissionCode } from "@/types/permissions";

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

function buildPermissions(permissions: PermissionCode[]): CommunityAdminPermissions {
  const canModeratePosts = permissions.includes("community.post.moderate");
  const canModerateGroups = permissions.includes("community.group.moderate");
  const canManageSpamSettings = permissions.includes("admin.settings.update");
  return {
    canView: true,
    canModeratePosts,
    canModerateGroups,
    canManageSpamSettings
  };
}

function parseSpamSettings(value: unknown): CommunitySpamSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_COMMUNITY_SPAM_SETTINGS };
  }
  const v = value as Record<string, unknown>;
  return {
    maxPostsPerDayNewUser:
      typeof v.maxPostsPerDayNewUser === "number"
        ? v.maxPostsPerDayNewUser
        : DEFAULT_COMMUNITY_SPAM_SETTINGS.maxPostsPerDayNewUser,
    maxCommentsPerHour:
      typeof v.maxCommentsPerHour === "number"
        ? v.maxCommentsPerHour
        : DEFAULT_COMMUNITY_SPAM_SETTINGS.maxCommentsPerHour,
    preModerateExternalLinks:
      typeof v.preModerateExternalLinks === "boolean"
        ? v.preModerateExternalLinks
        : DEFAULT_COMMUNITY_SPAM_SETTINGS.preModerateExternalLinks,
    preModerateNewUsers:
      typeof v.preModerateNewUsers === "boolean"
        ? v.preModerateNewUsers
        : DEFAULT_COMMUNITY_SPAM_SETTINGS.preModerateNewUsers,
    blockedKeywords: Array.isArray(v.blockedKeywords)
      ? (v.blockedKeywords as string[])
      : [],
    reviewKeywords: Array.isArray(v.reviewKeywords)
      ? (v.reviewKeywords as string[])
      : [],
    reportQueueThreshold:
      typeof v.reportQueueThreshold === "number"
        ? v.reportQueueThreshold
        : DEFAULT_COMMUNITY_SPAM_SETTINGS.reportQueueThreshold,
    autoHideReportThreshold:
      typeof v.autoHideReportThreshold === "number"
        ? v.autoHideReportThreshold
        : DEFAULT_COMMUNITY_SPAM_SETTINGS.autoHideReportThreshold
  };
}

async function countReportsByTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetIds: string[]
) {
  const map = new Map<string, number>();
  if (!targetIds.length) return map;

  const { data } = await supabase
    .from("reports")
    .select("target_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds)
    .in("status", ["open", "reviewing", "pending"]);

  for (const row of data ?? []) {
    const id = row.target_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function getCommunityAdminPageData(
  permissions: PermissionCode[]
): Promise<CommunityAdminPageData> {
  const empty: CommunityAdminPageData = {
    summary: {
      pendingPosts: 0,
      reportedComments: 0,
      activePolls: 0,
      activeChallenges: 0,
      hotStoryGroups: 0,
      reportedPosts: 0,
      hiddenToday: 0,
      processedToday: 0
    },
    queue: [],
    comments: [],
    polls: [],
    challenges: [],
    storyGroups: [],
    authorGroups: [],
    recentlyHandled: [],
    spamSettings: { ...DEFAULT_COMMUNITY_SPAM_SETTINGS },
    permissions: buildPermissions(permissions),
    error: null
  };

  try {
    const supabase = await createClient();
    const todayStart = startOfTodayIso();

    const postSelectFull =
      `id, type, title, content, created_at, status, report_count, risk_level, is_pinned, is_featured, comments_locked, auto_decision, auto_decision_reason_codes, story_id, creator_id, episode_id, user_id, profiles!community_posts_user_id_fkey(display_name, username, role), stories(title, slug), ${ADMIN_CREATOR_JOIN}, episodes(episode_number, title)`;
    const postSelectMinimal =
      `id, type, title, content, created_at, status, auto_decision, auto_decision_reason_codes, story_id, creator_id, user_id, profiles!community_posts_user_id_fkey(display_name, username, role), stories(title, slug), ${ADMIN_CREATOR_JOIN}`;

    const [
      pendingRes,
      queueRes,
      reportedCommentsRes,
      pollPostsRes,
      challengePostsRes,
      pollsTableRes,
      challengesTableRes,
      hiddenTodayRes,
      auditTodayRes,
      recentAuditRes,
      spamSettingRes,
      storiesRes,
      creatorsRes,
      groupSettingsRes
    ] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("community_posts")
        .select(postSelectFull)
        .in("status", ["pending", "approved", "hidden", "rejected"])
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("target_type", "comment")
        .in("status", ["open", "reviewing", "pending"]),
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("type", "poll_placeholder")
        .eq("status", "approved"),
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("type", "challenge")
        .in("status", ["pending", "approved"]),
      supabase
        .from("polls")
        .select("id, question, status, created_at, stories(title)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("creator_challenges")
        .select("id, title, status, created_at")
        .in("status", ["active", "draft"])
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "hidden")
        .gte("hidden_at", todayStart),
      supabase
        .from("admin_audit_logs")
        .select("id")
        .gte("created_at", todayStart)
        .in("action", [...COMMUNITY_AUDIT_ACTIONS]),
      supabase
        .from("admin_audit_logs")
        .select("id, action, target_type, target_id, metadata, created_at, actor_id")
        .in("action", [...COMMUNITY_AUDIT_ACTIONS])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "community_spam_settings")
        .maybeSingle(),
      supabase
        .from("stories")
        .select(`id, title, slug, ${ADMIN_CREATOR_JOIN}`)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(30),
      supabase
        .from("creator_profiles")
        .select(
          "id, user_id, profiles!creator_profiles_user_id_fkey(display_name, username, is_verified)"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("community_group_settings").select("*").limit(100)
    ]);

    const schemaSoftFail = (err: { message?: string; code?: string } | null) =>
      err && isMissingSchemaError(err);

    type PostRow = Record<string, unknown>;
    let queueRows: PostRow[] = (queueRes.data ?? []) as PostRow[];
    if (queueRes.error) {
      if (!schemaSoftFail(queueRes.error)) {
        throw new Error(queueRes.error.message);
      }
      const fallback = await supabase
        .from("community_posts")
        .select(postSelectMinimal)
        .in("status", ["pending", "approved", "hidden", "rejected"])
        .order("created_at", { ascending: false })
        .limit(80);
      if (fallback.error) throw new Error(fallback.error.message);
      queueRows = (fallback.data ?? []) as PostRow[];
    }

    const postIds = (queueRows ?? []).map((p) => p.id as string);
    const commentCounts = new Map<string, number>();

    if (postIds.length) {
      const { data: commentRows } = await supabase
        .from("comments")
        .select("community_post_id")
        .in("community_post_id", postIds);

      for (const row of commentRows ?? []) {
        const pid = row.community_post_id as string;
        if (pid) commentCounts.set(pid, (commentCounts.get(pid) ?? 0) + 1);
      }
    }

    const postReportCounts = await countReportsByTarget(
      supabase,
      "community_post",
      postIds
    );

    const decisionByPost = new Map<
      string,
      {
        trust_score: number | null;
        matched_rules: Array<{ rule: string; detail?: string }>;
      }
    >();

    if (postIds.length) {
      const { data: decisions } = await supabase
        .from("community_moderation_decisions")
        .select("post_id, trust_score, matched_rules")
        .in("post_id", postIds)
        .order("created_at", { ascending: false });

      for (const d of decisions ?? []) {
        const pid = d.post_id as string;
        if (pid && !decisionByPost.has(pid)) {
          decisionByPost.set(pid, {
            trust_score: d.trust_score != null ? Number(d.trust_score) : null,
            matched_rules: (d.matched_rules as Array<{ rule: string; detail?: string }>) ?? []
          });
        }
      }
    }

    const queue: CommunityQueueItem[] = queueRows.map((post) => {
      const profile = firstRelation<{
        display_name: string | null;
        username: string | null;
        role: string | null;
      }>(post.profiles);
      const story = firstRelation<{ title: string | null; slug: string | null }>(
        post.stories
      );
      const studio = firstRelation(post.creator_profiles);
      const episode = firstRelation<{ episode_number: number | null; title: string | null }>(
        post.episodes
      );

      let authorRole: CommunityQueueItem["authorRole"] = "reader";
      if (profile?.role === "admin" || profile?.role === "moderator") {
        authorRole = "admin";
      } else if (post.creator_id) {
        authorRole = "studio";
      }

      const reportCount =
        (post.report_count as number | undefined) ??
        postReportCounts.get(post.id as string) ??
        0;

      const autoDecision = (post.auto_decision as string) ?? null;
      const decisionMeta = decisionByPost.get(post.id as string);
      const reasonCodes = (post.auto_decision_reason_codes as string[]) ?? [];

      return {
        id: post.id as string,
        type: post.type as CommunityQueueItem["type"],
        title: post.title as string,
        excerpt: (post.content as string).slice(0, 160),
        authorName: profile?.display_name ?? null,
        authorUsername: profile?.username ?? null,
        authorRole,
        authorUserId: (post.user_id as string) ?? null,
        storyTitle: story?.title ?? null,
        storySlug: story?.slug ?? null,
        episodeLabel: episode
          ? `Chương ${episode.episode_number ?? ""}${episode.title ? `: ${episode.title}` : ""}`
          : null,
        studioName: resolveAdminStudioName(studio),
        commentCount: commentCounts.get(post.id as string) ?? 0,
        reportCount,
        status: post.status as CommunityQueueItem["status"],
        riskLevel: (post.risk_level as CommunityQueueItem["riskLevel"]) ?? "low",
        createdAt: post.created_at as string,
        isPinned: Boolean(post.is_pinned),
        isFeatured: Boolean(post.is_featured),
        commentsLocked: Boolean(post.comments_locked),
        autoDecision,
        autoDecisionLabel: autoDecision
          ? (AUTO_DECISION_LABELS[autoDecision as keyof typeof AUTO_DECISION_LABELS] ??
            autoDecision)
          : null,
        trustScore: decisionMeta?.trust_score ?? null,
        autoReasonCodes: reasonCodes,
        matchedRules: decisionMeta?.matched_rules ?? []
      };
    });

    const { data: commentRows } = await supabase
      .from("comments")
      .select(
        "id, content, created_at, status, community_post_id, profiles(display_name, username), community_posts(title, stories(title))"
      )
      .not("community_post_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);

    const commentIds = (commentRows ?? []).map((c) => c.id as string);
    const commentReports = await countReportsByTarget(supabase, "comment", commentIds);

    const comments: CommunityCommentItem[] = (commentRows ?? []).map((row) => {
      const profile = firstRelation<{
        display_name: string | null;
        username: string | null;
      }>(row.profiles);
      const post = firstRelation<{
        title: string | null;
        stories: { title: string | null } | null;
      }>(row.community_posts);
      const story = firstRelation<{ title: string | null }>(post?.stories);

      return {
        id: row.id as string,
        body: row.content as string,
        authorName: profile?.display_name ?? null,
        authorUsername: profile?.username ?? null,
        postTitle: post?.title ?? null,
        storyTitle: story?.title ?? null,
        reportCount: commentReports.get(row.id as string) ?? 0,
        status: row.status as string,
        createdAt: row.created_at as string
      };
    });

    const polls: CommunityPollItem[] = [];
    for (const post of queue.filter((p) => p.type === "poll_placeholder")) {
      polls.push({
        id: post.id,
        title: post.title,
        storyTitle: post.storyTitle,
        status: post.status,
        reportCount: post.reportCount,
        createdAt: post.createdAt,
        source: "community_post"
      });
    }
    for (const poll of pollsTableRes.data ?? []) {
      const story = firstRelation<{ title: string | null }>(poll.stories);
      polls.push({
        id: poll.id as string,
        title: (poll.question as string) ?? "Poll",
        storyTitle: story?.title ?? null,
        status: poll.status as string,
        reportCount: 0,
        createdAt: poll.created_at as string,
        source: "polls_table"
      });
    }

    const challenges: CommunityChallengeItem[] = [];
    for (const post of queue.filter((p) => p.type === "challenge")) {
      challenges.push({
        id: post.id,
        title: post.title,
        storyTitle: post.storyTitle,
        status: post.status,
        reportCount: post.reportCount,
        createdAt: post.createdAt,
        source: "community_post"
      });
    }
    for (const ch of challengesTableRes.data ?? []) {
      challenges.push({
        id: ch.id as string,
        title: ch.title as string,
        storyTitle: null,
        status: ch.status as string,
        reportCount: 0,
        createdAt: ch.created_at as string,
        source: "creator_challenge"
      });
    }

    const storyIds = (storiesRes.data ?? []).map((s) => s.id as string);
    const posts24h = new Map<string, number>();
    if (storyIds.length) {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { data: recentPosts } = await supabase
        .from("community_posts")
        .select("story_id")
        .in("story_id", storyIds)
        .gte("created_at", since);

      for (const row of recentPosts ?? []) {
        const sid = row.story_id as string;
        if (sid) posts24h.set(sid, (posts24h.get(sid) ?? 0) + 1);
      }
    }

    const storySettingsById = new Map<
      string,
      {
        status: string;
        posting_locked: boolean;
        hidden_from_recommendation: boolean;
      }
    >();
    const authorSettingsById = new Map<
      string,
      { status: string; posting_locked: boolean }
    >();

    for (const row of groupSettingsRes.data ?? []) {
      if (row.group_type === "story") {
        storySettingsById.set(row.group_id as string, {
          status: row.status as string,
          posting_locked: Boolean(row.posting_locked),
          hidden_from_recommendation: Boolean(row.hidden_from_recommendation)
        });
      }
      if (row.group_type === "author") {
        authorSettingsById.set(row.group_id as string, {
          status: row.status as string,
          posting_locked: Boolean(row.posting_locked)
        });
      }
    }

    const storyGroups: CommunityStoryGroupItem[] = (storiesRes.data ?? []).map(
      (story) => {
        const studio = firstRelation(story.creator_profiles);
        const settings = storySettingsById.get(story.id as string);
        const postsLast24h = posts24h.get(story.id as string) ?? 0;

        return {
          storyId: story.id as string,
          storyTitle: story.title as string,
          storySlug: story.slug as string,
          studioName: resolveAdminStudioName(studio),
          memberCount: 0,
          postsLast24h,
          reportCount: 0,
          status: settings?.status ?? "active",
          postingLocked: settings?.posting_locked ?? false,
          hiddenFromRecommendation: settings?.hidden_from_recommendation ?? false
        };
      }
    );

    const authorGroups: CommunityAuthorGroupItem[] = (creatorsRes.data ?? []).map(
      (creator) => {
        const settings = authorSettingsById.get(creator.id as string);
        const profile = firstRelation<{ is_verified: boolean | null }>(
          creator.profiles
        );

        return {
          creatorId: creator.id as string,
          studioName: resolveAdminCreatorName(creator) ?? "",
          followerCount: 0,
          postCount: 0,
          reportCount: 0,
          status: settings?.status ?? "active",
          isVerified: Boolean(profile?.is_verified),
          postingLocked: settings?.posting_locked ?? false
        };
      }
    );

    const reportedPosts = queue.filter((p) => p.reportCount > 0).length;
    const hotStoryGroups = storyGroups.filter((g) => g.postsLast24h >= 3).length;

    let hiddenToday = hiddenTodayRes.count ?? 0;
    if (hiddenTodayRes.error && schemaSoftFail(hiddenTodayRes.error)) {
      hiddenToday = queue.filter(
        (p) =>
          p.status === "hidden" &&
          new Date(p.createdAt).getTime() >= new Date(todayStart).getTime()
      ).length;
    }

    const actorIds = [
      ...new Set(
        (recentAuditRes.data ?? [])
          .map((row) => row.actor_id as string | undefined)
          .filter(Boolean)
      )
    ] as string[];

    const actorNameById = new Map<string, string>();
    if (actorIds.length) {
      const { data: actors } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", actorIds);
      for (const actor of actors ?? []) {
        actorNameById.set(
          actor.id as string,
          (actor.display_name as string) ??
            (actor.username as string) ??
            "Moderator"
        );
      }
    }

    const recentlyHandled: CommunityRecentlyHandledItem[] = (
      recentAuditRes.data ?? []
    ).map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;

      return {
        id: row.id as string,
        targetLabel: (meta.title as string) ?? `${row.target_type ?? ""} ${row.target_id ?? ""}`,
        actionLabel: communityAuditActionLabel(row.action as string),
        moderatorName: row.actor_id
          ? (actorNameById.get(row.actor_id as string) ?? null)
          : null,
        reasonCode: (meta.reason_code as string) ?? null,
        note: (meta.note as string) ?? null,
        createdAt: row.created_at as string
      };
    });

    return {
      ...empty,
      summary: {
        pendingPosts: pendingRes.count ?? 0,
        reportedComments: reportedCommentsRes.count ?? 0,
        activePolls: (pollPostsRes.count ?? 0) + (pollsTableRes.data?.length ?? 0),
        activeChallenges:
          (challengePostsRes.count ?? 0) + (challengesTableRes.data?.length ?? 0),
        hotStoryGroups,
        reportedPosts,
        hiddenToday,
        processedToday: auditTodayRes.data?.length ?? 0
      },
      queue,
      comments,
      polls,
      challenges,
      storyGroups,
      authorGroups,
      recentlyHandled,
      spamSettings: parseSpamSettings(spamSettingRes.data?.value)
    };
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof Error
          ? error.message
          : "Không tải được dữ liệu cộng đồng."
    };
  }
}
