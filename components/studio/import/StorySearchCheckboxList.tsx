"use client";

import { useState, useTransition } from "react";
import { searchStoriesForQuickPickAction } from "@/lib/studio/import-export-actions";
import type { StoryQuickPickItem } from "@/types/studio-import";

type StorySearchCheckboxListProps = {
  initialStories: StoryQuickPickItem[];
  totalStories: number;
  selectedIds: string[];
  onToggle: (storyId: string) => void;
};

export function StorySearchCheckboxList({
  initialStories,
  onToggle,
  selectedIds,
  totalStories
}: StorySearchCheckboxListProps) {
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
    <div className="space-y-3">
      <input
        className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
        disabled={pending}
        onChange={(event) => loadStories(event.target.value, 1)}
        placeholder="Tìm truyện theo tên hoặc mã CM-ST-…"
        type="search"
        value={search}
      />

      {selectedIds.length > 0 ? (
        <p className="text-xs text-cyan-200/80">Đã chọn {selectedIds.length} truyện</p>
      ) : null}

      <div className="max-h-56 space-y-2 overflow-y-auto">
        {stories.length === 0 ? (
          <p className="text-sm text-zinc-500">Không tìm thấy truyện.</p>
        ) : (
          stories.map((story) => (
            <label
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/5 px-2 py-2 text-sm text-zinc-300 hover:bg-white/[0.03]"
              key={story.id}
            >
              <input
                checked={selectedIds.includes(story.id)}
                className="mt-0.5"
                onChange={() => onToggle(story.id)}
                type="checkbox"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-zinc-100">{story.title}</span>
                {story.publicCode ? (
                  <span className="font-mono text-xs text-zinc-500">{story.publicCode}</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 disabled:opacity-40"
            disabled={pending || page <= 1}
            onClick={() => loadStories(search, page - 1)}
            type="button"
          >
            Trước
          </button>
          <span>
            Trang {page}/{totalPages}
          </span>
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 disabled:opacity-40"
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
