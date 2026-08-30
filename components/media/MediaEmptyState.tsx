import { CatalogEmptyState } from "@/components/catalog/CatalogEmptyState";
import { buildMediaHubHref } from "@/lib/media/media-query-params";
import type { MediaHubParams } from "@/lib/media/media-query-params";

type MediaEmptyStateProps = {
  params: MediaHubParams;
  hasFilters: boolean;
};

export function MediaEmptyState({ params, hasFilters }: MediaEmptyStateProps) {
  const isAudio = params.tab === "audio";

  return (
    <CatalogEmptyState
      clearFiltersHref={buildMediaHubHref(params.tab, {
        tab: params.tab,
        page: 1,
        sort: "new",
        audioSource: "all",
        videoFilter: "all"
      })}
      compact
      description={
        isAudio
          ? "Bạn có thể khám phá truyện mới trong lúc audio được bổ sung."
          : "Video chuyển thể sẽ xuất hiện khi có nội dung phù hợp từ các truyện trên ChapMee."
      }
      filterDescription="Thử xóa bớt bộ lọc hoặc đổi từ khóa tìm kiếm."
      hasFilters={hasFilters}
      primaryCta={{ label: "Khám phá truyện", href: "/discover" }}
      secondaryCta={
        isAudio
          ? { label: "Xem truyện mới cập nhật", href: "/discover?sort=newest" }
          : { label: "Xem truyện nổi bật", href: "/bang-xep-hang" }
      }
      title={isAudio ? "Chưa có audio truyện phù hợp" : "Chưa có video phù hợp"}
    />
  );
}
