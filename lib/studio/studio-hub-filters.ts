import { parseStudioPage } from "@/lib/studio/pagination";
import { STUDIO_CHAPTER_PAGE_SIZES } from "@/types/studio";

export const STUDIO_HUB_PAGE_SIZE_DEFAULT = 25;

export function getStudioHubSearch(value?: string) {
  return value?.trim() ?? "";
}

export function normalizeStudioHubPageSize(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (STUDIO_CHAPTER_PAGE_SIZES.includes(parsed as (typeof STUDIO_CHAPTER_PAGE_SIZES)[number])) {
    return parsed;
  }
  return STUDIO_HUB_PAGE_SIZE_DEFAULT;
}

export function parseStudioHubPage(value?: string) {
  return parseStudioPage(value);
}

export function sanitizeIlikePattern(value: string) {
  return value.replace(/[%_]/g, "");
}

export type StudioHubMediaTab = "images" | "video";

export function normalizeStudioHubMediaTab(value?: string): StudioHubMediaTab {
  return value === "video" ? "video" : "images";
}

export type StudioAudioHubStatusFilter = "all" | "published" | "draft" | "pending_review";

export function normalizeStudioAudioHubStatus(value?: string): StudioAudioHubStatusFilter {
  if (value === "published" || value === "draft" || value === "pending_review") {
    return value;
  }
  return "all";
}
