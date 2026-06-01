"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import {
  deleteReelsDraftAction,
  duplicateReelsItemAction,
  hideReelsItemAction,
  unhideReelsItemAction
} from "@/lib/reels/reels-actions";
import { REELS_STATUS_LABELS } from "@/lib/reels/reels-studio-utils";
import { studioPath } from "@/lib/studio/constants";
import type { ReelsStudioListItem } from "@/types/reels";
import {
  reelsBtnCompactPrimary,
  reelsBtnCompactSecondary,
  statusBadgeClass
} from "@/components/studio/reels/management/shared/styles";

type StudioReelsItemCardProps = {
  item: ReelsStudioListItem;
  onPreview: (item: ReelsStudioListItem) => void;
  onToggleSelect: (id: string, selected: boolean) => void;
  selected: boolean;
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(iso));
}

export function StudioReelsItemCard({
  item,
  onPreview,
  onToggleSelect,
  selected
}: StudioReelsItemCardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const editHref = studioPath(`/reels/${item.id}/edit`);

  const linkedLabel = item.chapterNumber
    ? `${item.storyTitle} · Chương ${item.chapterNumber}`
    : item.storyTitle;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <label className="mt-1 flex shrink-0 cursor-pointer">
            <input
              checked={selected}
              className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-cyan-300"
              onChange={(event) => onToggleSelect(item.id, event.target.checked)}
              type="checkbox"
            />
            <span className="sr-only">Chọn {item.displayTitle}</span>
          </label>

          <div
            className="aspect-[9/16] w-20 shrink-0 rounded-xl bg-cover bg-center sm:w-24"
            style={
              item.backgroundImageUrl
                ? { backgroundImage: `url(${item.backgroundImageUrl})` }
                : {
                    backgroundImage:
                      "linear-gradient(160deg, rgba(8,47,73,0.95), rgba(4,7,12,0.98))"
                  }
            }
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${statusBadgeClass(item.status)}`}
            >
              {REELS_STATUS_LABELS[item.status]}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] text-zinc-400">
              {item.sourceLabel}
            </span>
          </div>

          <h3 className="line-clamp-2 text-base font-semibold text-white">{item.hook}</h3>
          <p className="line-clamp-2 text-sm text-zinc-400">{item.body}</p>
          <p className="truncate text-xs text-zinc-500">{linkedLabel}</p>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-zinc-500 sm:text-xs">
            <span>{item.viewCount.toLocaleString("vi-VN")} lượt xem</span>
            <span>{item.ctaClickCount.toLocaleString("vi-VN")} đọc/CTA</span>
            <span>CTR {item.ctr}%</span>
            <span>{item.commentCount} bình luận</span>
            <span>{item.saveCount} lưu</span>
          </div>

          <p className="text-[0.65rem] text-zinc-600">
            Tạo {formatWhen(item.createdAt)} · Cập nhật {formatWhen(item.updatedAt)}
            {item.scheduledAt ? ` · Lịch ${formatWhen(item.scheduledAt)}` : ""}
          </p>
        </div>

        <StudioRowActionMenu
          ariaLabel="Tùy chọn Reels"
          items={[
            {
              href: editHref,
              label: "Sửa Reels",
              type: "link"
            },
            {
              label: "Xem preview",
              onAction: async () => {
                onPreview(item);
                return { ok: true };
              },
              type: "action"
            },
            {
              label: "Nhân bản",
              onAction: async () => {
                const result = await duplicateReelsItemAction(item.id);
                return { error: result.error ?? undefined, ok: result.ok ?? false };
              },
              type: "action"
            },
            {
              href: editHref,
              label: "Lên lịch",
              type: "link"
            },
            ...(item.status === "published"
              ? [
                  {
                    label: "Ẩn",
                    onAction: async () => {
                      if (!window.confirm("Ẩn Reels này khỏi feed?")) {
                        return { ok: false };
                      }
                      const result = await hideReelsItemAction(item.id);
                      if (result.ok) {
                        startTransition(() => router.refresh());
                      }
                      return { error: result.error ?? undefined, ok: result.ok };
                    },
                    type: "action" as const
                  }
                ]
              : []),
            ...(item.status === "hidden"
              ? [
                  {
                    label: "Hiện lại",
                    onAction: async () => {
                      const result = await unhideReelsItemAction(item.id);
                      if (result.ok) {
                        startTransition(() => router.refresh());
                      }
                      return { error: result.error ?? undefined, ok: result.ok };
                    },
                    type: "action" as const
                  }
                ]
              : []),
            {
              href: `/truyen/${item.storySlug}`,
              label: "Mở truyện",
              type: "link"
            },
            ...(item.chapterId && item.storyId
              ? [
                  {
                    href: studioPath(
                      `/stories/${item.storyId}/chapters/${item.chapterId}/edit`
                    ),
                    label: "Mở chương",
                    type: "link" as const
                  }
                ]
              : []),
            {
              href: studioPath("/analytics"),
              label: "Xem thống kê",
              type: "link"
            },
            ...(item.status === "draft"
              ? [
                  {
                    confirmMessage:
                      "Bạn có chắc muốn xoá nháp này? Hành động không thể hoàn tác.",
                    destructive: true,
                    label: "Xóa",
                    onAction: async () => {
                      const result = await deleteReelsDraftAction(item.id);
                      if (result.ok) {
                        startTransition(() => router.refresh());
                      }
                      return { error: result.error ?? undefined, ok: result.ok };
                    },
                    type: "action" as const
                  }
                ]
              : [])
          ]}
          mobileSheet
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:pl-9">
        <Link className={reelsBtnCompactPrimary} href={editHref}>
          Sửa Reels
        </Link>
        <button
          className={reelsBtnCompactSecondary}
          onClick={() => onPreview(item)}
          type="button"
        >
          Xem preview
        </button>
      </div>
    </article>
  );
}
