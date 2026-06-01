"use client";

import { useMemo, useState } from "react";
import { CommentBulkBar } from "@/components/studio/comments/CommentBulkBar";
import { CommentCard } from "@/components/studio/comments/CommentCard";
import { CommentDetailPanel } from "@/components/studio/comments/CommentDetailPanel";
import { StudioCommentsEmptyState } from "@/components/studio/comments/StudioCommentsEmptyState";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  studioHideCommentAction,
  studioPinCommentAction,
  studioReportCommentAction,
  studioUnhideCommentAction
} from "@/lib/studio/studio-comments-actions";
import { commentsCard } from "@/components/studio/comments/shared/styles";
import type {
  CommentListPageSize,
  StudioCommentInboxItem
} from "@/types/comments";

function buildCardMenuItems(item: StudioCommentInboxItem) {
  return [
    {
      type: "link" as const,
      label: "Mở ngữ cảnh",
      href: item.contextHref
    },
    {
      type: "action" as const,
      label: item.isPinned ? "Bỏ ghim" : "Ghim",
      onAction: () => studioPinCommentAction(item.id, !item.isPinned)
    },
    ...(item.isHidden
      ? [
          {
            type: "action" as const,
            label: "Bỏ ẩn",
            onAction: () => studioUnhideCommentAction(item.id)
          }
        ]
      : [
          {
            type: "action" as const,
            label: "Ẩn",
            destructive: true,
            confirmMessage: "Ẩn bình luận này?",
            onAction: () => studioHideCommentAction(item.id)
          }
        ]),
    {
      type: "action" as const,
      label: "Báo cáo",
      confirmMessage: "Gửi báo cáo tới moder?",
      onAction: () => studioReportCommentAction(item.id, "other")
    }
  ];
}

type StudioCommentsListSectionProps = {
  basePath: string;
  comments: StudioCommentInboxItem[];
  filteredIds: string[];
  hasActiveFilters: boolean;
  hasStories: boolean;
  page: number;
  pageSize: CommentListPageSize;
  query: Record<string, string | undefined>;
  total: number;
  totalPages: number;
};

export function StudioCommentsListSection({
  basePath,
  comments,
  filteredIds,
  hasActiveFilters,
  hasStories,
  page,
  pageSize,
  query,
  total,
  totalPages
}: StudioCommentsListSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(comments[0]?.id ?? null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selected = useMemo(
    () => comments.find((item) => item.id === selectedId) ?? null,
    [comments, selectedId]
  );

  const pageIds = comments.map((item) => item.id);
  const effectiveIds = useMemo(() => [...selectedIds], [selectedIds]);

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  function selectComment(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

  if (comments.length === 0) {
    return (
      <StudioCommentsEmptyState
        basePath={basePath}
        hasActiveFilters={hasActiveFilters}
        hasStories={hasStories}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <span>
          {total.toLocaleString("vi-VN")} kết quả · Trang {page}/{totalPages} · {pageSize}
          /trang
        </span>
      </div>

      <CommentBulkBar
        count={effectiveIds.length}
        onClear={() => setSelectedIds(new Set())}
        onSelectPage={() => setSelectedIds(new Set(pageIds))}
        selectedIds={effectiveIds}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
        <ul className="space-y-2">
          {comments.map((item) => {
            const isActive = item.id === selectedId;

            return (
              <li key={item.id}>
                <div
                  className={`${commentsCard} p-3 ${
                    isActive
                      ? "border-cyan-400/40 bg-cyan-400/[0.06] ring-1 ring-cyan-400/20"
                      : "hover:border-white/20"
                  }`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => selectComment(item.id)}
                    type="button"
                  >
                    <CommentCard
                      compact
                      item={item}
                      menu={
                        <div onClick={(event) => event.stopPropagation()}>
                          <StudioRowActionMenu
                            ariaLabel="Tùy chọn bình luận"
                            items={buildCardMenuItems(item)}
                          />
                        </div>
                      }
                      selection={{
                        checked: selectedIds.has(item.id),
                        onChange: (checked) => toggleSelect(item.id, checked)
                      }}
                    />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden lg:block">
          <div className="sticky top-4 rounded-xl border border-white/10 bg-[#111820]/90 p-4">
            {selected ? (
              <CommentDetailPanel item={selected} />
            ) : (
              <DetailPlaceholder />
            )}
          </div>
        </div>
      </div>

      {mobileDetailOpen && selected ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 lg:hidden">
          <div className="flex-1 overflow-y-auto p-4 pb-28">
            <CommentDetailPanel
              item={selected}
              onClose={() => setMobileDetailOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <StudioPagination
        buildHref={(nextPage) =>
          buildStudioManagerHref(basePath, { ...query, page: String(nextPage) })
        }
        page={page}
        totalPages={totalPages}
      />

      {filteredIds.length > 0 && effectiveIds.length === 0 ? (
        <p className="sr-only">{filteredIds.length} mục trong bộ lọc hiện tại</p>
      ) : null}
    </>
  );
}

function DetailPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xl text-cyan-200">
        💬
      </div>
      <p className="mt-4 text-sm font-semibold text-zinc-200">
        Chọn một bình luận để xem chi tiết
      </p>
      <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-500">
        Bạn có thể trả lời, ghim, ẩn hoặc mở ngữ cảnh chương.
      </p>
    </div>
  );
}
