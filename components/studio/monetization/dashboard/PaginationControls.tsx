"use client";

import { MonetizationTableButton } from "@/components/studio/monetization/monetization-ui";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  disabled
}: PaginationControlsProps) {
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-zinc-500">
        Hiển thị {from}–{to} / {totalCount.toLocaleString("vi-VN")}
      </p>
      <div className="flex items-center gap-2">
        <MonetizationTableButton
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          tone="slate"
        >
          Trước
        </MonetizationTableButton>
        <span className="text-xs text-zinc-400">
          Trang {page}/{totalPages}
        </span>
        <MonetizationTableButton
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          tone="slate"
        >
          Sau
        </MonetizationTableButton>
      </div>
    </div>
  );
}
