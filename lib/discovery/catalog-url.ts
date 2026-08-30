import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

import type { StoryCatalogFilterParams } from "@/lib/discovery/types";

import {

  parseCatalogSortParam,

  parseOriginUrlParam,

  parseTriStateMediaParam,

  readExtendedCatalogParams,

  serializeCatalogSortParam,

  serializeOriginUrlParam,

  serializeTriStateMediaParam,

  writeExtendedCatalogParams

} from "@/lib/stories/story-query-params";



export type { StoryCatalogFilterParams };



export const DEFAULT_CATALOG_URL_PAGE_SIZE = 24;



export function buildCatalogHref(params: StoryCatalogFilterParams = {}) {

  const search = new URLSearchParams();

  if (params.q?.trim()) search.set("q", params.q.trim());



  const origin = serializeOriginUrlParam(params.contentOrigin);

  if (origin) search.set("origin", origin);



  if (params.genre?.trim()) search.set("genre", params.genre.trim());

  writeExtendedCatalogParams(params, search);



  if (params.character?.trim()) search.set("character", params.character.trim());

  if (params.relationship?.trim()) search.set("relationship", params.relationship.trim());

  if (params.narrativeStyle?.trim()) search.set("narrativeStyle", params.narrativeStyle.trim());

  if (params.contentType?.trim()) search.set("contentType", params.contentType.trim());

  if (params.ageRating?.trim()) search.set("ageRating", params.ageRating.trim());

  if (params.monetization?.trim()) search.set("monetization", params.monetization.trim());

  if (params.contentWarning?.trim()) search.set("contentWarning", params.contentWarning.trim());

  if (params.storyStatus?.trim()) search.set("storyStatus", params.storyStatus.trim());

  if (params.access) search.set("access", params.access);

  if (params.hasWarning) search.set("hasWarning", params.hasWarning);

  if (params.hasNewChapter) search.set("hasNewChapter", params.hasNewChapter);



  const hasAudio = serializeTriStateMediaParam(params.hasAudio);

  if (hasAudio) search.set("hasAudio", hasAudio);

  const hasVideo = serializeTriStateMediaParam(params.hasVideo);

  if (hasVideo) search.set("hasVideo", hasVideo);



  if (params.status && params.status !== "all") search.set("status", params.status);



  const sort = serializeCatalogSortParam(params.sort);

  if (sort) search.set("sort", sort);



  if (params.page && params.page > 1) search.set("page", String(params.page));

  if (params.pageSize && params.pageSize > 0 && params.pageSize !== DEFAULT_CATALOG_URL_PAGE_SIZE) {

    search.set("pageSize", String(params.pageSize));

  }



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

    params.hasAudio,

    params.hasVideo,

    params.q

  ];

  return filterKeys.some((value) => Boolean(value?.trim()));

}



export function parseCatalogSearchParams(

  raw: Record<string, string | undefined>

): StoryCatalogFilterParams {

  const extended = readExtendedCatalogParams(raw);



  return {

    q: raw.q,

    genre: raw.genre,

    subgenre: extended.subgenre,

    tag: extended.tag,

    character: raw.character,

    relationship: raw.relationship,

    narrativeStyle: raw.narrativeStyle,

    setting: extended.setting,

    experience: extended.experience,

    presentation: extended.presentation,

    contentType: raw.contentType,

    ageRating: raw.ageRating,

    monetization: raw.monetization,

    contentWarning: raw.contentWarning,

    storyStatus: raw.storyStatus,

    contentOrigin: parseOriginUrlParam(raw),

    access: raw.access as StoryCatalogFilterParams["access"],

    hasWarning: raw.hasWarning as StoryCatalogFilterParams["hasWarning"],

    hasNewChapter: raw.hasNewChapter as StoryCatalogFilterParams["hasNewChapter"],

    hasAudio: parseTriStateMediaParam(raw.hasAudio),

    hasVideo: parseTriStateMediaParam(raw.hasVideo),

    sort: parseCatalogSortParam(raw.sort),

    status: (raw.status as StoryCatalogStatus | undefined) ?? "all",

    page: raw.page ? Number(raw.page) : 1,

    pageSize: raw.pageSize ? Number(raw.pageSize) : undefined

  };

}


