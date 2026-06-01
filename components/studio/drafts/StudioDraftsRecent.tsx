import Link from "next/link";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { StudioEmptyState } from "@/components/studio/dashboard/shared/StudioEmptyState";
import {
  DRAFT_STATUS_LABELS,
  DRAFT_TYPE_LABELS,
  draftsBtnCompactPrimary,
  draftsBtnCompactSecondary,
  formatRelativeDraftWhen
} from "@/components/studio/drafts/shared/styles";
import type { DraftItem } from "@/types/drafts";

type StudioDraftsRecentProps = {
  drafts: DraftItem[];
};

function autosaveLabel(draft: DraftItem) {
  if (draft.autosaveStatus === "error") {
    return "Có lỗi khi tự lưu";
  }

  if (draft.autosaveStatus === "unsaved") {
    return "Chưa lưu thay đổi";
  }

  if (draft.autosaveAt) {
    return `Đã tự lưu lúc ${formatRelativeDraftWhen(draft.autosaveAt)}`;
  }

  return null;
}

export function StudioDraftsRecent({ drafts }: StudioDraftsRecentProps) {
  if (drafts.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white sm:text-base">Tiếp tục gần đây</h2>
        <StudioEmptyState
          bare
          description="Các nháp bạn vừa chỉnh sửa sẽ hiện ở đây."
          title="Chưa có nháp gần đây"
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-white sm:text-base">Tiếp tục gần đây</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {drafts.map((draft) => {
          const saveLabel = autosaveLabel(draft);

          return (
            <article
              className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-3"
              key={draft.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[0.65rem] font-semibold text-cyan-100">
                      {DRAFT_TYPE_LABELS[draft.type]}
                    </span>
                    <span className="text-[0.65rem] text-zinc-500">
                      {formatRelativeDraftWhen(draft.updatedAt)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-white">
                    {draft.title}
                  </h3>
                  {draft.subtitle !== "—" ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{draft.subtitle}</p>
                  ) : null}
                  {saveLabel ? (
                    <p className="mt-1 text-[0.65rem] text-zinc-500">{saveLabel}</p>
                  ) : null}
                </div>
                <StudioRowActionMenu
                  ariaLabel={`Tùy chọn nháp ${draft.title}`}
                  items={[
                    ...(draft.previewUrl
                      ? [
                          {
                            href: draft.previewUrl,
                            label: "Xem chi tiết",
                            type: "link" as const
                          }
                        ]
                      : []),
                    {
                      href: draft.editUrl,
                      label: "Tiếp tục viết",
                      type: "link" as const
                    }
                  ]}
                  mobileSheet
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <Link className={draftsBtnCompactPrimary} href={draft.editUrl}>
                  Tiếp tục viết
                </Link>
                {draft.previewUrl ? (
                  <Link className={draftsBtnCompactSecondary} href={draft.previewUrl}>
                    Xem
                  </Link>
                ) : (
                  <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/5 px-3 text-xs text-zinc-600">
                    {DRAFT_STATUS_LABELS[draft.displayStatus]}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
