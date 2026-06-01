"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import {
  deleteStudioDraftAction,
  listStudioDraftVersionsAction,
  restoreStudioDraftVersionAction
} from "@/lib/studio/draft-actions";
import {
  DRAFT_STATUS_LABELS,
  DRAFT_TYPE_LABELS,
  draftsBtnCompactPrimary,
  draftsBtnCompactSecondary,
  formatDraftWhen,
  formatRelativeDraftWhen
} from "@/components/studio/drafts/shared/styles";
import { estimateReadMinutes } from "@/lib/studio/draft-item";
import type { DraftItem } from "@/types/drafts";

type StudioDraftCardProps = {
  draft: DraftItem;
  isPriority: boolean;
  onTogglePriority: (draftId: string) => void;
  onToggleSelect: (draftId: string, selected: boolean) => void;
  selected: boolean;
};

function statusBadgeClass(status: DraftItem["displayStatus"]) {
  switch (status) {
    case "stale":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "missing_title":
    case "missing_content":
    case "not_ready":
      return "border-rose-400/30 bg-rose-400/10 text-rose-200";
    case "autosaved":
    case "writing":
    default:
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
}

function autosaveLabel(draft: DraftItem) {
  if (draft.autosaveStatus === "error") {
    return "Có lỗi khi tự lưu";
  }

  if (draft.autosaveStatus === "unsaved") {
    return "Chưa lưu thay đổi";
  }

  if (draft.autosaveAt) {
    return `Đã tự lưu lúc ${formatDraftWhen(draft.autosaveAt)}`;
  }

  return null;
}

export function StudioDraftCard({
  draft,
  isPriority,
  onTogglePriority,
  onToggleSelect,
  selected
}: StudioDraftCardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const saveLabel = autosaveLabel(draft);
  const readMinutes = estimateReadMinutes(draft.wordCount);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <label className="mt-1 flex shrink-0 cursor-pointer items-center">
          <input
            checked={selected}
            className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-cyan-300 focus:ring-cyan-300/40"
            onChange={(event) => onToggleSelect(draft.id, event.target.checked)}
            type="checkbox"
          />
          <span className="sr-only">Chọn nháp {draft.title}</span>
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] font-semibold text-zinc-300">
              {DRAFT_TYPE_LABELS[draft.type]}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${statusBadgeClass(draft.displayStatus)}`}
            >
              {DRAFT_STATUS_LABELS[draft.displayStatus]}
            </span>
            {isPriority ? (
              <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 text-[0.65rem] font-semibold text-cyan-100">
                Ưu tiên
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">
            {draft.title}
          </h3>

          {draft.excerpt ? (
            <p className="mt-1 line-clamp-1 text-sm text-zinc-400">{draft.excerpt}</p>
          ) : null}

          {draft.subtitle !== "—" ? (
            <p className="mt-1 truncate text-xs text-zinc-500">{draft.subtitle}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-zinc-500 sm:text-xs">
            {draft.wordCount > 0 ? <span>{draft.wordCount.toLocaleString("vi-VN")} từ</span> : null}
            {draft.characterCount > 0 ? (
              <span>{draft.characterCount.toLocaleString("vi-VN")} ký tự</span>
            ) : null}
            {draft.chapterNumber ? <span>Chương {draft.chapterNumber}</span> : null}
            {readMinutes > 0 ? <span>~{readMinutes} phút đọc</span> : null}
            <span>Cập nhật {formatRelativeDraftWhen(draft.updatedAt)}</span>
          </div>

          {saveLabel ? <p className="mt-1 text-[0.65rem] text-zinc-500">{saveLabel}</p> : null}
        </div>

        <StudioRowActionMenu
          ariaLabel={`Tùy chọn nháp ${draft.title}`}
          items={[
            {
              label: isPriority ? "Bỏ ưu tiên" : "Đánh dấu ưu tiên",
              onAction: async () => {
                onTogglePriority(draft.id);
                return { ok: true };
              },
              type: "action"
            },
            ...(draft.canSchedule
              ? [
                  {
                    href: `${draft.editUrl}?schedule=1`,
                    label: "Đưa vào lịch đăng",
                    type: "link" as const
                  }
                ]
              : []),
            ...(draft.hasVersions
              ? [
                  {
                    label: "Khôi phục phiên bản trước",
                    onAction: async () => {
                      const versions = await listStudioDraftVersionsAction(draft.id);

                      if (versions.error || versions.versions.length < 2) {
                        return {
                          error: versions.error ?? "Không có phiên bản trước để khôi phục.",
                          ok: false
                        };
                      }

                      const previous = versions.versions[1];

                      if (
                        !window.confirm(
                          `Khôi phục phiên bản #${previous.versionNumber}? Nội dung hiện tại sẽ được lưu trước khi khôi phục.`
                        )
                      ) {
                        return { ok: false };
                      }

                      const result = await restoreStudioDraftVersionAction(
                        draft.id,
                        previous.id
                      );

                      if (result.ok) {
                        startTransition(() => router.refresh());
                      }

                      return {
                        error: result.error ?? undefined,
                        ok: result.ok
                      };
                    },
                    type: "action" as const
                  }
                ]
              : []),
            {
              confirmMessage: "Bạn có chắc muốn xoá? Hành động này không thể hoàn tác.",
              destructive: true,
              label: "Xoá nháp",
              onAction: async () => {
                const result = await deleteStudioDraftAction(draft.id);

                if (result.ok) {
                  startTransition(() => router.refresh());
                }

                return {
                  error: result.error ?? undefined,
                  ok: result.ok
                };
              },
              type: "action"
            }
          ]}
          mobileSheet
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 pl-7 sm:flex sm:pl-0 sm:pl-7">
        <Link className={draftsBtnCompactPrimary} href={draft.editUrl}>
          Tiếp tục viết
        </Link>
        {draft.previewUrl ? (
          <Link className={draftsBtnCompactSecondary} href={draft.previewUrl}>
            Xem
          </Link>
        ) : (
          <Link className={draftsBtnCompactSecondary} href={draft.editUrl}>
            Xem
          </Link>
        )}
      </div>
    </article>
  );
}
