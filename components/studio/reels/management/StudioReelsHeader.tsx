"use client";

import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import {
  reelsBtnPrimary,
  reelsBtnSecondary
} from "@/components/studio/reels/management/shared/styles";
import type { ReelsStudioStats } from "@/types/reels";

type StudioReelsHeaderProps = {
  onCreateClick: () => void;
  stats: ReelsStudioStats;
};

export function StudioReelsHeader({
  onCreateClick,
  stats
}: StudioReelsHeaderProps) {
  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link className="transition hover:text-zinc-300" href={studioPath()}>
              Studio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-zinc-400">Reels</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Reels của tôi</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Tạo, lên lịch và tối ưu các đoạn Reels giúp kéo độc giả vào truyện.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
              {stats.total} tổng Reels
            </span>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
              {stats.published} đang đăng
            </span>
            <span className="rounded-full border border-zinc-400/30 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
              {stats.draft} nháp
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                stats.needsFix > 0
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  : "border-white/10 text-zinc-500"
              }`}
            >
              {stats.needsFix} cần sửa
            </span>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
              {stats.views7d.toLocaleString("vi-VN")} lượt xem 7 ngày
            </span>
            <span className="rounded-full border border-cyan-300/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-100/90">
              {stats.reads7d.toLocaleString("vi-VN")} chuyển đổi 7 ngày
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end">
          <button className={reelsBtnPrimary} onClick={onCreateClick} type="button">
            Tạo Reels mới
          </button>
          <Link className={reelsBtnSecondary} href={studioPath("/reels/new")}>
            Tạo từ chương hot
          </Link>
          <Link
            className={`${reelsBtnSecondary} pointer-events-none opacity-50`}
            href={studioPath("/import")}
            title="Nhập hàng loạt Reels đang chuẩn bị"
          >
            Nhập hàng loạt
          </Link>
        </div>
      </div>
    </div>
  );
}
