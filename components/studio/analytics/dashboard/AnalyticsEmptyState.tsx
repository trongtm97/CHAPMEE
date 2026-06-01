import Link from "next/link";
import {
  analyticsBtnPrimary,
  analyticsBtnSecondary,
  analyticsCard
} from "@/components/studio/analytics/dashboard/shared/styles";
import { studioPath } from "@/lib/studio/constants";

export function AnalyticsEmptyState() {
  return (
    <div className={`${analyticsCard} border-dashed px-6 py-12 text-center`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xl">
        📊
      </div>
      <p className="mt-4 text-lg font-semibold text-white">Chưa có thống kê</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        Xuất bản chương, tạo Reels và tương tác với độc giả để bắt đầu thu thập số liệu.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link className={analyticsBtnPrimary} href={studioPath("/stories/new")}>
          Tạo truyện mới
        </Link>
        <Link className={analyticsBtnSecondary} href={studioPath("/stories")}>
          Viết chương mới
        </Link>
        <Link className={analyticsBtnSecondary} href={studioPath("/reels/new")}>
          Tạo Reels
        </Link>
      </div>
    </div>
  );
}
