import { createClient } from "@/lib/data/server";
import {
  buildChapterRanges,
  CHAPTER_PAGE_SIZE,
  rangeForChapterNumber
} from "@/lib/stories/chapter-ranges";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { ChapterRange, ChapterSort, StoryChapterMeta, StoryChaptersResult } from "@/types/chapter";

export const EMPTY_STORY_CHAPTERS: StoryChaptersResult = {
  chapters: [],
  totalChapters: 0,
  currentRange: null,
  availableRanges: [],
  hasNextPage: false,
  hasPreviousPage: false,
  sort: "asc"
};

export type GetStoryChaptersInput = {
  storyId: string;
  rangeStart?: number;
  rangeEnd?: number;
  sort?: ChapterSort;
  search?: string;
  pageSize?: number;
};

type EpisodeRow = {
  id: string;
  episode_number: number;
  title: string;
  slug: string;
  public_code: string;
  excerpt: string | null;
  published_at: string | null;
};

function mapRow(row: EpisodeRow): StoryChapterMeta {
  return {
    id: row.id,
    episodeNumber: row.episode_number,
    title: row.title,
    slug: row.slug,
    publicCode: row.public_code,
    excerpt: row.excerpt,
    publishedAt: row.published_at
  };
}

export async function getStoryChapterCount(storyId: string): Promise<number> {
  const db = await createClient();
  const { count, error } = await db
    .from("episodes")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .in("status", [...publicContentStatuses]);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getStoryChapters(
  input: GetStoryChaptersInput
): Promise<StoryChaptersResult> {
  const pageSize = input.pageSize ?? CHAPTER_PAGE_SIZE;
  const sort: ChapterSort = input.sort ?? "asc";
  const db = await createClient();

  const totalChapters = await getStoryChapterCount(input.storyId);
  const availableRanges = buildChapterRanges(totalChapters, pageSize);

  let currentRange: ChapterRange | null = null;
  if (input.rangeStart && input.rangeEnd) {
    currentRange = {
      start: input.rangeStart,
      end: input.rangeEnd,
      label: `${input.rangeStart}–${input.rangeEnd}`
    };
  } else if (availableRanges[0]) {
    currentRange = availableRanges[0];
  }

  const search = input.search?.trim() ?? "";

  let query = db
    .from("episodes")
    .select("id, episode_number, title, slug, public_code, excerpt, published_at")
    .eq("story_id", input.storyId)
    .in("status", [...publicContentStatuses]);

  if (search) {
    const chapterNumber = Number(search);
    if (Number.isInteger(chapterNumber) && chapterNumber > 0) {
      query = query.eq("episode_number", chapterNumber);
      currentRange = rangeForChapterNumber(chapterNumber, totalChapters, pageSize);
    } else {
      query = query.ilike("title", `%${search}%`).limit(30);
      currentRange = null;
    }
  } else if (currentRange) {
    query = query
      .gte("episode_number", currentRange.start)
      .lte("episode_number", currentRange.end);
  }

  query = query.order("episode_number", { ascending: sort === "asc" });

  const { data, error } = await query;

  if (error) {
    return {
      chapters: [],
      totalChapters,
      currentRange,
      availableRanges,
      hasNextPage: false,
      hasPreviousPage: false,
      sort
    };
  }

  const chapters = ((data ?? []) as EpisodeRow[]).map(mapRow);
  const rangeIndex = currentRange
    ? availableRanges.findIndex(
        (range) => range.start === currentRange!.start && range.end === currentRange!.end
      )
    : -1;

  return {
    chapters,
    totalChapters,
    currentRange,
    availableRanges,
    hasNextPage: rangeIndex >= 0 && rangeIndex < availableRanges.length - 1,
    hasPreviousPage: rangeIndex > 0,
    sort
  };
}
