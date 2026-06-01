"use client";

import Link from "next/link";

type Props = {
  hasFilters: boolean;
  canCreate: boolean;
  onClearFilters: () => void;
};

export function ContentPostEmptyState({ hasFilters, canCreate, onClearFilters }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 px-6 py-10 text-center">
      <p className="text-base font-medium text-zinc-200">
        {hasFilters ? "Chưa có bài viết phù hợp bộ lọc." : "Chưa có bài viết nào."}
      </p>
      <ul className="mx-auto mt-4 max-w-sm space-y-1 text-left text-xs text-zinc-500">
        <li>• Viết tiêu đề rõ ràng</li>
        <li>• Chọn loại bài phù hợp</li>
        <li>• Kiểm tra SEO trước khi đăng</li>
        <li>• Xuất bản hoặc lên lịch</li>
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {canCreate ? (
          <Link
            className="inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
            href="/admin/content-hub/new"
          >
            Tạo bài viết
          </Link>
        ) : null}
        {hasFilters ? (
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
            onClick={onClearFilters}
            type="button"
          >
            Xóa bộ lọc
          </button>
        ) : null}
      </div>
    </div>
  );
}
