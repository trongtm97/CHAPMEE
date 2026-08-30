import { startOfTodayIso } from "@/lib/admin/messaging-date-range";
import {
  buildQualitySummary,
  deriveRiskLevel,
  matchesQualityTab
} from "@/lib/admin/content-quality-tabs";
import { getQualityConfigForAdmin } from "@/lib/admin/update-quality-config";
import { resolveAdminCreatorName } from "@/lib/admin/creator-display";
import { createClient } from "@/lib/data/server";
import { validateStoryStructureConsistency } from "@/lib/publish/validate-story-for-publish";
import { mapStoryStructureFromRow, normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import type {
  AdminContentQualityPageData,
  AdminContentQualityQueueItem,
  AdminContentQualityRecentlyHandled,
  AdminContentQualityTab
} from "@/types/admin";
import type { ContentQualityReasonCode } from "@/types/content-quality";

const QUALITY_AUDIT_ACTIONS = [
  "quality_status_change",
  "permanent_hide",
  "monetization_disable",
  "review_appeal",
  "update_app_settings",
  "send_to_quality_review",
  "quality_content_set_free",
  "quality_content_paid_restored",
  "quality_refund_preview_created",
  "quality_coin_refund_confirmed",
  "quality_creator_revenue_reversed"
];

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

export async function getContentQualityPageData(
  tab: AdminContentQualityTab = "pending_review"
): Promise<AdminContentQualityPageData> {
  const empty: AdminContentQualityPageData = {
    items: [],
    allItems: [],
    counts: {
      pending_review: 0,
      waiting_author: 0,
      appealing: 0,
      at_risk: 0,
      restored: 0,
      permanently_hidden: 0,
      all: 0
    },
    summary: {
      pendingReview: 0,
      waitingAuthor: 0,
      appealing: 0,
      atRisk: 0,
      restored: 0,
      permanentlyHidden: 0,
      monetizationDisabled: 0,
      processedToday: 0
    },
    recentlyHandled: [],
    maxAttempts: 3,
    canModerate: false,
    canRefund: false,
    canManageMonetization: false,
    error: null
  };

  try {
    const db = await createClient();
    const config = await getQualityConfigForAdmin();
    const maxAttempts = config.maxLowQualityAttempts ?? 3;

    const { data: userData } = await db.auth.getUser();
    let canModerate = false;
    let canRefund = false;
    let canManageMonetization = false;
    if (userData.user?.id) {
      const uid = userData.user.id;
      const [{ data: modPerm }, { data: refundPerm }] = await Promise.all([
        db.rpc("user_has_permission", {
          input_user_id: uid,
          permission_code: "moderation.action.create"
        }),
        db.rpc("user_has_permission", {
          input_user_id: uid,
          permission_code: "finance.refund.create"
        })
      ]);
      canModerate = Boolean(modPerm);
      canRefund = Boolean(refundPerm);
      canManageMonetization = canModerate || canRefund;
    }

    const { data: stories, error } = await db
      .from("stories")
      .select(
        `
        id,
        title,
        slug,
        public_code,
        creator_id,
        quality_status,
        low_quality_attempt_count,
        monetization_disabled_by_quality,
        quality_updated_at,
        updated_at,
        structure_type,
        standalone_content_json,
        standalone_plain_text,
        creator_profiles (
          user_id,
          profiles!creator_profiles_user_id_fkey(display_name, username)
        )
      `
      )
      .neq("quality_status", "good")
      .order("quality_updated_at", { ascending: false, nullsFirst: false })
      .limit(300);

    if (error) {
      return { ...empty, error: "Không tải được hàng đợi. Vui lòng thử lại." };
    }

    const storyIds = (stories ?? []).map((s) => s.id as string);
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

    const [{ data: appeals }, { data: latestReviews }] = await Promise.all([
      storyIds.length
        ? db
            .from("content_quality_appeals")
            .select("story_id, status")
            .in("story_id", storyIds)
        : Promise.resolve({ data: [] }),
      storyIds.length
        ? db
            .from("content_quality_reviews")
            .select("story_id, reason_codes, created_at")
            .in("story_id", storyIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] })
    ]);

    const appealByStory = new Map(
      (appeals ?? []).map((a) => [a.story_id as string, a.status as string])
    );

    const reasonsByStory = new Map<string, ContentQualityReasonCode[]>();
    for (const review of latestReviews ?? []) {
      const sid = review.story_id as string;
      if (!reasonsByStory.has(sid)) {
        reasonsByStory.set(sid, (review.reason_codes as ContentQualityReasonCode[]) ?? []);
      }
    }

    const episodeCountByStory = new Map<string, number>();
    if (storyIds.length > 0) {
      const { data: episodeRows } = await db
        .from("episodes")
        .select("story_id")
        .in("story_id", storyIds)
        .neq("status", "archived");

      for (const episode of episodeRows ?? []) {
        const sid = episode.story_id as string;
        episodeCountByStory.set(sid, (episodeCountByStory.get(sid) ?? 0) + 1);
      }
    }

    const allItems: AdminContentQualityQueueItem[] = (stories ?? []).map((row) => {
      const creator = firstRelation<{
        user_id: string;
        profiles?: { display_name: string | null; username: string | null } | null;
      }>(row.creator_profiles);
      const genreName = taxonomyByStory.get(row.id as string)?.mainGenreName ?? null;
      const appealRaw = appealByStory.get(row.id as string);
      const appealStatus =
        appealRaw === "pending"
          ? "pending"
          : appealRaw === "approved"
            ? "approved"
            : appealRaw === "rejected"
              ? "rejected"
              : "none";
      const attemptCount = Number(row.low_quality_attempt_count ?? 0);
      const qualityStatus = row.quality_status as AdminContentQualityQueueItem["qualityStatus"];
      const structure = mapStoryStructureFromRow(row as {
        structure_type?: string | null;
        standalone_content_json?: unknown | null;
        standalone_plain_text?: string | null;
      });
      const episodeCount = episodeCountByStory.get(row.id as string) ?? 0;
      const structureWarnings = validateStoryStructureConsistency({
        structureType: structure.structureType,
        episodeCount,
        hasStandaloneContent: Boolean(
          structure.standalonePlainText?.trim() || structure.standaloneContentJson
        )
      });

      return {
        storyId: row.id as string,
        title: row.title as string,
        slug: (row.slug as string | null) ?? null,
        publicCode: (row.public_code as string | null) ?? null,
        structureType: normalizeStoryStructureType(
          (row as { structure_type?: string }).structure_type
        ),
        structureWarnings,
        authorDisplayName: resolveAdminCreatorName(creator) ?? "Tác giả",
        authorUserId: creator?.user_id ?? "",
        creatorId: row.creator_id as string,
        qualityStatus,
        attemptCount,
        maxAttempts,
        reasonCodes: reasonsByStory.get(row.id as string) ?? [],
        warnedAt:
          (row.quality_updated_at as string | null) ??
          (row.updated_at as string | null),
        appealStatus,
        monetizationDisabled: Boolean(row.monetization_disabled_by_quality),
        riskLevel: deriveRiskLevel(attemptCount, qualityStatus),
        genreName,
        targetType: "story"
      };
    });

    const counts = {
      pending_review: 0,
      waiting_author: 0,
      appealing: 0,
      at_risk: 0,
      restored: 0,
      permanently_hidden: 0,
      all: 0
    } as Record<AdminContentQualityTab, number>;

    for (const item of allItems) {
      for (const key of Object.keys(counts) as AdminContentQualityTab[]) {
        if (matchesQualityTab(key, item)) counts[key] += 1;
      }
    }

    const summary = buildQualitySummary(allItems);
    const todayStart = startOfTodayIso();

    const { data: auditToday } = await db
      .from("admin_audit_logs")
      .select("id")
      .gte("created_at", todayStart)
      .in("action", QUALITY_AUDIT_ACTIONS);

    summary.processedToday = auditToday?.length ?? 0;

    const { data: recentAudit } = await db
      .from("admin_audit_logs")
      .select("id, action, target_id, metadata, created_at, actor_id")
      .in("action", QUALITY_AUDIT_ACTIONS)
      .order("created_at", { ascending: false })
      .limit(10);

    const actorIds = [
      ...new Set((recentAudit ?? []).map((r) => r.actor_id as string).filter(Boolean))
    ];
    const actorNames = new Map<string, string>();
    if (actorIds.length) {
      const { data: actors } = await db
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

    const titleByStory = new Map(allItems.map((i) => [i.storyId, i.title]));

    const recentlyHandled: AdminContentQualityRecentlyHandled[] = (recentAudit ?? []).map(
      (row) => {
        const action = row.action as string;
        let actionLabel = "Đã xử lý";
        if (action.includes("permanent_hide")) actionLabel = "Ẩn vĩnh viễn";
        if (action.includes("quality_status_change")) actionLabel = "Cập nhật trạng thái";
        if (action.includes("monetization_disable")) actionLabel = "Tắt kiếm tiền";
        if (action.includes("quality_content_set_free")) actionLabel = "Mở miễn phí";
        if (action.includes("quality_coin_refund")) actionLabel = "Hoàn coin";
        if (action.includes("review_appeal")) actionLabel = "Xử lý khiếu nại";

        const storyId = row.target_id as string;
        return {
          id: row.id as string,
          title: titleByStory.get(storyId) ?? storyId.slice(0, 8),
          actionLabel,
          moderatorName: row.actor_id
            ? (actorNames.get(row.actor_id as string) ?? null)
            : null,
          createdAt: row.created_at as string
        };
      }
    );

    return {
      items: allItems.filter((item) => matchesQualityTab(tab, item)),
      allItems,
      counts,
      summary,
      recentlyHandled,
      maxAttempts,
      canModerate,
      canRefund,
      canManageMonetization,
      error: null
    };
  } catch {
    return { ...empty, error: "Không tải được hàng đợi. Vui lòng thử lại." };
  }
}

/** @deprecated */
export async function getContentQualityQueue(tab: AdminContentQualityTab = "pending_review") {
  return getContentQualityPageData(tab);
}
