import { buildCatalogHref } from "@/lib/discovery/catalog-url";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";

export type ActiveCatalogFilterChip = {
  key: string;
  label: string;
  clearHref: string;
};

function facetName(
  options: CatalogFilterOptions,
  list: keyof Pick<
    CatalogFilterOptions,
    | "subgenres"
    | "tags"
    | "characters"
    | "relationships"
    | "narrativeStyles"
    | "settings"
    | "experiences"
    | "presentations"
    | "contentTypes"
    | "ageRatings"
    | "monetizationAccess"
    | "contentWarnings"
    | "storyStatuses"
  >,
  slug: string
) {
  const match = options[list]?.find((item) => item.slug === slug);
  return match?.name ?? slug;
}

function withoutKey(
  filters: StoryCatalogFilterParams,
  key: keyof StoryCatalogFilterParams,
  query: string
): string {
  const next = { ...filters };
  delete next[key];
  return buildCatalogHref({ ...next, q: query || next.q, page: 1 });
}

export function buildActiveCatalogFilterChips(
  filters: StoryCatalogFilterParams,
  options: CatalogFilterOptions,
  query: string
): ActiveCatalogFilterChip[] {
  const chips: ActiveCatalogFilterChip[] = [];

  if (filters.subgenre) {
    chips.push({
      key: "subgenre",
      label: `Thể loại phụ: ${facetName(options, "subgenres", filters.subgenre)}`,
      clearHref: withoutKey(filters, "subgenre", query)
    });
  }
  if (filters.tag) {
    chips.push({
      key: "tag",
      label: `Tag: ${facetName(options, "tags", filters.tag)}`,
      clearHref: withoutKey(filters, "tag", query)
    });
  }
  if (filters.character) {
    chips.push({
      key: "character",
      label: `Nhân vật: ${facetName(options, "characters", filters.character)}`,
      clearHref: withoutKey(filters, "character", query)
    });
  }
  if (filters.relationship) {
    chips.push({
      key: "relationship",
      label: `Quan hệ: ${facetName(options, "relationships", filters.relationship)}`,
      clearHref: withoutKey(filters, "relationship", query)
    });
  }
  if (filters.narrativeStyle) {
    chips.push({
      key: "narrativeStyle",
      label: `Phong cách: ${facetName(options, "narrativeStyles", filters.narrativeStyle)}`,
      clearHref: withoutKey(filters, "narrativeStyle", query)
    });
  }
  if (filters.setting) {
    chips.push({
      key: "setting",
      label: `Bối cảnh: ${facetName(options, "settings", filters.setting)}`,
      clearHref: withoutKey(filters, "setting", query)
    });
  }
  if (filters.experience) {
    chips.push({
      key: "experience",
      label: `Cảm giác: ${facetName(options, "experiences", filters.experience)}`,
      clearHref: withoutKey(filters, "experience", query)
    });
  }
  if (filters.presentation) {
    chips.push({
      key: "presentation",
      label: `Format: ${facetName(options, "presentations", filters.presentation)}`,
      clearHref: withoutKey(filters, "presentation", query)
    });
  }
  if (filters.contentType) {
    chips.push({
      key: "contentType",
      label: `Loại: ${facetName(options, "contentTypes", filters.contentType)}`,
      clearHref: withoutKey(filters, "contentType", query)
    });
  }
  if (filters.ageRating) {
    chips.push({
      key: "ageRating",
      label: `Độ tuổi: ${facetName(options, "ageRatings", filters.ageRating)}`,
      clearHref: withoutKey(filters, "ageRating", query)
    });
  }
  if (filters.monetization) {
    chips.push({
      key: "monetization",
      label: `Truy cập: ${facetName(options, "monetizationAccess", filters.monetization)}`,
      clearHref: withoutKey(filters, "monetization", query)
    });
  }
  if (filters.contentWarning) {
    chips.push({
      key: "contentWarning",
      label: `Cảnh báo: ${facetName(options, "contentWarnings", filters.contentWarning)}`,
      clearHref: withoutKey(filters, "contentWarning", query)
    });
  }
  if (filters.storyStatus) {
    chips.push({
      key: "storyStatus",
      label: `Trạng thái: ${facetName(options, "storyStatuses", filters.storyStatus)}`,
      clearHref: withoutKey(filters, "storyStatus", query)
    });
  }
  if (filters.access) {
    const accessLabels: Record<string, string> = {
      free: "Miễn phí",
      paid: "Trả phí",
      free_chapters: "Có chương miễn phí",
      full_access: "Bán trọn bộ"
    };
    chips.push({
      key: "access",
      label: accessLabels[filters.access] ?? filters.access,
      clearHref: withoutKey(filters, "access", query)
    });
  }
  if (filters.hasNewChapter === "yes") {
    chips.push({
      key: "hasNewChapter",
      label: "Có chương mới",
      clearHref: withoutKey(filters, "hasNewChapter", query)
    });
  }
  if (filters.hasWarning === "yes") {
    chips.push({
      key: "hasWarning",
      label: "Có cảnh báo nội dung",
      clearHref: withoutKey(filters, "hasWarning", query)
    });
  }
  if (filters.hasAudio === "yes") {
    chips.push({
      key: "hasAudio",
      label: "Có audio",
      clearHref: withoutKey(filters, "hasAudio", query)
    });
  }
  if (filters.hasVideo === "yes") {
    chips.push({
      key: "hasVideo",
      label: "Có video",
      clearHref: withoutKey(filters, "hasVideo", query)
    });
  }
  if (filters.contentOrigin === "original") {
    chips.push({
      key: "contentOrigin",
      label: "Truyện sáng tác",
      clearHref: withoutKey(filters, "contentOrigin", query)
    });
  }
  if (filters.contentOrigin === "translation") {
    chips.push({
      key: "contentOrigin",
      label: "Truyện dịch",
      clearHref: withoutKey(filters, "contentOrigin", query)
    });
  }
  if (filters.genre) {
    const genreName =
      options.genres.find((item) => item.slug === filters.genre)?.name ?? filters.genre;
    chips.push({
      key: "genre",
      label: genreName ?? filters.genre,
      clearHref: withoutKey(filters, "genre", query)
    });
  }
  if (filters.status && filters.status !== "all") {
    chips.push({
      key: "status",
      label: filters.status === "completed" ? "Hoàn thành" : "Đang ra",
      clearHref: withoutKey(filters, "status", query)
    });
  }

  return chips;
}
