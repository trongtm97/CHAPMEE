"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AddToCollectionSheet } from "@/components/collections/AddToCollectionSheet";
import { LibraryEmptyState } from "@/components/library/LibraryEmptyState";
import { LibrarySortFilter } from "@/components/library/LibrarySortFilter";
import { saveStoryAction } from "@/lib/actions/saveStory";
import { getStoryCardMeta, isStandaloneStory } from "@/lib/stories/story-structure";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import type {
  LibraryFilterOption,
  LibrarySavedStory,
  LibrarySortOption
} from "@/types/library";

type SavedStoriesListProps = {
  items: LibrarySavedStory[];
  total: number;
  searchQuery: string;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short"
  });
}

function sortSaved(items: LibrarySavedStory[], sort: LibrarySortOption) {
  const copy = [...items];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    case "updated":
      return copy.sort((a, b) => {
        const aTime = a.latestEpisodePublishedAt
          ? new Date(a.latestEpisodePublishedAt).getTime()
          : 0;
        const bTime = b.latestEpisodePublishedAt
          ? new Date(b.latestEpisodePublishedAt).getTime()
          : 0;
        return bTime - aTime;
      });
    case "progress":
      return copy.sort(
        (a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0)
      );
    case "recent":
    default:
      return copy.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
  }
}

function SavedStoryRow({
  item,
  onUnsave
}: {
  item: LibrarySavedStory;
  onUnsave: (item: LibrarySavedStory) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const readLabel =
    item.hasReadingProgress && item.currentEpisodeNumber && !isStandaloneStory(item)
      ? "Đọc tiếp"
      : "Đọc ngay";
  const storyFields = { slug: item.slug, public_code: item.publicCode };
  const readHref =
    item.hasReadingProgress &&
    item.currentEpisodeNumber &&
    item.currentEpisodeSlug &&
    item.currentEpisodePublicCode &&
    !isStandaloneStory(item)
      ? getStoryChapterHref(storyFields, {
          slug: item.currentEpisodeSlug,
          public_code: item.currentEpisodePublicCode
        })
      : getStoryDetailHref(storyFields);
  const cardMeta = getStoryCardMeta({
    structureType: item.structureType,
    standaloneReadingTimeMinutes: item.standaloneReadingTimeMinutes,
    episodeCount: item.episodeCount
  });
  const metaLine = cardMeta.secondaryLabel
    ? `${cardMeta.primaryLabel} · ${cardMeta.secondaryLabel}`
    : cardMeta.primaryLabel;
  return (
    <>
      <article className="rounded-xl border border-white/6 bg-white/[0.02] p-2">
        <div className="flex gap-2.5">
          <Link className="shrink-0" href={getStoryDetailHref(storyFields)}>
            <ChapMeeStoryCover
              className="!w-[2.625rem] rounded-md"
              size="xs"
              story={item}
              usage="catalogRow"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={getStoryDetailHref(storyFields)}>
              <h3 className="line-clamp-1 text-[0.8125rem] font-bold text-white">
                {item.title}
              </h3>
            </Link>
            {item.authorName ? (
              <p className="truncate text-[0.65rem] text-zinc-500">{item.authorName}</p>
            ) : null}
            <p className="mt-0.5 text-[0.62rem] text-zinc-500">
              {item.isCompleted ? "Hoàn thành" : "Đang ra"} · {metaLine}
              {formatDate(item.latestEpisodePublishedAt)
                ? ` · ${formatDate(item.latestEpisodePublishedAt)}`
                : ""}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Link
                className="inline-flex min-h-7 flex-1 items-center justify-center rounded-full bg-cyan-300 text-[0.65rem] font-bold text-zinc-950"
                href={readHref}
              >
                {readLabel}
              </Link>
              <div className="relative">
                <button
                  aria-label="Tùy chọn"
                  className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border border-white/8 text-zinc-400"
                  onClick={() => setMenuOpen((open) => !open)}
                  type="button"
                >
                  ⋯
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[9.5rem] rounded-xl border border-white/10 bg-[#121820] p-1 shadow-xl">
                    <button
                      className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                      onClick={() => {
                        setMenuOpen(false);
                        onUnsave(item);
                      }}
                      type="button"
                    >
                      Bỏ lưu
                    </button>
                    <button
                      className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                      onClick={() => {
                        setMenuOpen(false);
                        setCollectionOpen(true);
                      }}
                      type="button"
                    >
                      Thêm vào tủ
                    </button>
                    <button
                      className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                      onClick={() => {
                        setMenuOpen(false);
                        if (typeof navigator !== "undefined" && navigator.share) {
                          void navigator.share({
                            title: item.title,
                            url: `${window.location.origin}${getStoryDetailHref(storyFields)}`
                          });
                        }
                      }}
                      type="button"
                    >
                      Chia sẻ
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </article>

      {collectionOpen ? (
        <AddToCollectionSheet
          onClose={() => setCollectionOpen(false)}
          storyId={item.id}
          storyTitle={item.title}
        />
      ) : null}
    </>
  );
}

export function SavedStoriesList({ items, searchQuery, total }: SavedStoriesListProps) {
  const router = useRouter();
  const [sort, setSort] = useState<LibrarySortOption>("recent");
  const [filter, setFilter] = useState<LibraryFilterOption>("all");
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();
  const pageSize = 20;

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = items;
    if (query) {
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          (item.authorName?.toLowerCase().includes(query) ?? false)
      );
    }
    if (filter === "reading") {
      result = result.filter((item) => item.hasReadingProgress);
    }
    if (filter === "finished") {
      result = result.filter((item) => item.isCompleted);
    }
    return sortSaved(result, sort);
  }, [filter, items, searchQuery, sort]);

  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function handleUnsave(item: LibrarySavedStory) {
    startTransition(async () => {
      await saveStoryAction({
        storyId: item.id,
        storySlug: item.slug,
        saved: false,
        returnTo: "/me/library?tab=saved"
      });
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <LibraryEmptyState
        action={
          <Link
            className="inline-flex min-h-8 items-center justify-center rounded-full bg-cyan-300 px-3.5 text-xs font-bold text-zinc-950"
            href="/discover"
          >
            Khám phá truyện
          </Link>
        }
        description="Lưu truyện để quay lại đọc sau."
        title="Bạn chưa lưu truyện nào."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <LibrarySortFilter
        filter={filter}
        onFilterChange={setFilter}
        onSortChange={setSort}
        showProgressSort
        sort={sort}
      />

      {pending ? (
        <p className="text-center text-xs text-zinc-500">Đang cập nhật...</p>
      ) : null}

      <div className="space-y-2">
        {pageItems.map((item) => (
          <SavedStoryRow item={item} key={item.id} onUnsave={handleUnsave} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">Không tìm thấy truyện phù hợp.</p>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            type="button"
          >
            Trang trước
          </button>
          <span className="text-[0.65rem] text-zinc-500">
            {page + 1}/{totalPages}
          </span>
          <button
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Trang sau
          </button>
        </div>
      ) : null}

      {total > items.length ? (
        <p className="text-center text-[0.65rem] text-zinc-500">
          Hiển thị {items.length}/{total} truyện đã lưu.
        </p>
      ) : null}
    </div>
  );
}
