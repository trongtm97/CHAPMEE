import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import { studioPath } from "@/lib/studio/constants";
import type {
  CalendarListTab,
  ScheduledPublicationListItem,
  ScheduledPublicationStatus
} from "@/types/scheduling";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  target_type: "story" | "chapter" | "swipe";
  target_id: string;
  story_id: string | null;
  scheduled_at: string;
  timezone: string;
  status: ScheduledPublicationStatus;
  publish_attempts: number;
  last_error: string | null;
  published_at: string | null;
  canceled_at: string | null;
  stories: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export function normalizeCalendarTab(tab?: string): CalendarListTab {
  if (tab === "published" || tab === "failed" || tab === "canceled") {
    return tab;
  }

  return "upcoming";
}

function tabStatusFilter(tab: CalendarListTab): ScheduledPublicationStatus[] {
  switch (tab) {
    case "published":
      return ["published"];
    case "failed":
      return ["failed"];
    case "canceled":
      return ["canceled"];
    case "upcoming":
    default:
      return ["scheduled"];
  }
}

function mapRow(
  row: Row,
  episodeMeta: Map<string, { title: string; episode_number: number }>
): ScheduledPublicationListItem {
  const story = firstRelation(row.stories);
  const episode =
    row.target_type === "chapter" ? episodeMeta.get(row.target_id) : null;

  let editHref: string | null = null;
  let draftHref: string | null = null;

  if (row.target_type === "story") {
    editHref = studioPath(`/stories/${row.target_id}/edit`);
    draftHref = editHref;
  }

  if (row.target_type === "chapter" && row.story_id) {
    editHref = studioPath(`/stories/${row.story_id}/chapters/${row.target_id}/edit`);
    draftHref = editHref;
  }

  if (row.target_type === "swipe") {
    editHref = studioPath(`/swipe/${row.target_id}/edit`);
    draftHref = editHref;
  }

  return {
    canceledAt: row.canceled_at,
    chapterNumber: episode?.episode_number ?? null,
    chapterTitle: episode?.title ?? null,
    draftHref,
    editHref,
    id: row.id,
    lastError: row.last_error,
    publishAttempts: row.publish_attempts,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    status: row.status,
    storyId: row.story_id,
    storyTitle: story?.title ?? null,
    targetId: row.target_id,
    targetType: row.target_type,
    timezone: row.timezone
  };
}

export async function getScheduledPublicationsPage(
  supabase: SupabaseClient,
  profileId: string,
  options?: { tab?: string; page?: string }
) {
  const tab = normalizeCalendarTab(options?.tab);
  const page = parseStudioPage(options?.page);
  const statuses = tabStatusFilter(tab);

  const { data, error } = await supabase
    .from("scheduled_publications")
    .select(
      `id, target_type, target_id, story_id, scheduled_at, timezone, status,
      publish_attempts, last_error, published_at, canceled_at,
      stories(title, slug)`
    )
    .eq("creator_id", profileId)
    .in("status", statuses)
    .order("scheduled_at", { ascending: tab === "upcoming" });

  if (error) {
    return {
      counts: { canceled: 0, failed: 0, published: 0, upcoming: 0 },
      error: error.message,
      items: [] as ScheduledPublicationListItem[],
      page: 1,
      tab,
      total: 0,
      totalPages: 1
    };
  }

  const rawRows = (data ?? []) as unknown as Row[];
  const chapterIds = rawRows
    .filter((row) => row.target_type === "chapter")
    .map((row) => row.target_id);

  const episodeMeta = new Map<string, { title: string; episode_number: number }>();

  if (chapterIds.length > 0) {
    const { data: episodes } = await supabase
      .from("episodes")
      .select("id, title, episode_number")
      .in("id", chapterIds);

    for (const episode of episodes ?? []) {
      episodeMeta.set(episode.id as string, {
        episode_number: episode.episode_number as number,
        title: episode.title as string
      });
    }
  }

  const rows = rawRows.map((row) => mapRow(row, episodeMeta));
  const paginated = paginateList(rows, page);
  const counts = await getScheduledPublicationCounts(supabase, profileId);

  return {
    counts,
    error: null,
    items: paginated.items,
    page: paginated.page,
    tab,
    total: paginated.total,
    totalPages: paginated.totalPages
  };
}

export async function getScheduledPublicationCounts(
  supabase: SupabaseClient,
  profileId: string
) {
  const { data, error } = await supabase
    .from("scheduled_publications")
    .select("status")
    .eq("creator_id", profileId);

  const counts: Record<CalendarListTab, number> = {
    canceled: 0,
    failed: 0,
    published: 0,
    upcoming: 0
  };

  if (error) {
    return counts;
  }

  for (const row of data ?? []) {
    const status = row.status as ScheduledPublicationStatus;

    if (status === "scheduled") {
      counts.upcoming += 1;
    } else if (status in counts) {
      counts[status as Exclude<CalendarListTab, "upcoming">] += 1;
    }
  }

  return counts;
}
