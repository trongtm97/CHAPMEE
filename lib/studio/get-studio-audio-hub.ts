import "server-only";

import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/data/server";
import {
  getStudioHubSearch,
  normalizeStudioAudioHubStatus,
  normalizeStudioHubPageSize,
  parseStudioHubPage,
  sanitizeIlikePattern
} from "@/lib/studio/studio-hub-filters";
import type { AudioItemRow } from "@/src/lib/audio/audio-items";

export type StudioAudioHubItem = AudioItemRow & {
  storyTitle: string;
  storySlug: string;
};

export type StudioAudioHubData = {
  items: StudioAudioHubItem[];
  summary: {
    total: number;
    published: number;
    draft: number;
    pendingReview: number;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  error: string | null;
};

type AudioRowWithStory = AudioItemRow & {
  stories: { id: string; title: string; slug: string; creator_id: string } | null;
};

export type StudioAudioHubOptions = {
  search?: string;
  status?: string;
  storyId?: string;
  page?: string;
  pageSize?: string;
};

async function countAudioByStatus(creatorId: string, status?: string) {
  const db = await createClient();
  let query = db
    .from("audio_items")
    .select("id, stories!inner(creator_id)", { count: "exact", head: true })
    .eq("stories.creator_id", creatorId);

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

async function loadAudioHubSummary(creatorId: string) {
  const [total, published, draft, pendingReview] = await Promise.all([
    countAudioByStatus(creatorId),
    countAudioByStatus(creatorId, "published"),
    countAudioByStatus(creatorId, "draft"),
    countAudioByStatus(creatorId, "pending_review")
  ]);

  return { total, published, draft, pendingReview };
}

async function loadMatchingStoryIds(creatorId: string, search: string) {
  const db = await createClient();
  const safe = sanitizeIlikePattern(search);
  const { data } = await db
    .from("stories")
    .select("id")
    .eq("creator_id", creatorId)
    .ilike("title", `%${safe}%`)
    .limit(200);

  return (data ?? []).map((row) => String(row.id));
}

function applyAudioSearchFilter<T extends { or: (filters: string) => T; ilike: (col: string, pattern: string) => T }>(
  query: T,
  search: string,
  storyIds: string[]
) {
  const safe = sanitizeIlikePattern(search);
  if (storyIds.length > 0) {
    return query.or(`title.ilike.%${safe}%,story_id.in.(${storyIds.join(",")})`);
  }
  return query.ilike("title", `%${safe}%`);
}

export async function getStudioAudioHubData(
  creatorProfile: CreatorProfile,
  options?: StudioAudioHubOptions
): Promise<StudioAudioHubData> {
  const activeSearch = getStudioHubSearch(options?.search);
  const activeStatus = normalizeStudioAudioHubStatus(options?.status);
  const activeStoryId = options?.storyId?.trim() ?? "";
  const activePage = parseStudioHubPage(options?.page);
  const activePageSize = normalizeStudioHubPageSize(options?.pageSize);

  try {
    const db = await createClient();
    const [summary, matchingStoryIds] = await Promise.all([
      loadAudioHubSummary(creatorProfile.id),
      activeSearch ? loadMatchingStoryIds(creatorProfile.id, activeSearch) : Promise.resolve([])
    ]);

    let query = db
      .from("audio_items")
      .select("*, stories!inner(id, title, slug, creator_id)", { count: "exact" })
      .eq("stories.creator_id", creatorProfile.id);

    if (activeStoryId) {
      query = query.eq("story_id", activeStoryId);
    }

    if (activeStatus !== "all") {
      query = query.eq("status", activeStatus);
    }

    if (activeSearch) {
      query = applyAudioSearchFilter(query, activeSearch, matchingStoryIds);
    }

    query = query.order("updated_at", { ascending: false });

    const from = (activePage - 1) * activePageSize;
    const to = from + activePageSize - 1;
    const { count, data, error } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as AudioRowWithStory[];
    const items: StudioAudioHubItem[] = rows.map((row) => {
      const { stories, ...audio } = row;
      return {
        ...audio,
        storyTitle: stories?.title ?? "—",
        storySlug: stories?.slug ?? ""
      };
    });

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / activePageSize));

    return {
      items,
      summary,
      page: Math.min(activePage, totalPages),
      pageSize: activePageSize,
      total,
      totalPages,
      error: null
    };
  } catch (cause) {
    return {
      items: [],
      summary: { total: 0, published: 0, draft: 0, pendingReview: 0 },
      page: 1,
      pageSize: activePageSize,
      total: 0,
      totalPages: 1,
      error: cause instanceof Error ? cause.message : "Không tải được danh sách audio."
    };
  }
}

export { type StudioAudioHubStatusFilter } from "@/lib/studio/studio-hub-filters";
