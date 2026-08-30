import type { StoryCatalogSort } from "@/types/story";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";

/** URL-facing origin filter (distinct from DB `content_origin`). */
export type StoryOriginUrlValue = "original" | "translated";

const SORT_FROM_URL: Record<string, StoryCatalogSort> = {
  updated: "updated",
  newest: "new",
  new: "new",
  popular: "reads",
  reads: "reads",
  saved: "saved",
  recommended: "saved",
  rising: "hot",
  hot: "hot",
  completed: "completed",
  title: "title",
  quick: "quick",
  chapters: "chapters",
  price_asc: "price_asc",
  price_desc: "price_desc",
  chapter_price_asc: "chapter_price_asc",
  chapter_price_desc: "chapter_price_desc"
};

const SORT_TO_URL: Partial<Record<StoryCatalogSort, string>> = {
  updated: "updated",
  new: "newest",
  reads: "popular",
  saved: "saved",
  hot: "rising",
  completed: "completed",
  title: "title",
  quick: "quick",
  chapters: "chapters",
  price_asc: "price_asc",
  price_desc: "price_desc",
  chapter_price_asc: "chapter_price_asc",
  chapter_price_desc: "chapter_price_desc"
};

export function parseCatalogSortParam(raw: string | undefined): StoryCatalogSort {
  if (!raw?.trim()) {
    return "updated";
  }
  const key = raw.trim().toLowerCase();
  return SORT_FROM_URL[key] ?? (key as StoryCatalogSort);
}

export function serializeCatalogSortParam(sort: StoryCatalogSort | undefined): string | undefined {
  if (!sort || sort === "updated") {
    return undefined;
  }
  return SORT_TO_URL[sort] ?? sort;
}

export function parseOriginUrlParam(
  raw: Record<string, string | undefined>
): StoryCatalogFilterParams["contentOrigin"] {
  const origin = raw.origin?.trim().toLowerCase();
  if (origin === "original") return "original";
  if (origin === "translated" || origin === "translation") return "translation";

  const legacy = raw.contentOrigin?.trim().toLowerCase();
  if (legacy === "original") return "original";
  if (legacy === "translation") return "translation";

  return undefined;
}

export function serializeOriginUrlParam(
  contentOrigin: StoryCatalogFilterParams["contentOrigin"]
): StoryOriginUrlValue | undefined {
  if (contentOrigin === "original") return "original";
  if (contentOrigin === "translation") return "translated";
  return undefined;
}

export function parseTriStateMediaParam(
  raw: string | undefined
): StoryCatalogFilterParams["hasAudio"] {
  if (!raw?.trim()) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "yes" || value === "1") return "yes";
  if (value === "false" || value === "no" || value === "0") return "no";
  return undefined;
}

export function serializeTriStateMediaParam(
  value: StoryCatalogFilterParams["hasAudio"]
): "true" | "false" | undefined {
  if (value === "yes") return "true";
  if (value === "no") return "false";
  return undefined;
}

/** Read extended catalog params from URL (supports legacy + canonical names). */
export function readExtendedCatalogParams(raw: Record<string, string | undefined>) {
  return {
    subgenre: raw.category?.trim() || raw.subgenre?.trim() || undefined,
    experience: raw.mood?.trim() || raw.experience?.trim() || undefined,
    presentation: raw.format?.trim() || raw.presentation?.trim() || undefined,
    setting: raw.setting?.trim() || undefined,
    tag: raw.tag?.trim() || undefined
  };
}

export function writeExtendedCatalogParams(params: StoryCatalogFilterParams, search: URLSearchParams) {
  if (params.subgenre?.trim()) search.set("category", params.subgenre.trim());
  if (params.experience?.trim()) search.set("mood", params.experience.trim());
  if (params.presentation?.trim()) search.set("format", params.presentation.trim());
  if (params.setting?.trim()) search.set("setting", params.setting.trim());
  if (params.tag?.trim()) search.set("tag", params.tag.trim());
}
