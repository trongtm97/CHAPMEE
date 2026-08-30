import {
  normalizeCalendarContentFilter,
  normalizeCalendarTab,
  normalizeCalendarTimeFilter,
  parseCalendarPageSize
} from "@/lib/studio/scheduling/calendar-query";
import { paginateList, parseStudioPage } from "@/lib/studio/pagination";
import { studioPath } from "@/lib/studio/constants";
import {
  formatFriendlyScheduleTime,
  isInCurrentVnMonth,
  isPublishedWithinDays,
  isScheduledToday,
  isWithinNextDays
} from "@/lib/studio/scheduling/format-calendar-time";
import {
  chapterScheduleEventLabel,
  storyScheduleEventLabel
} from "@/lib/studio/scheduling/status-labels";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import type {
  CalendarListTab,
  CalendarStats,
  CalendarTimeFilter,
  ScheduledPublicationListItem,
  ScheduledPublicationStatus,
  ScheduledTargetType
} from "@/types/scheduling";
import type { DatabaseClient } from "@/lib/db/types";

export {
  normalizeCalendarTab,
  normalizeCalendarContentFilter,
  normalizeCalendarTimeFilter,
  parseCalendarPageSize
} from "@/lib/studio/scheduling/calendar-query";

type ScheduledPublicationBaseRow = {
  id: string;
  target_type: ScheduledTargetType;
  target_id: string;
  story_id: string | null;
  scheduled_at: string;
  timezone: string;
  status: ScheduledPublicationStatus;
  publish_attempts: number;
  last_error: string | null;
  published_at: string | null;
  canceled_at: string | null;
  created_at?: string;
};

type Row = ScheduledPublicationBaseRow & {
  stories: {
    title: string;
    slug: string;
    structure_type?: string | null;
  } | null;
};

type StoryLookupRow = {
  id: string;
  title: string;
  slug: string;
  structure_type?: string | null;
};

function resolveStoryId(row: ScheduledPublicationBaseRow) {
  if (row.story_id) {
    return row.story_id;
  }

  if (row.target_type === "story") {
    return row.target_id;
  }

  return null;
}

async function loadScheduledStoryRows(
  db: DatabaseClient,
  rows: ScheduledPublicationBaseRow[]
): Promise<Row[]> {
  const storyIds = [
    ...new Set(
      rows
        .map((row) => resolveStoryId(row))
        .filter((id): id is string => Boolean(id))
    )
  ];

  const storiesById = new Map<string, Row["stories"]>();

  if (storyIds.length > 0) {
    const { data: storyRows, error: storyError } = await db
      .from("stories")
      .select("id, title, slug, structure_type")
      .in("id", storyIds);

    if (storyError) {
      throw new Error(storyError.message);
    }

    for (const story of (storyRows ?? []) as StoryLookupRow[]) {
      storiesById.set(story.id, {
        title: story.title,
        slug: story.slug,
        structure_type: story.structure_type
      });
    }
  }

  return rows.map((row) => ({
    ...row,
    stories: (() => {
      const storyId = resolveStoryId(row);
      return storyId ? (storiesById.get(storyId) ?? null) : null;
    })()
  }));
}

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function buildDisplayTitle(
  row: Row,
  episode: { title: string; episode_number: number } | null,
  reel: { title: string | null } | null
) {
  const story = firstRelation(row.stories);
  const structureType = normalizeStoryStructureType(story?.structure_type);

  if (row.target_type === "chapter") {
    const chapterTitle =
      episode?.title ??
      (episode?.episode_number ? `Chương ${episode.episode_number}` : "Chương");
    return chapterScheduleEventLabel(chapterTitle, story?.title ?? null);
  }

  if (row.target_type === "reels") {
    return reel?.title?.trim() || "Reels";
  }

  return storyScheduleEventLabel(story?.title ?? "Truyện", structureType);
}

function buildSourceLabel(targetType: ScheduledTargetType) {
  if (targetType === "reels") {
    return "Từ editor Reels";
  }

  if (targetType === "chapter") {
    return "Từ editor chương";
  }

  return "Lên lịch thủ công";
}

