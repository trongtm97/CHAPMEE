"use server";

import { createClient } from "@/lib/supabase/server";
import { sumLockedFullStoryRevenueForStory } from "@/lib/monetization/story-completion-escrow";
import type {
  StoryAdminCompletionStatus,
  StudioFullStoryEscrowStoryRow
} from "@/types/story-completion";

export type FullStoryEscrowStoriesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: "updated_desc" | "locked_revenue_desc" | "title_asc";
};

export type FullStoryEscrowStoriesPageResult = {
  rows: StudioFullStoryEscrowStoryRow[];
  totalCount: number;
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

export async function getFullStoryEscrowStoriesPage(
  creatorProfileId: string,
  creatorUserId: string,
  query: FullStoryEscrowStoriesQuery = {}
): Promise<FullStoryEscrowStoriesPageResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = normalizePageSize(query.pageSize ?? 10);
  const search = query.search?.trim().toLowerCase() ?? "";
  const sort = query.sort ?? "updated_desc";

  const supabase = await createClient();

  const { data: settingsRows, error: settingsError } = await supabase
    .from("story_monetization_settings")
    .select("story_id, full_access_enabled")
    .eq("creator_user_id", creatorUserId)
    .eq("full_access_enabled", true);

  if (settingsError) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: settingsError.message
    };
  }

  const storyIds = (settingsRows ?? []).map((row) => String(row.story_id));
  if (storyIds.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: null
    };
  }

  const { data: storyRows, error: storyError } = await supabase
    .from("stories")
    .select(
      "id, title, slug, public_code, status, is_completed, updated_at, admin_completion_status, admin_completion_note, author_completion_request_note"
    )
    .eq("creator_id", creatorProfileId)
    .in("id", storyIds)
    .neq("admin_completion_status", "approved");

  if (storyError) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      error: storyError.message
    };
  }

  let filtered = storyRows ?? [];
  if (search) {
    filtered = filtered.filter((row) =>
      String(row.title ?? "")
        .toLowerCase()
        .includes(search)
    );
  }

  const enriched: StudioFullStoryEscrowStoryRow[] = await Promise.all(
    filtered.map(async (row) => {
      const storyId = String(row.id);
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
        publicCode: String(row.public_code),
        status: String(row.status),
        isCompleted: Boolean(row.is_completed),
        adminCompletionStatus: parseStatus(row.admin_completion_status),
        adminCompletionNote: (row.admin_completion_note as string | null) ?? null,
        authorCompletionRequestNote:
          (row.author_completion_request_note as string | null) ?? null,
        lockedFullStoryRevenueVnd: Math.round(lockedRevenue * 100) / 100,
        chapterCount: chapterCount ?? 0,
        lastChapterUpdatedAt: lastEpisode?.updated_at
          ? String(lastEpisode.updated_at)
          : null,
        storyUpdatedAt: String(row.updated_at),
        fullAccessEnabled: true
      };
    })
  );

  enriched.sort((a, b) => {
    if (sort === "locked_revenue_desc") {
      return b.lockedFullStoryRevenueVnd - a.lockedFullStoryRevenueVnd;
    }
    if (sort === "title_asc") {
      return a.title.localeCompare(b.title, "vi");
    }
    return (
      new Date(b.storyUpdatedAt).getTime() - new Date(a.storyUpdatedAt).getTime()
    );
  });

  const totalCount = enriched.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const offset = (page - 1) * pageSize;

  return {
    rows: enriched.slice(offset, offset + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
    error: null
  };
}

export async function countFullStoryEscrowStories(
  creatorProfileId: string,
  creatorUserId: string
) {
  const supabase = await createClient();
  const { data: settingsRows } = await supabase
    .from("story_monetization_settings")
    .select("story_id")
    .eq("creator_user_id", creatorUserId)
    .eq("full_access_enabled", true);

  const storyIds = (settingsRows ?? []).map((row) => String(row.story_id));
  if (storyIds.length === 0) return 0;

  const { count } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorProfileId)
    .in("id", storyIds)
    .neq("admin_completion_status", "approved");

  return count ?? 0;
}
