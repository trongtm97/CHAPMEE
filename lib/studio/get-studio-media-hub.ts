import "server-only";

import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createClient } from "@/lib/data/server";
import { listUserLibraryImages } from "@/lib/media/list-user-images";
import {
  getStudioHubSearch,
  normalizeStudioHubMediaTab,
  normalizeStudioHubPageSize,
  parseStudioHubPage,
  sanitizeIlikePattern
} from "@/lib/studio/studio-hub-filters";
import type { LibraryImage } from "@/types/media-library";
import type { FilmAdaptationRow } from "@/src/lib/film-adaptations/film-adaptations";

export type StudioMediaHubFilmItem = FilmAdaptationRow & {
  storyTitle: string;
  storySlug: string;
};

export type StudioMediaHubData = {
  images: LibraryImage[];
  films: StudioMediaHubFilmItem[];
  summary: {
    imageCount: number;
    filmCount: number;
    publishedFilms: number;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  activeTab: "images" | "video";
  error: string | null;
};

type FilmRowWithStory = FilmAdaptationRow & {
  stories: { id: string; title: string; slug: string; creator_id: string } | null;
};

export type StudioMediaHubOptions = {
  search?: string;
  storyId?: string;
  tab?: string;
  page?: string;
  pageSize?: string;
};

async function countFilmsByStatus(creatorId: string, status?: string) {
  const db = await createClient();
  let query = db
    .from("story_film_adaptations")
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

function applyFilmSearchFilter<T extends { or: (filters: string) => T; ilike: (col: string, pattern: string) => T }>(
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

export async function getStudioMediaHubData(
  creatorProfile: CreatorProfile,
  userId: string,
  options?: StudioMediaHubOptions
): Promise<StudioMediaHubData> {
  const activeSearch = getStudioHubSearch(options?.search);
  const activeStoryId = options?.storyId?.trim() ?? "";
  const activeTab = normalizeStudioHubMediaTab(options?.tab);
  const activePage = parseStudioHubPage(options?.page);
  const activePageSize = normalizeStudioHubPageSize(options?.pageSize);

  try {
    const db = await createClient();
    const [imageLibrary, filmCount, publishedFilms, matchingStoryIds] = await Promise.all([
      listUserLibraryImages(db, userId, {
        page: activeTab === "images" ? activePage : 1,
        pageSize: activePageSize,
        search: activeTab === "images" ? activeSearch : undefined
      }),
      countFilmsByStatus(creatorProfile.id),
      countFilmsByStatus(creatorProfile.id, "published"),
      activeSearch && activeTab === "video"
        ? loadMatchingStoryIds(creatorProfile.id, activeSearch)
        : Promise.resolve([])
    ]);

    let films: StudioMediaHubFilmItem[] = [];
    let filmTotal = 0;
    let filmTotalPages = 1;

    if (activeTab === "video") {
      let query = db
        .from("story_film_adaptations")
        .select("*, stories!inner(id, title, slug, creator_id)", { count: "exact" })
        .eq("stories.creator_id", creatorProfile.id);

      if (activeStoryId) {
        query = query.eq("story_id", activeStoryId);
      }

      if (activeSearch) {
        query = applyFilmSearchFilter(query, activeSearch, matchingStoryIds);
      }

      query = query.order("updated_at", { ascending: false });

      const from = (activePage - 1) * activePageSize;
      const to = from + activePageSize - 1;
      const { count, data, error } = await query.range(from, to);

      if (error) {
        throw new Error(error.message);
      }

      const filmRows = (data ?? []) as FilmRowWithStory[];
      films = filmRows.map((row) => {
        const { stories, ...film } = row;
        return {
          ...film,
          storyTitle: stories?.title ?? "—",
          storySlug: stories?.slug ?? ""
        };
      });
      filmTotal = count ?? 0;
      filmTotalPages = Math.max(1, Math.ceil(filmTotal / activePageSize));
    }

    const imageTotal = imageLibrary.total;
    const imageTotalPages = Math.max(1, Math.ceil(imageTotal / activePageSize));
    const isImagesTab = activeTab === "images";

    return {
      images: imageLibrary.images,
      films,
      summary: {
        imageCount: imageTotal,
        filmCount,
        publishedFilms
      },
      page: Math.min(activePage, isImagesTab ? imageTotalPages : filmTotalPages),
      pageSize: activePageSize,
      total: isImagesTab ? imageTotal : filmTotal,
      totalPages: isImagesTab ? imageTotalPages : filmTotalPages,
      activeTab,
      error: null
    };
  } catch (cause) {
    return {
      images: [] as LibraryImage[],
      films: [] as StudioMediaHubFilmItem[],
      summary: { imageCount: 0, filmCount: 0, publishedFilms: 0 },
      page: 1,
      pageSize: activePageSize,
      total: 0,
      totalPages: 1,
      activeTab,
      error: cause instanceof Error ? cause.message : "Không tải được thư viện media."
    };
  }
}

/** ponytail: userId from session — kept separate so page can pass getCurrentUser().profile.id */
export async function loadStudioMediaHubForCreator(
  creatorProfile: CreatorProfile,
  options?: StudioMediaHubOptions
) {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return {
      images: [] as LibraryImage[],
      films: [] as StudioMediaHubFilmItem[],
      summary: { imageCount: 0, filmCount: 0, publishedFilms: 0 },
      page: 1,
      pageSize: normalizeStudioHubPageSize(),
      total: 0,
      totalPages: 1,
      activeTab: normalizeStudioHubMediaTab(options?.tab),
      error: "Không xác định được tài khoản."
    } satisfies StudioMediaHubData;
  }
  return getStudioMediaHubData(creatorProfile, profile.id, options);
}
