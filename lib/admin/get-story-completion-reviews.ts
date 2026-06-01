"use server";

import { ADMIN_CREATOR_JOIN, resolveAdminCreatorName } from "@/lib/admin/creator-display";
import { createClient } from "@/lib/supabase/server";
import { sumLockedFullStoryRevenueForStory } from "@/lib/monetization/story-completion-escrow";
import type {
  AdminStoryCompletionReviewRow,
  StoryAdminCompletionStatus,
  StoryCompletionReviewFilterStatus,
  StoryCompletionReviewSort
} from "@/types/story-completion";

export type StoryCompletionReviewsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: StoryCompletionReviewFilterStatus;
  sort?: StoryCompletionReviewSort;
};

export type StoryCompletionReviewsPageResult = {
  items: AdminStoryCompletionReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};

function normalizePageSize(value: number) {
  if (value === 25 || value === 50) return value;
  return 10;
}

function parseStatus(value: unknown): StoryAdminCompletionStatus {
  const status = String(value ?? "not_requested");
  if (
    status === "pending_review" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }
  return "not_requested";
}

export async function getStoryCompletionReviews(
  query: StoryCompletionReviewsQuery
): Promise<StoryCompletionReviewsPageResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = normalizePageSize(query.pageSize ?? 10);
  const search = query.search?.trim().toLowerCase() ?? "";
  const statusFilter = query.status ?? "all";
  const sort = query.sort ?? "requested_desc";

  const supabase = await createClient();

  const { data: settingsRows, error: settingsError } = await supabase
    .from("story_monetization_settings")
    .select("story_id, full_access_enabled, full_access_price_coin")
    .eq("full_access_enabled", true);

  if (settingsError) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      error: settingsError.message
    };
  }

  const settingsMap = new Map(
    (settingsRows ?? []).map((row) => [
      String(row.story_id),
      {
        fullAccessPriceCoin:
          row.full_access_price_coin != null ? Number(row.full_access_price_coin) : null
      }
    ])
  );

  const storyIds = [...settingsMap.keys()];
  if (storyIds.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      error: null
    };
  }

  let storiesQuery = supabase
    .from("stories")
    .select(
      `id, title, slug, status, visibility, is_completed, updated_at, admin_completion_status, admin_completion_requested_at, admin_completion_reviewed_at, admin_completion_note, author_completion_request_note, ${ADMIN_CREATOR_JOIN}`
    )
    .in("id", storyIds);

  if (statusFilter !== "all") {
    storiesQuery = storiesQuery.eq("admin_completion_status", statusFilter);
  } else {
    storiesQuery = storiesQuery.neq("admin_completion_status", "not_requested");
  }

  const { data: storyRows, error: storyError } = await storiesQuery;
  if (storyError) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      error: storyError.message
    };
  }

  let filtered = storyRows ?? [];
  if (search) {
    filtered = filtered.filter((row) => {
      const title = String(row.title ?? "").toLowerCase();
      const creator = Array.isArray(row.creator_profiles)
        ? row.creator_profiles[0]
        : row.creator_profiles;
      const profile = Array.isArray(creator?.profiles)
        ? creator?.profiles[0]
        : creator?.profiles;
      const displayName = String(profile?.display_name ?? "").toLowerCase();
      const username = String(profile?.username ?? "").toLowerCase();
      const userId = String(creator?.user_id ?? "").toLowerCase();
      return (
        title.includes(search) ||
        displayName.includes(search) ||
        username.includes(search) ||
        userId.includes(search)
      );
    });
  }

  const enriched: AdminStoryCompletionReviewRow[] = await Promise.all(
    filtered.map(async (row) => {
      const storyId = String(row.id);
      const creator = Array.isArray(row.creator_profiles)
        ? row.creator_profiles[0]
        : row.creator_profiles;
      const profile = Array.isArray(creator?.profiles)
        ? creator?.profiles[0]
        : creator?.profiles;
      const settings = settingsMap.get(storyId);
      const authorDisplayName =
        resolveAdminCreatorName(creator) ?? "Tác giả";

      const [{ count: chapterCount }, { data: lastEpisode }, lockedRevenue] =
        await Promise.all([
          supabase
            .from("episodes")
            .select("id", { count: "exact", head: true })
            .eq("story_id", storyId),
          supabase
            .from("episodes")
            .select("updated_at")
            .eq("story_id", storyId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          sumLockedFullStoryRevenueForStory(storyId)
        ]);

      return {
        storyId,
        title: String(row.title),
        slug: String(row.slug),
        status: String(row.status),
        visibility: String(row.visibility),
        isCompleted: Boolean(row.is_completed),
        adminCompletionStatus: parseStatus(row.admin_completion_status),
        adminCompletionRequestedAt: row.admin_completion_requested_at
          ? String(row.admin_completion_requested_at)
          : null,
        adminCompletionReviewedAt: row.admin_completion_reviewed_at
          ? String(row.admin_completion_reviewed_at)
          : null,
        adminCompletionNote: (row.admin_completion_note as string | null) ?? null,
        authorCompletionRequestNote:
          (row.author_completion_request_note as string | null) ?? null,
        authorUserId: String(creator?.user_id ?? ""),
        authorDisplayName,
        authorHandle: profile?.username ? String(profile.username) : null,
        chapterCount: chapterCount ?? 0,
        lastChapterUpdatedAt: lastEpisode?.updated_at
          ? String(lastEpisode.updated_at)
          : null,
        fullAccessEnabled: true,
        fullAccessPriceCoin: settings?.fullAccessPriceCoin ?? null,
        lockedFullStoryRevenueVnd: Math.round(lockedRevenue * 100) / 100
      };
    })
  );

  enriched.sort((a, b) => {
    if (sort === "locked_revenue_desc") {
      return b.lockedFullStoryRevenueVnd - a.lockedFullStoryRevenueVnd;
    }
    if (sort === "story_updated_desc") {
      return (
        new Date(b.lastChapterUpdatedAt ?? 0).getTime() -
        new Date(a.lastChapterUpdatedAt ?? 0).getTime()
      );
    }
    return (
      new Date(b.adminCompletionRequestedAt ?? 0).getTime() -
      new Date(a.adminCompletionRequestedAt ?? 0).getTime()
    );
  });

  const total = enriched.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  return {
    items: enriched.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
    error: null
  };
}

export async function getStoryCompletionReviewSummary() {
  const supabase = await createClient();
  const { data: settingsRows } = await supabase
    .from("story_monetization_settings")
    .select("story_id")
    .eq("full_access_enabled", true);

  const storyIds = (settingsRows ?? []).map((row) => String(row.story_id));
  if (storyIds.length === 0) {
    return { pending: 0, approved: 0, rejected: 0 };
  }

  const [{ count: pending }, { count: approved }, { count: rejected }] =
    await Promise.all([
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .in("id", storyIds)
        .eq("admin_completion_status", "pending_review"),
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .in("id", storyIds)
        .eq("admin_completion_status", "approved"),
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .in("id", storyIds)
        .eq("admin_completion_status", "rejected")
    ]);

  return {
    pending: pending ?? 0,
    approved: approved ?? 0,
    rejected: rejected ?? 0
  };
}
