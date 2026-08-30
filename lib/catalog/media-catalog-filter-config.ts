import { buildMediaTaxonomyActiveChips } from "@/lib/media/media-catalog-filter-bridge";
import type { MediaHubParams } from "@/lib/media/media-query-params";
import type { MediaTabId } from "@/lib/media/media-tabs";
import type { CatalogFilterFacet, CatalogFilterOptions } from "@/lib/discovery/types";
import type { CatalogFilterShellConfig, CatalogQuickFilterDef } from "@/lib/catalog/types";

const AUDIO_SORT = [
  { id: "new", label: "Mới cập nhật" },
  { id: "popular", label: "Nghe nhiều" },
  { id: "hot", label: "Đang nổi" },
  { id: "saved", label: "Được lưu nhiều" },
  { id: "story_new", label: "Truyện vừa cập nhật" }
] as const;

const VIDEO_SORT = [
  { id: "new", label: "Mới cập nhật" },
  { id: "popular", label: "Xem nhiều" },
  { id: "hot", label: "Đang nổi" },
  { id: "saved", label: "Được lưu nhiều" },
  { id: "story_new", label: "Truyện vừa cập nhật" }
] as const;

const COMMON_QUICK: CatalogQuickFilterDef[] = [
  { id: "origin-original", label: "Truyện sáng tác", patch: { origin: "original" } },
  { id: "origin-translation", label: "Truyện dịch", patch: { origin: "translation" } },
  { id: "status-ongoing", label: "Đang ra", patch: { status: "ongoing" } },
  { id: "status-completed", label: "Hoàn thành", patch: { status: "completed" } }
];

const AUDIO_QUICK: CatalogQuickFilterDef[] = [
  { id: "audio-all", label: "Tất cả audio", patch: { audioSource: "all" } },
  { id: "audio-continuous", label: "Nghe liên tục", patch: { audioSource: "continuous" } },
  ...COMMON_QUICK
];

const VIDEO_QUICK: CatalogQuickFilterDef[] = [
  { id: "video-all", label: "Tất cả video", patch: { videoFilter: "all", relation: undefined } },
  {
    id: "video-adaptation",
    label: "Video chuyển thể",
    patch: { videoFilter: "all", relation: "official_adaptation" }
  },
  ...COMMON_QUICK
];

export function getMediaCatalogFilterConfig(tab: MediaTabId): CatalogFilterShellConfig {
  return {
    id: "media",
    searchPlaceholder:
      tab === "audio" ? "Audio, truyện, tác giả..." : "Video, truyện, tác giả...",
    defaultSort: "new",
    sortOptions: [...(tab === "audio" ? AUDIO_SORT : VIDEO_SORT)],
    quickFilters: tab === "audio" ? AUDIO_QUICK : VIDEO_QUICK
  };
}

function facetName(options: CatalogFilterFacet[], slug: string) {
  return options.find((item) => item.slug === slug)?.name ?? slug;
}

export function buildMediaActiveChips(
  params: MediaHubParams,
  buildHref: (patch: Partial<MediaHubParams>) => string,
  filterOptions?: CatalogFilterOptions
) {
  const chips: { key: string; label: string; clearHref: string }[] = [];

  if (params.q) {
    chips.push({
      key: "q",
      label: `Tìm: ${params.q}`,
      clearHref: buildHref({ q: "", page: 1 })
    });
  }

  if (params.origin === "original") {
    chips.push({
      key: "origin",
      label: "Truyện sáng tác",
      clearHref: buildHref({ origin: undefined, page: 1 })
    });
  } else if (params.origin === "translation") {
    chips.push({
      key: "origin",
      label: "Truyện dịch",
      clearHref: buildHref({ origin: undefined, page: 1 })
    });
  }

  if (params.status === "ongoing") {
    chips.push({
      key: "status",
      label: "Đang ra",
      clearHref: buildHref({ status: undefined, page: 1 })
    });
  } else if (params.status === "completed") {
    chips.push({
      key: "status",
      label: "Hoàn thành",
      clearHref: buildHref({ status: undefined, page: 1 })
    });
  }

  if (params.genre) {
    const name = filterOptions
      ? facetName(filterOptions.genres, params.genre)
      : params.genre;
    chips.push({
      key: "genre",
      label: name,
      clearHref: buildHref({ genre: undefined, page: 1 })
    });
  }

  if (filterOptions) {
    chips.push(...buildMediaTaxonomyActiveChips(params, filterOptions, buildHref));
  }

  if (params.tab === "video" && params.relation === "official_adaptation") {
    chips.push({
      key: "adaptation",
      label: "Video chuyển thể",
      clearHref: buildHref({ relation: undefined, page: 1 })
    });
  }

  if (params.tab === "audio" && params.audioSource === "continuous") {
    chips.push({
      key: "continuous",
      label: "Nghe liên tục",
      clearHref: buildHref({ audioSource: "all", page: 1 })
    });
  }

  return chips;
}
