"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { searchStoriesForQuickPickAction } from "@/lib/studio/import-export-actions";
import type { StoryQuickPickItem } from "@/types/studio-import";

type StudioStoryNavigatePickerProps = {
  actionLabel: string;
  buildHref: (storyId: string) => string;
  emptyHint?: string;
  initialStories: StoryQuickPickItem[];
  totalStories: number;
};

export function StudioStoryNavigatePicker({
  actionLabel,
  buildHref,
  emptyHint = "Không tìm thấy truyện.",
  initialStories,
  totalStories
}: StudioStoryNavigatePickerProps) {
  const [stories, setStories] = useState(initialStories);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(totalStories);
  const [pending, startTransition] = useTransition();

  function loadStories(nextSearch: string, nextPage: number) {
    startTransition(async () => {
      const result = await searchStoriesForQuickPickAction({ page: nextPage, search: nextSearch });
      setStories(result.stories);
      setTotal(result.total);
      setPage(nextPage);
      setSearch(nextSearch);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Chọn truyện
        </p>
        <p className="text-sm text-zinc-400">Tìm trong toàn bộ truyện của bạn — không giới hạn 200 mục.</p>
      </div>

      <AppSearchField
        onChange={(value) => loadStories(value, 1)}
        placeholder="Tên truyện, mã public…"
        showSubmit={false}
        value={search}
        variant="field"
      />

      {stories.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyHint}</p>
      ) : (
        <ul className="space-y-2">
          {stories.map((story) => (
            <li
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              key={story.id}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-100">{story.title}</p>
                {story.publicCode ? (
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">{story.publicCode}</p>
                ) : null}
              </div>
              <Link
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300"
                href={buildHref(story.id)}
              >
                {actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-40"
            disabled={pending || page <= 1}
            onClick={() => loadStories(search, page - 1)}
            type="button"
          >
            Trước
          </button>
          <span className="text-xs text-zinc-500">
            Trang {page}/{totalPages}
          </span>
          <button
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-40"
            disabled={pending || page >= totalPages}
            onClick={() => loadStories(search, page + 1)}
            type="button"
          >
            Sau
          </button>
        </div>
      ) : null}
    </div>
  );
}
