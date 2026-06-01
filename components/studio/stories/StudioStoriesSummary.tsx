type StudioStoriesSummaryProps = {
  page: number;
  pageSize: number;
  pageStoryCount: number;
  totalCount: number;
  totalPages: number;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function StudioStoriesSummary({
  page,
  pageSize,
  pageStoryCount,
  totalCount,
  totalPages
}: StudioStoriesSummaryProps) {
  const countLabel =
    totalCount === 0
      ? "Không có truyện phù hợp"
      : totalCount === 1
        ? "1 truyện phù hợp"
        : `${formatCount(totalCount)} truyện phù hợp`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-zinc-300 md:text-sm">{countLabel}</p>
        {totalCount > 0 ? (
          <p className="text-[11px] text-zinc-500">
            {pageStoryCount} / {formatCount(totalCount)} trên trang · {pageSize}/trang
          </p>
        ) : null}
      </div>
      {totalCount > 0 ? (
        <p className="text-[11px] font-medium text-zinc-400 md:text-xs">
          Trang {page} / {totalPages}
        </p>
      ) : null}
    </div>
  );
}
