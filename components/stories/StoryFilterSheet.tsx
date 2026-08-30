"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildCatalogHref } from "@/lib/stories/catalog-url";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

type StoryFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  genres: StoryCatalogGenre[];
  filterOptions: CatalogFilterOptions;
  query: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
  filters: StoryCatalogFilterParams;
  hideMonetizationFilters?: boolean;
  hideAccessFilters?: boolean;
  /** Hide audio/video toggles (used on /media where tab already selects media type). */
  variant?: "story" | "media";
  resolveApplyHref?: (
    draft: StoryCatalogFilterParams,
    ctx: { query: string; sort: StoryCatalogSort; status: StoryCatalogStatus; genre: string }
  ) => string;
  resolveClearHref?: (ctx: { query: string }) => string;
};

export function StoryFilterSheet(props: StoryFilterSheetProps) {
  const { onClose, open } = props;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
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
    <StoryFilterSheetPanel key={JSON.stringify(props.filters)} {...props} />,
    document.body
  );
}

function StoryFilterSheetPanel({
  filterOptions,
  filters,
  genre,
  genres,
  hideAccessFilters = false,
  hideMonetizationFilters = false,
  onClose,
  query,
  resolveApplyHref,
  resolveClearHref,
  sort,
  status,
  variant = "story"
}: StoryFilterSheetProps) {
  const router = useRouter();
  const [genreSearch, setGenreSearch] = useState("");
  const [draft, setDraft] = useState<StoryCatalogFilterParams>({
    ...filters,
    genre: genre || filters.genre,
    status: status ?? filters.status,
    sort: sort ?? filters.sort
  });

  const filteredGenres = useMemo(() => {
    const q = genreSearch.trim().toLowerCase();
    if (!q) return genres;
    return genres.filter(
      (item) => item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [genreSearch, genres]);

  function patch(partial: Partial<StoryCatalogFilterParams>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function applyFilters() {
    const href = resolveApplyHref
      ? resolveApplyHref(draft, { query, sort, status, genre })
      : buildCatalogHref({
          ...draft,
          q: query || draft.q,
          page: 1
        });
    router.push(href);
    onClose();
  }

  function clearFilters() {
    const href = resolveClearHref ? resolveClearHref({ query }) : buildCatalogHref({ q: query });
    router.push(href);
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
        aria-labelledby="story-filter-sheet-title"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 z-10 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b1016] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(85dvh,42rem)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:pb-4"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-zinc-50" id="story-filter-sheet-title">
            Bộ lọc nâng cao
          </h2>
          <button className="text-xs font-semibold text-zinc-400" onClick={onClose} type="button">
            Đóng
          </button>
        </div>

        <div className="space-y-4">
          <FacetSelect
            label="Thể loại chính"
            onChange={(value) => patch({ genre: value || undefined, subgenre: undefined })}
            options={filteredGenres}
            search={genreSearch}
            onSearchChange={setGenreSearch}
            value={draft.genre ?? ""}
          />

          <FacetChips
            label="Thể loại phụ"
            onChange={(value) => patch({ subgenre: value || undefined })}
            options={filterOptions.subgenres}
            value={draft.subgenre ?? ""}
          />

          <FacetChips
            label="Tag / motif"
            onChange={(value) => patch({ tag: value || undefined })}
            options={filterOptions.tags}
            value={draft.tag ?? ""}
          />

          <FacetChips
            label="Nhân vật"
            onChange={(value) => patch({ character: value || undefined })}
            options={filterOptions.characters}
            value={draft.character ?? ""}
          />

          <FacetChips
            label="Quan hệ"
            onChange={(value) => patch({ relationship: value || undefined })}
            options={filterOptions.relationships}
            value={draft.relationship ?? ""}
          />

          <FacetChips
            label="Phong cách kể"
            onChange={(value) => patch({ narrativeStyle: value || undefined })}
            options={filterOptions.narrativeStyles}
            value={draft.narrativeStyle ?? ""}
          />

          <FacetChips
            label="Bối cảnh"
            onChange={(value) => patch({ setting: value || undefined })}
            options={filterOptions.settings}
            value={draft.setting ?? ""}
          />

          <FacetChips
            label="Cảm giác đọc"
            onChange={(value) => patch({ experience: value || undefined })}
            options={filterOptions.experiences}
            value={draft.experience ?? ""}
          />

          <FacetChips
            label="Format trình bày"
            onChange={(value) => patch({ presentation: value || undefined })}
            options={filterOptions.presentations}
            value={draft.presentation ?? ""}
          />

          <FacetChips
            label="Loại nội dung"
            onChange={(value) => patch({ contentType: value || undefined })}
            options={filterOptions.contentTypes}
            value={draft.contentType ?? ""}
          />

          <FacetChips
            label="Độ tuổi"
            onChange={(value) => patch({ ageRating: value || undefined })}
            options={filterOptions.ageRatings}
            value={draft.ageRating ?? ""}
          />

          {hideMonetizationFilters ? null : (
            <FacetChips
              label="Gói truy cập (taxonomy)"
              onChange={(value) => patch({ monetization: value || undefined })}
              options={filterOptions.monetizationAccess}
              value={draft.monetization ?? ""}
            />
          )}

          <FacetChips
            label="Cảnh báo nội dung"
            onChange={(value) => patch({ contentWarning: value || undefined })}
            options={filterOptions.contentWarnings}
            value={draft.contentWarning ?? ""}
          />

          <FacetChips
            label="Nhãn trạng thái"
            onChange={(value) => patch({ storyStatus: value || undefined })}
            options={filterOptions.storyStatuses}
            value={draft.storyStatus ?? ""}
          />

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Loại truyện</p>
            <div className="flex flex-wrap gap-2">
              <FilterOption
                active={!draft.contentOrigin}
                label="Tất cả"
                onSelect={() => patch({ contentOrigin: undefined })}
              />
              <FilterOption
                active={draft.contentOrigin === "original"}
                label="Truyện sáng tác"
                onSelect={() => patch({ contentOrigin: "original" })}
              />
              <FilterOption
                active={draft.contentOrigin === "translation"}
                label="Truyện dịch"
                onSelect={() => patch({ contentOrigin: "translation" })}
              />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Trạng thái</p>
            <div className="flex flex-wrap gap-2">
              <FilterOption active={draft.status === "all"} label="Tất cả" onSelect={() => patch({ status: "all" })} />
              <FilterOption active={draft.status === "ongoing"} label="Đang ra" onSelect={() => patch({ status: "ongoing" })} />
              <FilterOption active={draft.status === "completed"} label="Hoàn thành" onSelect={() => patch({ status: "completed" })} />
            </div>
          </section>

          {hideAccessFilters ? null : (
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Truy cập</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "", label: "Tất cả" },
                  { value: "free", label: "Miễn phí" },
                  { value: "paid", label: "Trả phí" },
                  { value: "free_chapters", label: "Có chương miễn phí" },
                  { value: "full_access", label: "Bán trọn bộ" }
                ].map((option) => (
                  <FilterOption
                    active={(draft.access ?? "") === option.value}
                    key={option.label}
                    label={option.label}
                    onSelect={() =>
                      patch({
                        access: (option.value || undefined) as StoryCatalogFilterParams["access"]
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {variant === "story" ? (
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Media</p>
              <div className="flex flex-wrap gap-2">
                <FilterOption
                  active={!draft.hasAudio}
                  label="Audio: tất cả"
                  onSelect={() => patch({ hasAudio: undefined })}
                />
                <FilterOption
                  active={draft.hasAudio === "yes"}
                  label="Có audio"
                  onSelect={() => patch({ hasAudio: "yes" })}
                />
                <FilterOption
                  active={draft.hasVideo === "yes"}
                  label="Có video"
                  onSelect={() => patch({ hasVideo: draft.hasVideo === "yes" ? undefined : "yes" })}
                />
              </div>
            </section>
          ) : null}

          {variant === "story" ? (
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Chương mới</p>
            <div className="flex flex-wrap gap-2">
              <FilterOption
                active={!draft.hasNewChapter}
                label="Tất cả"
                onSelect={() => patch({ hasNewChapter: undefined })}
              />
              <FilterOption
                active={draft.hasNewChapter === "yes"}
                label="Có chương mới (14 ngày)"
                onSelect={() => patch({ hasNewChapter: "yes" })}
              />
              <FilterOption
                active={draft.hasNewChapter === "no"}
                label="Không ưu tiên mới"
                onSelect={() => patch({ hasNewChapter: "no" })}
              />
            </div>
          </section>
          ) : null}

          {variant === "story" ? (
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">Cảnh báo nội dung</p>
            <div className="flex flex-wrap gap-2">
              <FilterOption active={!draft.hasWarning} label="Tất cả" onSelect={() => patch({ hasWarning: undefined })} />
              <FilterOption active={draft.hasWarning === "yes"} label="Có cảnh báo" onSelect={() => patch({ hasWarning: "yes" })} />
              <FilterOption active={draft.hasWarning === "no"} label="Không cảnh báo" onSelect={() => patch({ hasWarning: "no" })} />
            </div>
          </section>
          ) : null}
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

function FacetSelect({
  label,
  onChange,
  onSearchChange,
  options,
  search,
  value
}: {
  label: string;
  onChange: (slug: string) => void;
  onSearchChange: (value: string) => void;
  options: Array<{ slug: string; name: string }>;
  search: string;
  value: string;
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <AppSearchField onChange={onSearchChange} placeholder="Tìm…" showSubmit={false} value={search} variant="field" />
      <div className="max-h-40 space-y-1 overflow-y-auto">
        <GenreListOption active={!value} label="Tất cả" onSelect={() => onChange("")} />
        {options.map((item) => (
          <GenreListOption
            active={value === item.slug}
            key={item.slug}
            label={item.name}
            onSelect={() => onChange(item.slug)}
          />
        ))}
      </div>
    </section>
  );
}

function FacetChips({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (slug: string) => void;
  options: Array<{ slug: string; name: string }>;
  value: string;
}) {
  if (options.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        <FilterOption active={!value} label="Tất cả" onSelect={() => onChange("")} />
        {options.slice(0, 16).map((item) => (
          <FilterOption
            active={value === item.slug}
            key={item.slug}
            label={item.name}
            onSelect={() => onChange(item.slug)}
          />
        ))}
      </div>
    </section>
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
