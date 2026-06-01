"use client";

import { useRouter } from "next/navigation";
import {
  analyticsBtnPrimary,
  analyticsBtnSecondary
} from "@/components/studio/analytics/dashboard/shared/styles";

type AnalyticsHeaderProps = {
  updatedAt: string;
};

export function AnalyticsHeader({ updatedAt }: AnalyticsHeaderProps) {
  const router = useRouter();
  const formatted = new Date(updatedAt).toLocaleString("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <a className="hover:text-zinc-300" href="/studio">
              Studio
            </a>
          </li>
          <li aria-hidden>/</li>
          <li className="text-zinc-400">Thống kê</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Thống kê Studio</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Theo dõi lượt đọc, tương tác, Reels và hiệu quả truyện của bạn.
          </p>
          <p className="mt-2 text-xs text-zinc-500">Cập nhật lần cuối: {formatted}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={analyticsBtnSecondary}
            disabled
            title="Xuất báo cáo đang được chuẩn bị"
            type="button"
          >
            Xuất báo cáo
          </button>
          <button
            className={analyticsBtnPrimary}
            onClick={() => router.refresh()}
            type="button"
          >
            Làm mới
          </button>
        </div>
      </div>
    </div>
  );
}
