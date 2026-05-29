"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildCatalogHref, resolveCatalogGenres } from "@/lib/stories/catalog-url";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

type StoryFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  genres: StoryCatalogGenre[];
  query: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
};

type LengthFilter = "all" | "quick" | "short" | "long";

function lengthFromSort(sort: StoryCatalogSort, genre: string): LengthFilter {
  if (sort === "quick") {
    return "quick";
  }
  if (genre === "truyen-ngan") {
    return "short";
  }
  return "all";
}

export function StoryFilterSheet(props: StoryFilterSheetProps) {
  const { onClose, open } = props;

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <StoryFilterSheetPanel
      key={`${props.genre}|${props.status}|${props.sort}|${props.query}`}
      {...props}
    />,
    document.body
  );
}

function StoryFilterSheetPanel({
  genre,
  genres,
  onClose,
  query,
  sort,
  status
}: StoryFilterSheetProps) {
  const router = useRouter();
  const [genreSearch, setGenreSearch] = useState("");
  const [draftGenre, setDraftGenre] = useState(genre);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftLength, setDraftLength] = useState<LengthFilter>(() => lengthFromSort(sort, genre));

  const allGenres = useMemo(() => resolveCatalogGenres(genres), [genres]);

  const filteredGenres = useMemo(() => {
    const q = genreSearch.trim().toLowerCase();
    if (!q) {
      return allGenres;
    }
    return allGenres.filter(
      (item) => item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [allGenres, genreSearch]);

  function applyFilters() {
    let nextSort: StoryCatalogSort = sort;
    let nextGenre = draftGenre;

    if (draftLength === "quick") {
      nextSort = "quick";
    } else if (draftLength === "short") {
      nextGenre = "truyen-ngan";
      if (nextSort === "quick") {
        nextSort = "updated";
      }
    } else if (draftLength === "long") {
      // TODO: backend filter for multi-chapter stories when episode counts are exposed.
      if (nextSort === "quick") {
        nextSort = "updated";
      }
    } else if (draftLength === "all" && nextSort === "quick" && nextGenre !== "truyen-ngan") {
      nextSort = "updated";
    }

    router.push(
      buildCatalogHref({
        q: query,
        genre: nextGenre,
        status: draftStatus,
        sort: nextSort
      })
    );
    onClose();
  }

  function clearFilters() {
    router.push(buildCatalogHref({ q: query }));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200]">
      <button
        aria-label="Đóng bộ lọc"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        type="button"
      />
      <div
        className="absolute inset-x-0 bottom-0 z-10 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b1016] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(85dvh,40rem)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:pb-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-filter-sheet-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-zinc-50" id="story-filter-sheet-title">
            Chọn Danh Mục
          </h2>
          <button className="text-xs font-semibold text-zinc-400" onClick={onClose} type="button">
            Đóng
          </button>
        </div>

        <div className="space-y-4">
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Danh mục / thể loại</p>
            <AppSearchField
              onChange={setGenreSearch}
              placeholder="Tìm danh mục..."
              showSubmit={false}
              value={genreSearch}
              variant="field"
            />
            <div className="max-h-52 space-y-1 overflow-y-auto">
              <GenreListOption active={!draftGenre} label="Tất cả danh mục" onSelect={() => setDraftGenre("")} />
              {filteredGenres.length === 0 ? (
                <p className="px-1 py-2 text-xs text-zinc-500">Không tìm thấy danh mục phù hợp.</p>
              ) : null}
              {filteredGenres.map((item) => (
                <GenreListOption
                  active={draftGenre === item.slug}
                  key={item.slug}
                  label={`${item.name}${item.storyCount > 0 ? ` (${item.storyCount})` : ""}`}
                  onSelect={() => setDraftGenre(item.slug)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Trạng thái</p>
            <div className="flex flex-wrap gap-2">
              <FilterOption active={draftStatus === "all"} label="Tất cả" onSelect={() => setDraftStatus("all")} />
              <FilterOption
                active={draftStatus === "ongoing"}
                label="Đang ra"
                onSelect={() => setDraftStatus("ongoing")}
              />
              <FilterOption
                active={draftStatus === "completed"}
                label="Hoàn thành"
                onSelect={() => setDraftStatus("completed")}
              />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Độ dài</p>
            <div className="flex flex-wrap gap-2">
              <FilterOption active={draftLength === "all"} label="Tất cả" onSelect={() => setDraftLength("all")} />
              <FilterOption active={draftLength === "quick"} label="Đọc nhanh" onSelect={() => setDraftLength("quick")} />
              <FilterOption
                active={draftLength === "short"}
                label="Truyện ngắn"
                onSelect={() => setDraftLength("short")}
              />
              <FilterOption
                active={draftLength === "long"}
                label="Nhiều chương"
                onSelect={() => setDraftLength("long")}
              />
            </div>
          </section>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            className="h-11 flex-1 rounded-xl border border-white/15 text-sm font-semibold text-zinc-200"
            onClick={clearFilters}
            type="button"
          >
            Xóa lọc
          </button>
          <button
            className="h-11 flex-1 rounded-xl bg-cyan-300 text-sm font-bold text-zinc-950"
            onClick={applyFilters}
            type="button"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}

function GenreListOption({
  active,
  label,
  onSelect
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
          : "border-white/10 text-zinc-200 hover:bg-white/[0.04]"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span>{label}</span>
      {active ? <span className="text-xs text-cyan-200">✓</span> : null}
    </button>
  );
}

function FilterOption({
  active,
  label,
  onSelect
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 text-zinc-300"
      }`}
      onClick={onSelect}
      type="button"
    >
      {label}
    </button>
  );
}
