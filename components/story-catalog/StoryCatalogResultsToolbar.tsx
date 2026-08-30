import { formatCatalogCount } from "@/lib/stories/story-catalog-query";

type StoryCatalogResultsToolbarProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function StoryCatalogResultsToolbar({
  page,
  pageSize,
  totalCount,
  totalPages
}: StoryCatalogResultsToolbarProps) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  const leftLabel =
    totalCount === 0
      ? "Không có truyện phù hợp"
      : totalCount === 1
        ? "1 truyện phù hợp"
        : `${formatCatalogCount(totalCount)} truyện phù hợp`;

  const rangeLabel =
    totalCount > 0
      ? `Hiển thị ${formatCatalogCount(start)}–${formatCatalogCount(end)} trong ${formatCatalogCount(totalCount)} truyện`
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-white/8 pb-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-300">{leftLabel}</p>
        {rangeLabel ? <p className="text-[11px] text-zinc-500">{rangeLabel}</p> : null}
      </div>
      {totalCount > 0 ? (
        <p className="shrink-0 text-[11px] font-medium text-zinc-500">
          Trang {page} / {totalPages}
        </p>
      ) : null}
    </div>
  );
}
