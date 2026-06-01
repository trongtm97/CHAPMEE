"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StudioReelsBulkBar } from "@/components/studio/reels/management/StudioReelsBulkBar";
import { StudioReelsEmptyState } from "@/components/studio/reels/management/StudioReelsEmptyState";
import { StudioReelsItemCard } from "@/components/studio/reels/management/StudioReelsItemCard";
import { StudioReelsPreviewDrawer } from "@/components/studio/reels/management/StudioReelsPreviewDrawer";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import { reelsBtnSecondary } from "@/components/studio/reels/management/shared/styles";
import type { ReelsListPageSize, ReelsStudioListItem } from "@/types/reels";

type StudioReelsListSectionProps = {
  authorName: string;
  filteredIds: string[];
  hasActiveFilters: boolean;
  items: ReelsStudioListItem[];
  onCreateClick: () => void;
  page: number;
  pageSize: ReelsListPageSize;
  query: Record<string, string | undefined>;
  total: number;
  totalPages: number;
};

export function StudioReelsListSection({
  authorName,
  filteredIds,
  hasActiveFilters,
  items,
  onCreateClick,
  page,
  pageSize,
  query,
  total,
  totalPages
}: StudioReelsListSectionProps) {
  const basePath = studioPath("/reels");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<ReelsStudioListItem | null>(null);

  const pageIds = items.map((item) => item.id);

  const effectiveIds = useMemo(() => [...selectedIds], [selectedIds]);

  function toggleSelect(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  function selectPage() {
    setSelectedIds(new Set(pageIds));
  }

  if (items.length === 0 && !hasActiveFilters && total === 0) {
    return <StudioReelsEmptyState onCreateClick={onCreateClick} />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-base font-semibold text-white">Không có Reels phù hợp</p>
        <p className="mt-2 text-sm text-zinc-400">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        <Link className={`${reelsBtnSecondary} mt-4 inline-flex`} href={basePath}>
          Xóa bộ lọc
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <span>
          {total.toLocaleString("vi-VN")} kết quả · Trang {page}/{totalPages} · {pageSize}/trang
        </span>
      </div>

      <StudioReelsBulkBar
        count={effectiveIds.length}
        onClear={() => setSelectedIds(new Set())}
        onSelectPage={selectPage}
        selectedIds={effectiveIds}
      />

      <div className="space-y-3">
        {items.map((item) => (
          <StudioReelsItemCard
            item={item}
            key={item.id}
            onPreview={setPreviewItem}
            onToggleSelect={toggleSelect}
            selected={selectedIds.has(item.id)}
          />
        ))}
      </div>

      <StudioPagination
        buildHref={(nextPage) =>
          buildStudioManagerHref(basePath, { ...query, page: String(nextPage) })
        }
        page={page}
        totalPages={totalPages}
      />

      <StudioReelsPreviewDrawer
        authorName={authorName}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </>
  );
}
