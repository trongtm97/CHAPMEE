import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

export type CatalogUrlParams = {
  q?: string;
  genre?: string;
  status?: StoryCatalogStatus;
  sort?: StoryCatalogSort;
  page?: number;
  pageSize?: number;
};

export function buildCatalogHref(params: CatalogUrlParams = {}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.genre?.trim()) {
    search.set("genre", params.genre.trim());
  }
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params.sort && params.sort !== "updated") {
    search.set("sort", params.sort);
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize > 0) {
    search.set("pageSize", String(params.pageSize));
  }
  const query = search.toString();
  return query ? `/truyen?${query}` : "/truyen";
}

export const featuredGenreSlugs = [
  "",
  "drama",
  "ngon-tinh",
  "kinh-di",
  "trinh-tham",
  "chua-lanh",
  "chat-story",
  "truyen-ngan"
] as const;

export const featuredGenreLabels: Record<string, string> = {
  "": "Tất cả",
  drama: "Drama",
  "ngon-tinh": "Ngôn tình",
  "kinh-di": "Kinh dị",
  "trinh-tham": "Trinh thám",
  "chua-lanh": "Chữa lành",
  "chat-story": "Chat story",
  "truyen-ngan": "Truyện ngắn"
};

export function getFallbackCatalogGenres(): StoryCatalogGenre[] {
  return featuredGenreSlugs
    .filter((slug) => slug.length > 0)
    .map((slug) => ({
      slug,
      name: featuredGenreLabels[slug] ?? slug,
      storyCount: 0
    }));
}

export function resolveCatalogGenres(genres: StoryCatalogGenre[]): StoryCatalogGenre[] {
  if (genres.length > 0) {
    return genres;
  }
  return getFallbackCatalogGenres();
}

export function getGenreDisplayName(genre: string, genres: StoryCatalogGenre[]) {
  if (!genre) {
    return "Tất cả danh mục";
  }
  const match = genres.find((item) => item.slug === genre);
  return match?.name ?? featuredGenreLabels[genre] ?? genre;
}

export function hasAdvancedCatalogFilters(params: {
  q: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
}) {
  const featured = new Set<string>(featuredGenreSlugs);
  return (
    Boolean(params.q.trim()) ||
    params.status !== "all" ||
    params.sort !== "updated" ||
    Boolean(params.genre && !featured.has(params.genre))
  );
}
