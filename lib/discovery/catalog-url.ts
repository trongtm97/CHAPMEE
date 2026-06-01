import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";

export type { StoryCatalogFilterParams };

export function buildCatalogHref(params: StoryCatalogFilterParams = {}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.genre?.trim()) search.set("genre", params.genre.trim());
  if (params.subgenre?.trim()) search.set("subgenre", params.subgenre.trim());
  if (params.tag?.trim()) search.set("tag", params.tag.trim());
  if (params.character?.trim()) search.set("character", params.character.trim());
  if (params.relationship?.trim()) search.set("relationship", params.relationship.trim());
  if (params.narrativeStyle?.trim()) search.set("narrativeStyle", params.narrativeStyle.trim());
  if (params.setting?.trim()) search.set("setting", params.setting.trim());
  if (params.experience?.trim()) search.set("experience", params.experience.trim());
  if (params.presentation?.trim()) search.set("presentation", params.presentation.trim());
  if (params.contentType?.trim()) search.set("contentType", params.contentType.trim());
  if (params.ageRating?.trim()) search.set("ageRating", params.ageRating.trim());
  if (params.monetization?.trim()) search.set("monetization", params.monetization.trim());
  if (params.contentWarning?.trim()) search.set("contentWarning", params.contentWarning.trim());
  if (params.storyStatus?.trim()) search.set("storyStatus", params.storyStatus.trim());
  if (params.access) search.set("access", params.access);
  if (params.hasWarning) search.set("hasWarning", params.hasWarning);
  if (params.hasNewChapter) search.set("hasNewChapter", params.hasNewChapter);
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.sort && params.sort !== "updated") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.pageSize && params.pageSize > 0) search.set("pageSize", String(params.pageSize));
  const query = search.toString();
  return query ? `/truyen?${query}` : "/truyen";
}

export function catalogHasDeepFilters(params: StoryCatalogFilterParams) {
  const filterKeys = [
    params.subgenre,
    params.tag,
    params.character,
    params.relationship,
    params.narrativeStyle,
    params.setting,
    params.experience,
    params.presentation,
    params.contentType,
    params.ageRating,
    params.monetization,
    params.contentWarning,
    params.storyStatus,
    params.access,
    params.hasWarning,
    params.hasNewChapter,
    params.q
  ];
  return filterKeys.some((value) => Boolean(value?.trim()));
}

export function parseCatalogSearchParams(
  raw: Record<string, string | undefined>
): StoryCatalogFilterParams {
  return {
    q: raw.q,
    genre: raw.genre,
    subgenre: raw.subgenre,
    tag: raw.tag,
    character: raw.character,
    relationship: raw.relationship,
    narrativeStyle: raw.narrativeStyle,
    setting: raw.setting,
    experience: raw.experience,
    presentation: raw.presentation,
    contentType: raw.contentType,
    ageRating: raw.ageRating,
    monetization: raw.monetization,
    contentWarning: raw.contentWarning,
    storyStatus: raw.storyStatus,
    access: raw.access as StoryCatalogFilterParams["access"],
    hasWarning: raw.hasWarning as StoryCatalogFilterParams["hasWarning"],
    hasNewChapter: raw.hasNewChapter as StoryCatalogFilterParams["hasNewChapter"],
    sort: (raw.sort as StoryCatalogSort | undefined) ?? "updated",
    status: (raw.status as StoryCatalogStatus | undefined) ?? "all",
    page: raw.page ? Number(raw.page) : 1,
    pageSize: raw.pageSize ? Number(raw.pageSize) : undefined
  };
}
