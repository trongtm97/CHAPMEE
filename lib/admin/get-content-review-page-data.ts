import { ADMIN_CREATOR_JOIN, resolveAdminCreatorName } from "@/lib/admin/creator-display";
import { startOfTodayIso } from "@/lib/admin/messaging-date-range";
import { queryWithReviewQueueStatuses } from "@/lib/admin/content-review-queue-statuses";
import { createClient } from "@/lib/supabase/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import type {
  ContentReviewPageData,
  ContentReviewQueueItem,
  ContentReviewSummary,
  RecentlyReviewedItem
} from "@/types/admin-content-review";

const CONTENT_AUDIT_ACTIONS = [
  "approve_content",
  "reject_content",
  "request_content_changes",
  "approve_story",
  "reject_story",
  "approve_episode",
  "reject_episode",
  "community_post_approve",
  "community_post_reject"
];

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

function actionLabel(action: string) {
  if (action.includes("approve")) return "Đã duyệt";
  if (action.includes("reject")) return "Từ chối";
  if (action.includes("request_content_changes")) return "Yêu cầu sửa";
  return action;
}

export async function getContentReviewPageData(): Promise<ContentReviewPageData> {
  const empty: ContentReviewPageData = {
    summary: {
      pendingStories: 0,
      pendingEpisodes: 0,
      pendingCommunityPosts: 0,
      reportedComments: 0,
      processedToday: 0,
      rejectedToday: 0
    },
    queue: [],
    recentlyReviewed: [],
    error: null
  };

  try {
    const supabase = await createClient();
    const todayStart = startOfTodayIso();

    const storiesRes = await queryWithReviewQueueStatuses(async (statuses) =>
      supabase
        .from("stories")
        .select(
          `id, title, slug, hook, short_description, cover_url, created_at, status, ${ADMIN_CREATOR_JOIN}`
        )
        .in("status", [...statuses])
        .order("created_at", { ascending: true })
        .limit(80)
    );

    const episodesRes = await queryWithReviewQueueStatuses(async (statuses) =>
      supabase
        .from("episodes")
        .select(
          `id, story_id, episode_number, title, excerpt, word_count, created_at, status, stories(title, slug, ${ADMIN_CREATOR_JOIN})`
        )
        .in("status", [...statuses])
        .order("created_at", { ascending: true })
        .limit(80)
    );

    const [
      communityRes,
      commentsRes,
      reportedCommentsRes,
      auditTodayRes,
      recentAuditRes
    ] = await Promise.all([
      supabase
        .from("community_posts")
        .select(
          "id, title, content, created_at, status, profiles!community_posts_user_id_fkey(display_name, username)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(40),
      supabase
        .from("comments")
        .select("id, body, created_at, status, profiles(display_name, username)")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(40),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("target_type", "comment")
        .in("status", ["open", "reviewing", "pending"]),
      supabase
        .from("admin_audit_logs")
        .select("id, action, created_at")
        .gte("created_at", todayStart)
        .in("action", CONTENT_AUDIT_ACTIONS),
      supabase
        .from("admin_audit_logs")
        .select("id, action, target_type, target_id, metadata, created_at, actor_id")
        .in("action", CONTENT_AUDIT_ACTIONS)
        .order("created_at", { ascending: false })
        .limit(15)
    ]);

    const storyIds = (storiesRes.data ?? []).map((s) => s.id as string);
    const episodeStoryIds = (episodesRes.data ?? [])
      .map((episode) => episode.story_id as string)
      .filter(Boolean);
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(supabase, [
      ...new Set([...storyIds, ...episodeStoryIds])
    ]);
    const episodeCounts = new Map<string, number>();
    const paidStoryIds = new Set<string>();

    if (storyIds.length) {
      const [epCountRes, paidRes] = await Promise.all([
        supabase.from("episodes").select("story_id").in("story_id", storyIds),
        supabase
          .from("chapter_monetization_settings")
          .select("story_id")
          .eq("is_paid", true)
      ]);

      for (const row of epCountRes.data ?? []) {
        const sid = row.story_id as string;
        episodeCounts.set(sid, (episodeCounts.get(sid) ?? 0) + 1);
      }

      for (const row of paidRes.data ?? []) {
        if (row.story_id) paidStoryIds.add(row.story_id as string);
      }
    }

    const queue: ContentReviewQueueItem[] = [];

    for (const story of storiesRes.data ?? []) {
      const creator = firstRelation(story.creator_profiles);
      const profile = firstRelation<{
        username: string | null;
        display_name: string | null;
      }>(
        (creator as { profiles?: unknown } | null)?.profiles ?? null
      );

      queue.push({
        id: story.id as string,
        type: "story",
        title: story.title as string,
        excerpt: (story.hook as string | null) ?? (story.short_description as string | null),
        status: story.status as string,
        creatorName: resolveAdminCreatorName(creator),
        creatorUsername: profile?.username ?? null,
        genreName: taxonomyByStory.get(story.id as string)?.mainGenreName ?? null,
        parentTitle: null,
        episodeNumber: null,
        storySlug: story.slug as string,
        storyId: story.id as string,
        createdAt: story.created_at as string,
        coverUrl: (story.cover_url as string | null) ?? null,
        wordCount: null,
        episodeCount: episodeCounts.get(story.id as string) ?? 0,
        hasMonetization: paidStoryIds.has(story.id as string),
        riskFlags: []
      });
    }

    for (const episode of episodesRes.data ?? []) {
      const story = firstRelation<{
        title: string | null;
        slug: string | null;
        creator_profiles: unknown;
      }>(episode.stories);
      const creator = firstRelation(story?.creator_profiles);
      const profile = firstRelation<{
        username: string | null;
        display_name: string | null;
      }>(
        (creator as { profiles?: unknown } | null)?.profiles ?? null
      );

      queue.push({
        id: episode.id as string,
        type: "episode",
        title: episode.title as string,
        excerpt: episode.excerpt as string | null,
        status: episode.status as string,
        creatorName: resolveAdminCreatorName(creator),
        creatorUsername: profile?.username ?? null,
        genreName: taxonomyByStory.get(episode.story_id as string)?.mainGenreName ?? null,
        parentTitle: story?.title ?? null,
        episodeNumber: episode.episode_number as number,
        storySlug: story?.slug ?? null,
        storyId: episode.story_id as string,
        createdAt: episode.created_at as string,
        coverUrl: null,
        wordCount: episode.word_count as number,
        episodeCount: null,
        hasMonetization: false,
        riskFlags: []
      });
    }

    for (const post of communityRes.data ?? []) {
      const profile = firstRelation<{
        display_name: string | null;
        username: string | null;
      }>(post.profiles);
      queue.push({
        id: post.id as string,
        type: "community_post",
        title: post.title as string,
        excerpt: (post.content as string).slice(0, 200),
        status: post.status as string,
        creatorName: profile?.display_name ?? null,
        creatorUsername: profile?.username ?? null,
        genreName: null,
        parentTitle: null,
        episodeNumber: null,
        storySlug: null,
        storyId: null,
        createdAt: post.created_at as string,
        coverUrl: null,
        wordCount: null,
        episodeCount: null,
        hasMonetization: false,
        riskFlags: []
      });
    }

    for (const comment of commentsRes.data ?? []) {
      const profile = firstRelation<{
        display_name: string | null;
        username: string | null;
      }>(comment.profiles);
      queue.push({
        id: comment.id as string,
        type: "comment",
        title: (comment.body as string).slice(0, 80) || "Bình luận",
        excerpt: comment.body as string,
        status: comment.status as string,
        creatorName: profile?.display_name ?? null,
        creatorUsername: profile?.username ?? null,
        genreName: null,
        parentTitle: null,
        episodeNumber: null,
        storySlug: null,
        storyId: null,
        createdAt: comment.created_at as string,
        coverUrl: null,
        wordCount: null,
        episodeCount: null,
        hasMonetization: false,
        riskFlags: []
      });
    }

    queue.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const auditToday = auditTodayRes.data ?? [];
    const processedToday = auditToday.length;
    const rejectedToday = auditToday.filter((r) =>
      String(r.action).includes("reject")
    ).length;

    const summary: ContentReviewSummary = {
      pendingStories: queue.filter((q) => q.type === "story" && q.status === "pending")
        .length,
      pendingEpisodes: queue.filter((q) => q.type === "episode").length,
      pendingCommunityPosts: queue.filter((q) => q.type === "community_post").length,
      reportedComments: reportedCommentsRes.count ?? 0,
      processedToday,
      rejectedToday
    };

    const actorIds = [
      ...new Set(
        (recentAuditRes.data ?? [])
          .map((r) => r.actor_id as string | null)
          .filter(Boolean)
      )
    ] as string[];

    const actorNames = new Map<string, string>();
    if (actorIds.length) {
      const { data: actors } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", actorIds);
      for (const a of actors ?? []) {
        actorNames.set(
          a.id as string,
          (a.display_name as string) ?? (a.username as string) ?? "Admin"
        );
      }
    }

    const recentlyReviewed: RecentlyReviewedItem[] = await Promise.all(
      (recentAuditRes.data ?? []).map(async (row) => {
        const meta = (row.metadata as Record<string, unknown>) ?? {};
        const targetType = (row.target_type as string) ?? "content";
        const targetId = (row.target_id as string) ?? "";
        let title = targetId.slice(0, 8);

        if (targetType === "story") {
          const { data } = await supabase
            .from("stories")
            .select("title")
            .eq("id", targetId)
            .maybeSingle();
          title = (data?.title as string) ?? title;
        } else if (targetType === "episode") {
          const { data } = await supabase
            .from("episodes")
            .select("title")
            .eq("id", targetId)
            .maybeSingle();
          title = (data?.title as string) ?? title;
        }

        return {
          id: row.id as string,
          targetType,
          targetId,
          title,
          action: row.action as string,
          actionLabel: actionLabel(row.action as string),
          moderatorName: row.actor_id
            ? (actorNames.get(row.actor_id as string) ?? null)
            : null,
          createdAt: row.created_at as string,
          reasonCode: (meta.reason_code as string) ?? null,
          note: (meta.moderator_note as string) ?? null
        };
      })
    );

    return {
      summary,
      queue,
      recentlyReviewed,
      error:
        storiesRes.error?.message ??
        episodesRes.error?.message ??
        communityRes.error?.message ??
        null
    };
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof Error ? error.message : "Không thể tải hàng đợi kiểm duyệt."
    };
  }
}
