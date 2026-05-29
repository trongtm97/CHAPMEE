import { formatCatalogCount } from "@/lib/stories/story-catalog-query";

type StoryCatalogSummaryProps = {
  totalCount: number;
  page: number;
  totalPages: number;
};

export function StoryCatalogSummary({ page, totalCount, totalPages }: StoryCatalogSummaryProps) {
  const countLabel =
    totalCount === 0
      ? "Không có truyện phù hợp"
      : totalCount === 1
        ? "1 truyện phù hợp"
        : `${formatCatalogCount(totalCount)} truyện phù hợp`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-zinc-500 md:text-xs">{countLabel}</p>
      {totalCount > 0 ? (
        <p className="text-[11px] font-medium text-zinc-400 md:text-xs">
          Trang {page} / {totalPages}
        </p>
      ) : null}
    </div>
  );
}
