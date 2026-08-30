type MediaResultsToolbarProps = {
  tab: "audio" | "video";
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function MediaResultsToolbar({
  tab,
  totalCount,
  page,
  pageSize,
  totalPages
}: MediaResultsToolbarProps) {
  const kind = tab === "audio" ? "audio" : "video";
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
      <p>
        {totalCount === 0 ? (
          <>
            0 {kind} phù hợp
          </>
        ) : (
          <>
            Hiển thị {start.toLocaleString("vi-VN")}–{end.toLocaleString("vi-VN")} trong{" "}
            {totalCount.toLocaleString("vi-VN")} {kind} phù hợp
          </>
        )}
      </p>
      <p className="shrink-0 tabular-nums">
        Trang {page.toLocaleString("vi-VN")} / {totalPages.toLocaleString("vi-VN")}
      </p>
    </div>
  );
}
