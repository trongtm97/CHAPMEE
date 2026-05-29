"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { deleteStudioDraftAction } from "@/lib/studio/draft-actions";
import type { StudioDraftListItem } from "@/types/drafts";

type StudioDraftRowProps = {
  draft: StudioDraftListItem;
  typeLabel: string;
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function contextLabel(draft: StudioDraftListItem) {
  if (draft.draftType === "chapter") {
    if (draft.storyTitle && draft.chapterNumber) {
      return `${draft.storyTitle} · Chương ${draft.chapterNumber}`;
    }

    if (draft.storyTitle) {
      return draft.storyTitle;
    }
  }

  if (draft.storyTitle) {
    return draft.storyTitle;
  }

  return "—";
}

export function StudioDraftRow({ draft, typeLabel }: StudioDraftRowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-semibold text-zinc-300">
              {typeLabel}
            </span>
            <span className="text-xs text-zinc-500">{formatWhen(draft.lastSavedAt)}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">
            {draft.title}
          </h3>
          <p className="mt-1 truncate text-sm text-zinc-400">{contextLabel(draft)}</p>
        </div>

        <StudioRowActionMenu
          ariaLabel={`Tùy chọn nháp ${draft.title}`}
          items={[
            {
              type: "action",
              confirmMessage: "Xóa nháp này? Thao tác không hoàn tác được.",
              destructive: true,
              label: "Xóa nháp",
              onAction: async () => {
                const result = await deleteStudioDraftAction(draft.id);

                if (result.ok) {
                  startTransition(() => router.refresh());
                }

                return {
                  error: result.error ?? undefined,
                  ok: result.ok
                };
              }
            }
          ]}
        />
      </div>

      <div className="mt-4">
        <Link
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 sm:w-auto"
          href={draft.resumeHref}
        >
          Viết tiếp
        </Link>
      </div>
    </article>
  );
}
