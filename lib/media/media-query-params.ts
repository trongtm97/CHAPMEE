import { parseMediaTab, type MediaTabId } from "@/lib/media/media-tabs";
import { readSearchParam } from "@/lib/media/media-tabs";
import { readExtendedCatalogParams } from "@/lib/stories/story-query-params";

export type MediaSortId = "new" | "popular" | "saved" | "hot" | "story_new";

export type MediaOriginFilter = "original" | "translation";

export type MediaStoryStatusFilter = "completed" | "ongoing";

export type MediaAudioSourceFilter =
  | "all"
  | "external_audio_url"
  | "youtube_embed"
  | "continuous"
  | "source_ok";

export type MediaVideoFilter =
  | "all"
  | "youtube"
  | "chapmee_source"
  | "adaptation"
  | "new";

export type MediaHubParams = {
  tab: MediaTabId;
  page: number;
  pageSize: number;
  q: string;
  sort: MediaSortId;
  origin?: MediaOriginFilter;
  status?: MediaStoryStatusFilter;
  genre?: string;
  subgenre?: string;
  tag?: string;
  character?: string;
  relationship?: string;
  narrativeStyle?: string;
  mood?: string;
  setting?: string;
  format?: string;
  contentType?: string;
  ageRating?: string;
  contentWarning?: string;
  storyStatus?: string;
  audioSource: MediaAudioSourceFilter;
  videoFilter: MediaVideoFilter;
  relation?: string;
};

const DEFAULT_PAGE_SIZE = 12;

const SORT_VALUES = new Set<MediaSortId>(["new", "popular", "saved", "hot", "story_new"]);

export function parseMediaSort(raw: string | undefined): MediaSortId {
  const value = raw?.trim().toLowerCase();
  if (value && SORT_VALUES.has(value as MediaSortId)) {
    return value as MediaSortId;
  }
  return "new";
}

