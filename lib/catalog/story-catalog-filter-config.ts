import type { CatalogFilterShellConfig } from "@/lib/catalog/types";
import type { StoryCatalogSort } from "@/types/story";

export const STORY_CATALOG_SORT_OPTIONS: Array<{ value: StoryCatalogSort; label: string }> = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "new", label: "Mới đăng" },
  { value: "reads", label: "Đọc nhiều" },
  { value: "saved", label: "Lưu nhiều" },
  { value: "hot", label: "Đang lên" },
  { value: "completed", label: "Hoàn thành" }
];

export const storyCatalogFilterConfig: CatalogFilterShellConfig = {
  id: "story",
  searchPlaceholder: "Tìm truyện, tác giả, thể loại, tag...",
  defaultSort: "updated",
  sortOptions: STORY_CATALOG_SORT_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
  quickFilters: [
    { id: "all", label: "Tất cả", patch: { contentOrigin: undefined, status: "all", hasAudio: undefined, hasVideo: undefined } },
    { id: "origin-original", label: "Truyện sáng tác", patch: { contentOrigin: "original" } },
    { id: "origin-translation", label: "Truyện dịch", patch: { contentOrigin: "translation" } },
    { id: "status-ongoing", label: "Đang ra", patch: { status: "ongoing" } },
    { id: "status-completed", label: "Hoàn thành", patch: { status: "completed" } },
    { id: "has-audio", label: "Có audio", patch: { hasAudio: "yes" } },
    { id: "has-video", label: "Có video", patch: { hasVideo: "yes" } }
  ],
  advancedFields: [
    { id: "genre", label: "Thể loại", paramKey: "genre" },
    { id: "experience", label: "Cảm giác", paramKey: "experience" },
    { id: "setting", label: "Bối cảnh", paramKey: "setting" },
    { id: "presentation", label: "Format", paramKey: "presentation" },
    { id: "tag", label: "Tag", paramKey: "tag" }
  ]
};