function mapRow(
  row: Row,
  episodeMeta: Map<string, { title: string; episode_number: number }>,
  reelMeta: Map<string, { title: string | null; story_id: string | null }>
): ScheduledPublicationListItem {
  const story = firstRelation(row.stories);
  const structureType = normalizeStoryStructureType(story?.structure_type);
  const episode =
    row.target_type === "chapter" ? episodeMeta.get(row.target_id) : null;
  const reel = row.target_type === "reels" ? reelMeta.get(row.target_id) : null;

  let editHref: string | null = null;
  let draftHref: string | null = null;
  let previewHref: string | null = null;

  if (row.target_type === "story") {
    editHref =
      structureType === "standalone"
        ? studioPath(`/stories/${row.target_id}/content`)
        : studioPath(`/stories/${row.target_id}/edit`);
    draftHref = editHref;
  }

  if (row.target_type === "chapter" && row.story_id) {
    editHref = studioPath(`/stories/${row.story_id}/chapters/${row.target_id}/edit`);
    draftHref = editHref;
    previewHref = studioPath(
      `/stories/${row.story_id}/episodes/${row.target_id}/preview`
    );
  }

  if (row.target_type === "reels") {
    editHref = studioPath(`/reels/${row.target_id}/edit`);
    draftHref = editHref;
  }

  if (story?.slug) {
    previewHref = previewHref ?? `/truyen/${story.slug}`;
  }

  const scheduledToday = isScheduledToday(row.scheduled_at);

  return {
    canceledAt: row.canceled_at,
    chapterNumber: episode?.episode_number ?? null,
    chapterTitle: episode?.title ?? null,
    displayTitle: buildDisplayTitle(row, episode ?? null, reel ?? null),
    draftHref,
    editHref,
    friendlyScheduleLabel: formatFriendlyScheduleTime(row.scheduled_at),
    id: row.id,
    isScheduledToday: scheduledToday,
    lastError: row.last_error,
    previewHref,
    publishAttempts: row.publish_attempts,
    publishedAt: row.published_at,
    reelTitle: reel?.title ?? null,
    scheduledAt: row.scheduled_at,
    sourceLabel: buildSourceLabel(row.target_type),
    status: row.status,
    storyId: row.story_id ?? reel?.story_id ?? null,
    storySlug: story?.slug ?? null,
    storyStructureType: structureType,
    storyTitle: story?.title ?? null,
    targetId: row.target_id,
    targetType: row.target_type,
    timezone: row.timezone
  };
}

function matchesTab(item: ScheduledPublicationListItem, tab: CalendarListTab, now = new Date()) {
  switch (tab) {
    case "today":
      return item.status === "scheduled" && item.isScheduledToday;
    case "published":
      return item.status === "published";
    case "failed":
      return item.status === "failed";
    case "canceled":
      return item.status === "canceled";
    case "all":
      return true;
    case "upcoming":
    default:
      return (
        item.status === "scheduled" &&
        new Date(item.scheduledAt).getTime() >= now.getTime()
      );
  }
}

function matchesTimeFilter(item: ScheduledPublicationListItem, filter: CalendarTimeFilter) {
  switch (filter) {
    case "today":
      return item.isScheduledToday;
    case "7d":
      return isWithinNextDays(item.scheduledAt, 7);
    case "30d":
      return isWithinNextDays(item.scheduledAt, 30);
    case "month":
      return isInCurrentVnMonth(item.scheduledAt);
    default:
      return true;
  }
}

function computeStats(items: ScheduledPublicationListItem[]): CalendarStats {
  const now = new Date();

  return {
    canceled: items.filter((item) => item.status === "canceled").length,
    failed: items.filter((item) => item.status === "failed").length,
    published7d: items.filter((item) =>
      isPublishedWithinDays(item.publishedAt, 7, now)
    ).length,
    today: items.filter(
      (item) => item.status === "scheduled" && item.isScheduledToday
    ).length,
    upcoming: items.filter(
      (item) =>
        item.status === "scheduled" &&
        new Date(item.scheduledAt).getTime() >= now.getTime()
    ).length
  };
}

function computeCounts(items: ScheduledPublicationListItem[]): Record<CalendarListTab, number> {
  const now = new Date();

  return {
    all: items.length,
    canceled: items.filter((item) => item.status === "canceled").length,
    failed: items.filter((item) => item.status === "failed").length,
    published: items.filter((item) => item.status === "published").length,
    today: items.filter(
      (item) => item.status === "scheduled" && item.isScheduledToday
    ).length,
    upcoming: items.filter(
      (item) =>
        item.status === "scheduled" &&
        new Date(item.scheduledAt).getTime() >= now.getTime()
    ).length
  };
}

function computeWriteChapterHref(items: ScheduledPublicationListItem[]) {
  const chapter = items.find((item) => item.targetType === "chapter" && item.storyId);

  if (chapter?.storyId) {
    return studioPath(`/stories/${chapter.storyId}/chapters/new`);
  }

  const standaloneStory = items.find(
    (item) =>
      item.targetType === "story" &&
      item.storyId &&
      item.storyStructureType === "standalone"
  );

  if (standaloneStory?.storyId) {
    return studioPath(`/stories/${standaloneStory.storyId}/content`);
  }

  const story = items.find((item) => item.targetType === "story" && item.storyId);

  if (story?.storyId) {
    return studioPath(`/stories/${story.storyId}/chapters/new`);
  }

  return studioPath("/stories");
}

