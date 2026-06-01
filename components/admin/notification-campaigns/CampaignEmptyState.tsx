"use client";

import Link from "next/link";

type Props = {
  canCreate: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
};

export function CampaignEmptyState({ canCreate, hasFilters, onClearFilters }: Props) {
  if (hasFilters) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 px-6 py-14 text-center">
        <h3 className="text-lg font-semibold text-white">Không có campaign phù hợp</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Thử đổi bộ lọc hoặc tìm kiếm với từ khóa khác.
        </p>
        <button
          className="mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
          onClick={onClearFilters}
          type="button"
        >
          Xóa bộ lọc
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-cyan-400/20 bg-cyan-400/5 px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-white">Chưa có campaign nào</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        Tạo campaign để gửi thông báo đúng nhóm người dùng, không gửi tràn lan.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {canCreate ? (
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
            href="/admin/notifications/new"
          >
            Tạo campaign
          </Link>
        ) : null}
        <Link
          className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
          href="/admin/content-hub"
        >
          Xem hướng dẫn
        </Link>
      </div>
    </div>
  );
}
