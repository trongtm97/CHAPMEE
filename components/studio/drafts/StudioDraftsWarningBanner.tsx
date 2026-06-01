import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  DRAFT_TYPE_LABELS,
  formatRelativeDraftWhen
} from "@/components/studio/drafts/shared/styles";
import type { DraftItem } from "@/types/drafts";

type StudioDraftsWarningBannerProps = {
  basePath: string;
  staleCount: number;
  attentionDrafts: DraftItem[];
};

export function StudioDraftsWarningBanner({
  attentionDrafts,
  basePath,
  staleCount
}: StudioDraftsWarningBannerProps) {
  if (staleCount === 0 && attentionDrafts.length === 0) {
    return null;
  }

  const viewAllHref = buildStudioManagerHref(basePath, {
    status: staleCount > 0 ? "stale" : "has_errors",
    time: staleCount > 0 ? "older" : undefined
  });

  return (
    <section className="space-y-2 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-amber-100">Cần xử lý</h2>
          {staleCount > 0 ? (
            <p className="mt-0.5 text-xs text-amber-200/80 sm:text-sm">
              Có {staleCount} nháp đã lâu chưa cập nhật. Hãy xem lại để tránh mất nội dung.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-200/80 sm:text-sm">
              Một số nháp thiếu thông tin hoặc cần hoàn thiện trước khi đăng.
            </p>
          )}
        </div>
        <Link
          className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
          href={viewAllHref}
        >
          Xem tất cả
        </Link>
      </div>

      {attentionDrafts.length > 0 ? (
        <ul className="space-y-1.5">
          {attentionDrafts.map((draft) => (
            <li key={draft.id}>
              <Link
                className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 transition hover:border-amber-400/20 hover:bg-black/30"
                href={draft.editUrl}
              >
                <span className="min-w-0 truncate text-sm text-zinc-200">
                  <span className="text-zinc-500">{DRAFT_TYPE_LABELS[draft.type]} · </span>
                  {draft.title}
                </span>
                <span className="shrink-0 text-[0.65rem] text-zinc-500">
                  {formatRelativeDraftWhen(draft.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