export async function getScheduledPublicationsPage(
  db: DatabaseClient,
  profileId: string,
  options?: {
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    type?: string;
    time?: string;
  }
) {
  const tab = normalizeCalendarTab(options?.tab);
  const page = parseStudioPage(options?.page);
  const pageSize = parseCalendarPageSize(options?.pageSize);
  const contentFilter = normalizeCalendarContentFilter(options?.type);
  const timeFilter = normalizeCalendarTimeFilter(options?.time);
  const search = (options?.search ?? "").trim().toLowerCase();

  const { data, error } = await db
    .from("scheduled_publications")
    .select(
      "id, target_type, target_id, story_id, scheduled_at, timezone, status, publish_attempts, last_error, published_at, canceled_at, created_at"
    )
    .eq("creator_id", profileId)
    .order("scheduled_at", { ascending: tab === "upcoming" || tab === "today" });

  if (error) {
    return {
      counts: {
        all: 0,
        canceled: 0,
        failed: 0,
        published: 0,
        today: 0,
        upcoming: 0
      },
      error: error.message,
      failedItems: [] as ScheduledPublicationListItem[],
      items: [] as ScheduledPublicationListItem[],
      page: 1,
      stats: {
        canceled: 0,
        failed: 0,
        published7d: 0,
        today: 0,
        upcoming: 0
      },
      tab,
      todayItems: [] as ScheduledPublicationListItem[],
      total: 0,
      totalPages: 1,
      upcomingItems: [] as ScheduledPublicationListItem[],
      writeChapterHref: studioPath("/stories")
    };
  }

  const rawRows = await loadScheduledStoryRows(
    db,
    (data ?? []) as ScheduledPublicationBaseRow[]
  );
  const chapterIds = rawRows
    .filter((row) => row.target_type === "chapter")
    .map((row) => row.target_id);
  const reelIds = rawRows
    .filter((row) => row.target_type === "reels")
    .map((row) => row.target_id);

  const episodeMeta = new Map<string, { title: string; episode_number: number }>();
  const reelMeta = new Map<string, { title: string | null; story_id: string | null }>();

  if (chapterIds.length > 0) {
    const { data: episodes } = await db
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

  if (reelIds.length > 0) {
    const { data: reels } = await db
      .from("reels_items")
      .select("id, title, story_id")
      .in("id", reelIds);

    for (const reel of reels ?? []) {
      reelMeta.set(reel.id as string, {
        story_id: reel.story_id as string | null,
        title: reel.title as string | null
      });
    }
  }

  const allItems = rawRows.map((row) => mapRow(row, episodeMeta, reelMeta));
  const stats = computeStats(allItems);
  const counts = computeCounts(allItems);

  const todayItems = allItems
    .filter((item) => item.status === "scheduled" && item.isScheduledToday)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    .slice(0, 5);

  const upcomingItems = allItems
    .filter(
      (item) =>
        item.status === "scheduled" &&
        new Date(item.scheduledAt).getTime() >= Date.now()
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    .slice(0, 5);

  const failedItems = allItems
    .filter((item) => item.status === "failed")
    .slice(0, 5);

  const filtered = allItems
    .filter((item) => matchesTab(item, tab))
    .filter((item) =>
      contentFilter === "all" ? true : item.targetType === contentFilter
    )
    .filter((item) => matchesTimeFilter(item, timeFilter))
    .filter((item) => {
      if (!search) {
        return true;
      }

      const haystack = [
        item.displayTitle,
        item.storyTitle,
        item.chapterTitle,
        item.reelTitle,
        item.chapterNumber
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });

  const paginated = paginateList(filtered, page, pageSize);

  return {
    counts,
    error: null,
    failedItems,
    items: paginated.items,
    page: paginated.page,
    stats,
    tab,
    todayItems,
    total: paginated.total,
    totalPages: paginated.totalPages,
    upcomingItems,
    writeChapterHref: computeWriteChapterHref(allItems)
  };
}

export async function getScheduledPublicationCounts(
  db: DatabaseClient,
  profileId: string
) {
  const { data, error } = await db
    .from("scheduled_publications")
    .select("status, scheduled_at, published_at")
    .eq("creator_id", profileId);

  if (error) {
    return {
      all: 0,
      canceled: 0,
      failed: 0,
      published: 0,
      today: 0,
      upcoming: 0
    } satisfies Record<CalendarListTab, number>;
  }

  const now = new Date();
  const counts: Record<CalendarListTab, number> = {
    all: data?.length ?? 0,
    canceled: 0,
    failed: 0,
    published: 0,
    today: 0,
    upcoming: 0
  };

  for (const row of data ?? []) {
    const status = row.status as ScheduledPublicationStatus;

    if (status === "scheduled") {
      if (isScheduledToday(row.scheduled_at as string, now)) {
        counts.today += 1;
      }

      if (new Date(row.scheduled_at as string).getTime() >= now.getTime()) {
        counts.upcoming += 1;
      }
    } else if (status === "published") {
      counts.published += 1;
    } else if (status === "failed") {
      counts.failed += 1;
    } else if (status === "canceled") {
      counts.canceled += 1;
    }
  }

  return counts;
}