export function parseMediaHubParams(
  raw: Record<string, string | string[] | undefined>
): MediaHubParams {
  const tab = parseMediaTab(readSearchParam(raw.tab));
  const page = Math.max(1, Number(readSearchParam(raw.page) || "1") || 1);
  const pageSizeRaw = Number(readSearchParam(raw.pageSize) || DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(24, Math.max(6, Number.isFinite(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE));
  const q = readSearchParam(raw.q).trim();
  const sort = parseMediaSort(readSearchParam(raw.sort));

  const originRaw = readSearchParam(raw.origin).toLowerCase();
  const origin =
    originRaw === "original"
      ? "original"
      : originRaw === "translation" || originRaw === "translated"
        ? "translation"
        : undefined;

  const statusRaw = readSearchParam(raw.status).toLowerCase();
  const status =
    statusRaw === "completed" ? "completed" : statusRaw === "ongoing" ? "ongoing" : undefined;

  const genre = readSearchParam(raw.genre).trim() || undefined;
  const extended = readExtendedCatalogParams({
    category: readSearchParam(raw.category),
    subgenre: readSearchParam(raw.subgenre),
    mood: readSearchParam(raw.mood),
    experience: readSearchParam(raw.experience),
    format: readSearchParam(raw.format),
    presentation: readSearchParam(raw.presentation),
    setting: readSearchParam(raw.setting),
    tag: readSearchParam(raw.tag)
  });
  const subgenre = extended.subgenre;
  const tag = extended.tag;
  const mood = extended.experience;
  const setting = extended.setting;
  const format = extended.presentation;
  const character = readSearchParam(raw.character).trim() || undefined;
  const relationship = readSearchParam(raw.relationship).trim() || undefined;
  const narrativeStyle = readSearchParam(raw.narrativeStyle).trim() || undefined;
  const contentType = readSearchParam(raw.contentType).trim() || undefined;
  const ageRating = readSearchParam(raw.ageRating).trim() || undefined;
  const contentWarning = readSearchParam(raw.contentWarning).trim() || undefined;
  const storyStatus = readSearchParam(raw.storyStatus).trim() || undefined;

  let audioSource: MediaAudioSourceFilter = "all";
  const source = readSearchParam(raw.source);
  const continuousRaw = readSearchParam(raw.continuous).toLowerCase();
  if (source === "external_audio_url" || source === "youtube_embed") {
    audioSource = source;
  } else if (continuousRaw === "1" || continuousRaw === "true") {
    audioSource = "continuous";
  } else if (readSearchParam(raw.source_ok) === "1") {
    audioSource = "source_ok";
  }

  const relation = readSearchParam(raw.relation).trim() || undefined;
  let videoFilter: MediaVideoFilter = "all";
  if (readSearchParam(raw.chapmee_source) === "1") {
    videoFilter = "chapmee_source";
  } else if (readSearchParam(raw.youtube) === "1") {
    videoFilter = "youtube";
  } else if (readSearchParam(raw.filter) === "new") {
    videoFilter = "new";
  } else if (relation) {
    videoFilter = "adaptation";
  }

  return {
    tab,
    page,
    pageSize,
    q,
    sort,
    origin,
    status,
    genre,
    subgenre,
    tag,
    character,
    relationship,
    narrativeStyle,
    mood,
    setting,
    format,
    contentType,
    ageRating,
    contentWarning,
    storyStatus,
    audioSource,
    videoFilter,
    relation
  };
}

function isDefaultSort(sort: MediaSortId, tab: MediaTabId): boolean {
  return sort === "new";
}

/** Build /media URL omitting default params. */
export function buildMediaHubHref(
  tab: MediaTabId,
  input: Partial<MediaHubParams> & { page?: number }
): string {
  const params = new URLSearchParams();
  params.set("tab", tab);

  const page = input.page ?? 1;
  if (page > 1) {
    params.set("page", String(page));
  }

  const pageSize = input.pageSize;
  if (pageSize && pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(pageSize));
  }

  if (input.q?.trim()) {
    params.set("q", input.q.trim());
  }

  const sort = input.sort ?? "new";
  if (!isDefaultSort(sort, tab)) {
    params.set("sort", sort);
  }

  if (input.origin) {
    params.set("origin", input.origin === "translation" ? "translation" : "original");
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.genre?.trim()) {
    params.set("genre", input.genre.trim());
  }
  if (input.subgenre?.trim()) {
    params.set("category", input.subgenre.trim());
  }
  if (input.tag?.trim()) {
    params.set("tag", input.tag.trim());
  }
  if (input.character?.trim()) {
    params.set("character", input.character.trim());
  }
  if (input.relationship?.trim()) {
    params.set("relationship", input.relationship.trim());
  }
  if (input.narrativeStyle?.trim()) {
    params.set("narrativeStyle", input.narrativeStyle.trim());
  }
  if (input.mood?.trim()) {
    params.set("mood", input.mood.trim());
  }
  if (input.setting?.trim()) {
    params.set("setting", input.setting.trim());
  }
  if (input.format?.trim()) {
    params.set("format", input.format.trim());
  }
  if (input.contentType?.trim()) {
    params.set("contentType", input.contentType.trim());
  }
  if (input.ageRating?.trim()) {
    params.set("ageRating", input.ageRating.trim());
  }
  if (input.contentWarning?.trim()) {
    params.set("contentWarning", input.contentWarning.trim());
  }
  if (input.storyStatus?.trim()) {
    params.set("storyStatus", input.storyStatus.trim());
  }

  if (tab === "audio") {
    const audioSource = input.audioSource ?? "all";
    if (audioSource === "external_audio_url" || audioSource === "youtube_embed") {
      params.set("source", audioSource);
    } else if (audioSource === "continuous") {
      params.set("continuous", "true");
    } else if (audioSource === "source_ok") {
      params.set("source_ok", "1");
    }
  } else {
    const videoFilter = input.videoFilter ?? "all";
    if (videoFilter === "chapmee_source") {
      params.set("chapmee_source", "1");
    } else if (videoFilter === "new") {
      params.set("filter", "new");
      params.set("sort", "new");
    } else if (videoFilter === "youtube") {
      params.set("youtube", "1");
    } else if (input.relation?.trim()) {
      params.set("relation", input.relation.trim());
    }
    if (videoFilter === "adaptation" && input.relation?.trim()) {
      params.set("relation", input.relation.trim());
    }
  }

  const qs = params.toString();
  return qs ? `/media?${qs}` : "/media";
}

export function mediaHubParamsToQueryRecord(params: MediaHubParams): Record<string, string | undefined> {
  return {
    page: params.page > 1 ? String(params.page) : undefined,
    pageSize: params.pageSize !== DEFAULT_PAGE_SIZE ? String(params.pageSize) : undefined,
    q: params.q || undefined,
    sort: isDefaultSort(params.sort, params.tab) ? undefined : params.sort,
    origin: params.origin,
    status: params.status,
    genre: params.genre,
    source:
      params.tab === "audio" &&
      (params.audioSource === "external_audio_url" || params.audioSource === "youtube_embed")
        ? params.audioSource
        : undefined,
    continuous: params.tab === "audio" && params.audioSource === "continuous" ? "true" : undefined,
    subgenre: params.subgenre,
    tag: params.tag,
    character: params.character,
    relationship: params.relationship,
    narrativeStyle: params.narrativeStyle,
    mood: params.mood,
    setting: params.setting,
    format: params.format,
    contentType: params.contentType,
    ageRating: params.ageRating,
    contentWarning: params.contentWarning,
    storyStatus: params.storyStatus,
    source_ok: params.tab === "audio" && params.audioSource === "source_ok" ? "1" : undefined,
    chapmee_source:
      params.tab === "video" && params.videoFilter === "chapmee_source" ? "1" : undefined,
    youtube: params.tab === "video" && params.videoFilter === "youtube" ? "1" : undefined,
    filter: params.tab === "video" && params.videoFilter === "new" ? "new" : undefined,
    relation: params.tab === "video" && params.relation ? params.relation : undefined
  };
}

export function hasActiveMediaFilters(params: MediaHubParams): boolean {
  return Boolean(
    params.q ||
      !isDefaultSort(params.sort, params.tab) ||
      params.origin ||
      params.status ||
      params.genre ||
      params.subgenre ||
      params.tag ||
      params.character ||
      params.relationship ||
      params.narrativeStyle ||
      params.mood ||
      params.setting ||
      params.format ||
      params.contentType ||
      params.ageRating ||
      params.contentWarning ||
      params.storyStatus ||
      (params.tab === "audio" && params.audioSource !== "all") ||
      (params.tab === "video" &&
        (params.videoFilter !== "all" || Boolean(params.relation)))
  );
}

export const MEDIA_PAGE_SIZE_DEFAULT = DEFAULT_PAGE_SIZE;
