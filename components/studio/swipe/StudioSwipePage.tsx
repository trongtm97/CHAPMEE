"use client";

import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import { StudioSwipeListCard } from "@/components/studio/swipe/StudioSwipeListCard";
import { EmptyState } from "@/components/ui";
import type { SwipeItemListItem, SwipeListTab } from "@/types/swipe";

const TABS: Array<{ label: string; value: SwipeListTab }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Đã lên lịch", value: "scheduled" },
  { label: "Đã đăng", value: "published" },
  { label: "Đã ẩn", value: "hidden" },
  { label: "Cần sửa", value: "needs_fix" }
];

type StudioSwipePageProps = {
  activeTab: SwipeListTab;
  items: SwipeItemListItem[];
  page: number;
  totalPages: number;
};

export function StudioSwipePage({
  activeTab,
  items,
  page,
  totalPages
}: StudioSwipePageProps) {
  const basePath = studioPath("/swipe");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {TABS.map((tab) => (
              <Link
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab.value === activeTab
                    ? "bg-cyan-300 text-zinc-950"
                    : "border border-white/10 text-zinc-300 hover:border-white/20"
                }`}
                href={buildStudioManagerHref(basePath, { tab: tab.value })}
                key={tab.value}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-950"
          href={studioPath("/swipe/new")}
        >
          Tạo Swipe mới
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          description="Tạo Swipe thủ công để quảng bá truyện trên tab Swipe."
          title="Chưa có nội dung Swipe"
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <StudioSwipeListCard item={item} key={item.id} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              className="text-sm font-semibold text-cyan-300"
              href={buildStudioManagerHref(basePath, { page: String(page - 1), tab: activeTab })}
            >
              Trang trước
            </Link>
          ) : null}
          <span className="text-sm text-zinc-500">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages ? (
            <Link
              className="text-sm font-semibold text-cyan-300"
              href={buildStudioManagerHref(basePath, { page: String(page + 1), tab: activeTab })}
            >
              Trang sau
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
