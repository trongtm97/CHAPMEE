"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StudioDraftCard } from "@/components/studio/drafts/StudioDraftCard";
import { StudioDraftsBulkBar } from "@/components/studio/drafts/StudioDraftsBulkBar";
import { StudioDraftsEmptyState } from "@/components/studio/drafts/StudioDraftsEmptyState";
import { StudioStoriesConfirmModal } from "@/components/studio/stories/StudioStoriesConfirmModal";
import { draftsBtnSecondary } from "@/components/studio/drafts/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type { DraftItem, DraftListPageSize } from "@/types/drafts";

const PRIORITY_STORAGE_KEY = "chapmee-draft-priorities";

type StudioDraftsListSectionProps = {
  drafts: DraftItem[];
  filteredIds: string[];
  hasActiveFilters: boolean;
  page: number;
  pageSize: DraftListPageSize;
  total: number;
};

function loadPriorityIds() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.localStorage.getItem(PRIORITY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}

function savePriorityIds(ids: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PRIORITY_STORAGE_KEY, JSON.stringify([...ids]));
}

export function StudioDraftsListSection({
  drafts,
  filteredIds,
  hasActiveFilters,
  page,
  pageSize,
  total
}: StudioDraftsListSectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllResults, setSelectAllResults] = useState(false);
  const [confirmSelectAllOpen, setConfirmSelectAllOpen] = useState(false);
  const [priorityIds, setPriorityIds] = useState<Set<string>>(() => loadPriorityIds());

  const pageIds = drafts.map((draft) => draft.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const effectiveIds = useMemo(() => {
    if (selectAllResults) {
      return filteredIds;
    }

    return [...selectedIds];
  }, [filteredIds, selectAllResults, selectedIds]);

  function toggleSelect(draftId: string, selected: boolean) {
    setSelectAllResults(false);
    setSelectedIds((current) => {
      const next = new Set(current);

      if (selected) {
        next.add(draftId);
      } else {
        next.delete(draftId);
      }

      return next;
    });
  }

  function togglePageSelect(checked: boolean) {
    setSelectAllResults(false);
    setSelectedIds((current) => {
      const next = new Set(current);

      for (const id of pageIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }

      return next;
    });
  }

  function confirmSelectAllFiltered() {
    setSelectAllResults(true);
    setSelectedIds(new Set(filteredIds));
    setConfirmSelectAllOpen(false);
  }

  function clearSelection() {
    setSelectAllResults(false);
    setSelectedIds(new Set());
  }

  function togglePriority(draftId: string) {
    setPriorityIds((current) => {
      const next = new Set(current);

      if (next.has(draftId)) {
        next.delete(draftId);
      } else {
        next.add(draftId);
      }

      savePriorityIds(next);
      return next;
    });
  }

  function toggleBulkPriority(ids: string[]) {
    setPriorityIds((current) => {
      const next = new Set(current);

      for (const id of ids) {
        next.add(id);
      }

      savePriorityIds(next);
      return next;
    });
  }

  if (drafts.length === 0 && !hasActiveFilters) {
    return <StudioDraftsEmptyState />;
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-base font-semibold text-white">Không có nháp phù hợp</p>
        <p className="mt-2 text-sm text-zinc-400">Thử đổi từ khóa hoặc bộ lọc khác.</p>
        <Link className={`${draftsBtnSecondary} mt-4 inline-flex`} href={studioPath("/drafts")}>
          Xóa bộ lọc
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            checked={allPageSelected}
            className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-cyan-300"
            onChange={(event) => togglePageSelect(event.target.checked)}
            type="checkbox"
          />
          Chọn trang này
        </label>
        <p className="text-xs text-zinc-500">
          Trang {page} · {total.toLocaleString("vi-VN")} nháp · {pageSize}/trang
        </p>
      </div>

      {filteredIds.length > drafts.length ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
          {selectAllResults ? (
            <span>
              Đã chọn tất cả {filteredIds.length} nháp phù hợp bộ lọc.{" "}
              <button
                className="font-semibold text-cyan-300 hover:underline"
                onClick={clearSelection}
                type="button"
              >
                Bỏ chọn
              </button>
            </span>
          ) : selectedIds.size > 0 && selectedIds.size < filteredIds.length ? (
            <span>
              Đã chọn {selectedIds.size} nháp trên trang này.{" "}
              <button
                className="font-semibold text-cyan-300 hover:underline"
                onClick={() => setConfirmSelectAllOpen(true)}
                type="button"
              >
                Chọn tất cả {filteredIds.length} nháp
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      <StudioDraftsBulkBar
        count={effectiveIds.length}
        drafts={drafts}
        onClear={clearSelection}
        onTogglePriority={toggleBulkPriority}
        selectedIds={effectiveIds}
      />

      <div className="space-y-2">
        {drafts.map((draft) => (
          <StudioDraftCard
            draft={draft}
            isPriority={priorityIds.has(draft.id)}
            key={draft.id}
            onTogglePriority={togglePriority}
            onToggleSelect={toggleSelect}
            selected={selectAllResults || selectedIds.has(draft.id)}
          />
        ))}
      </div>

      <StudioStoriesConfirmModal
        confirmLabel="Chọn tất cả"
        description={`Chọn tất cả ${filteredIds.length} nháp phù hợp bộ lọc hiện tại?`}
        onClose={() => setConfirmSelectAllOpen(false)}
        onConfirm={confirmSelectAllFiltered}
        open={confirmSelectAllOpen}
        title="Chọn toàn bộ kết quả?"
      />
    </section>
  );
}
