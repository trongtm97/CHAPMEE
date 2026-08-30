import type { StoryCatalogFilterParams } from "@/lib/discovery/types";

export type StoryOriginFilter = "all" | "original" | "translated";

export type DbContentOrigin = "original" | "translation";

/** Parse URL `origin` or legacy `contentOrigin` into a filter value. */
export function parseStoryOriginFilter(raw: {
  origin?: string;
  contentOrigin?: string;
}): StoryOriginFilter {
  const origin = raw.origin?.trim().toLowerCase();
  if (origin === "original") return "original";
  if (origin === "translated" || origin === "translation") return "translated";
  if (origin === "all") return "all";

  const legacy = raw.contentOrigin?.trim().toLowerCase();
  if (legacy === "original") return "original";
  if (legacy === "translation") return "translated";

  return "all";
}

export function toDbContentOrigin(
  origin: StoryOriginFilter
): DbContentOrigin | undefined {
  if (origin === "original") return "original";
  if (origin === "translated") return "translation";
  return undefined;
}

export function fromDbContentOrigin(
  value: string | null | undefined
): "original" | "translated" {
  if (value === "translation" || value === "translated") return "translated";
  return "original";
}

/** Canonical DB value for stories / discover cards. */
export function normalizeDbContentOrigin(
  value: string | null | undefined
): DbContentOrigin {
  return fromDbContentOrigin(value) === "translated" ? "translation" : "original";
}

// ponytail: self-check — fails if legacy `translated` stops mapping to translation
if (process.env.CHAPMEE_ASSERT_STORY_ORIGIN === "1") {
  console.assert(normalizeDbContentOrigin("translated") === "translation");
  console.assert(normalizeDbContentOrigin("translation") === "translation");
  console.assert(normalizeDbContentOrigin("original") === "original");
}

export function toStoryOriginQueryValue(
  contentOrigin: StoryCatalogFilterParams["contentOrigin"]
): "original" | "translated" | undefined {
  if (contentOrigin === "original") return "original";
  if (contentOrigin === "translation") return "translated";
  return undefined;
}
