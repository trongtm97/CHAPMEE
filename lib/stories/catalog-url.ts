import {
  buildCatalogHref,
  catalogHasDeepFilters,
  type StoryCatalogFilterParams
} from "@/lib/discovery/catalog-url";
import type { StoryCatalogGenre } from "@/types/story";

export type CatalogUrlParams = StoryCatalogFilterParams;

export { buildCatalogHref, catalogHasDeepFilters };

export function getGenreDisplayName(genre: string, genres: StoryCatalogGenre[]) {
  if (!genre) {
    return "Tất cả danh mục";
  }
  const match = genres.find((item) => item.slug === genre);
  return match?.name ?? genre;
}

export function hasAdvancedCatalogFilters(
  params: StoryCatalogFilterParams & {
    q?: string;
    genre?: string;
  },
  featuredGenreSlugs: string[] = []
) {
  const featured = new Set<string>(["", ...featuredGenreSlugs.filter(Boolean)]);
  return (
    catalogHasDeepFilters(params) ||
    (params.status && params.status !== "all") ||
    (params.sort && params.sort !== "updated") ||
    Boolean(params.genre && !featured.has(params.genre))
  );
}
