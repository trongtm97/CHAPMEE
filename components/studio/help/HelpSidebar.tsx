"use client";

import Link from "next/link";
import { HelpActionGrid } from "@/components/studio/help/HelpActionGrid";
import { studioPath } from "@/lib/studio/constants";
import type { HelpActionCard } from "@/lib/content/studio-help";

type HelpSidebarProps = {
  actionCards: HelpActionCard[];
  onFeedbackClick?: () => void;
};

export function HelpSidebar({ actionCards, onFeedbackClick }: HelpSidebarProps) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      <HelpActionGrid cards={actionCards} compact title="Lối tắt nhanh" />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm font-semibold text-white">Trạng thái hỗ trợ</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Tài liệu được cập nhật theo phiên bản Studio hiện tại. Một số tính năng có thể chưa bật
          trên tài khoản của bạn.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-zinc-100 hover:border-cyan-300/40"
            href={studioPath("/settings")}
          >
            Cài đặt Studio
          </Link>
          {onFeedbackClick ? (
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
              onClick={onFeedbackClick}
              type="button"
            >
              Gửi góp ý / báo lỗi
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
