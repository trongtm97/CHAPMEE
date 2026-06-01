"use client";

import Link from "next/link";

type Props = {
  hasFilters: boolean;
  canCreate: boolean;
  onClearFilters: () => void;
};

export function AnnouncementEmptyState({ hasFilters, canCreate, onClearFilters }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 px-6 py-12 text-center">
      <p className="text-base font-medium text-zinc-200">
        {hasFilters ? "Chưa có thông báo phù hợp bộ lọc." : "Chưa có thông báo nền tảng."}
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        Thông báo chính thức khác notification campaign — dùng cho bảo trì, chính sách, tính năng.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {canCreate ? (
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
            href="/admin/announcements/new"
          >
            Tạo thông báo đầu tiên
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
        <Link
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          href="/admin/announcements/new#types-guide"
        >
          Xem hướng dẫn loại thông báo
        </Link>
      </div>
    </div>
  );
}
