"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import {
  tplBtnPrimary,
  tplBtnSecondary,
  tplCard
} from "@/components/studio/templates/shared/styles";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import type {
  StudioTemplateCategoryFilter,
  StudioTemplateSort,
  StudioTemplateTab
} from "@/types/templates";

const CATEGORY_CHIPS: Array<{ label: string; value: StudioTemplateCategoryFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Reels", value: "reels" },
  { label: "Chương", value: "chapter" },
  { label: "Mô tả truyện", value: "story_description" },
  { label: "Ghi chú tác giả", value: "author_note" },
  { label: "Cảnh báo", value: "content_warning" },
  { label: "Hội thoại", value: "dialogue" },
  { label: "SEO", value: "seo" },
  { label: "CTA", value: "cta" },
  { label: "Mở đầu CH", value: "chapter_opening" },
  { label: "Kết chương", value: "chapter_ending" }
];

const SORT_OPTIONS: Array<{ label: string; value: StudioTemplateSort }> = [
  { label: "Mới nhất", value: "newest" },
  { label: "Dùng nhiều nhất", value: "used" },
  { label: "A-Z", value: "az" },
  { label: "Yêu thích trước", value: "favorite" }
];

type TemplateFiltersProps = {
  activeCategory: StudioTemplateCategoryFilter;
  activeSort: StudioTemplateSort;
  activeTab: StudioTemplateTab;
  basePath: string;
  query: Record<string, string | undefined>;
  resultCount: number;
  search: string;
};

export function TemplateFilters({
  activeCategory,
  activeSort,
  activeTab,
  basePath,
  query,
  resultCount,
  search
}: TemplateFiltersProps) {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(search);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draftSort, setDraftSort] = useState(activeSort);
  const [draftCategory, setDraftCategory] = useState(activeCategory);

  function apply() {
    router.push(
      buildStudioManagerHref(basePath, {
        ...query,
        category: draftCategory !== "all" ? draftCategory : undefined,
        q: localSearch.trim() || undefined,
        sort: draftSort !== "newest" ? draftSort : undefined,
        tab: activeTab !== "system" ? activeTab : undefined
      })
    );
  }

  return (
    <div className={`${tplCard} space-y-3 p-4`}>
      <AppSearchField
        onChange={setLocalSearch}
        placeholder="Tìm theo tên, mô tả, nội dung..."
        showSubmit={false}
        value={localSearch}
        variant="field"
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {CATEGORY_CHIPS.map((chip) => {
          const active = activeCategory === chip.value;

          return (
            <Link
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 text-zinc-400"
              }`}
              href={buildStudioManagerHref(basePath, {
                ...query,
                category: chip.value !== "all" ? chip.value : undefined,
                tab: activeTab !== "system" ? activeTab : undefined
              })}
              key={chip.value}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-[1fr_auto_auto]">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Loại mẫu</span>
          <select
            className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm"
            onChange={(event) =>
              setDraftCategory(event.target.value as StudioTemplateCategoryFilter)
            }
            value={draftCategory}
          >
            {CATEGORY_CHIPS.map((chip) => (
              <option key={chip.value} value={chip.value}>
                {chip.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Sắp xếp</span>
          <select
            className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm"
            onChange={(event) => setDraftSort(event.target.value as StudioTemplateSort)}
            value={draftSort}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className={tplBtnPrimary} onClick={apply} type="button">
            Áp dụng
          </button>
          <Link className={tplBtnSecondary} href={basePath}>
            Xóa lọc
          </Link>
        </div>
      </div>

      <div className="lg:hidden">
        <button
          className={`${tplBtnSecondary} w-full`}
          onClick={() => setMobileOpen((open) => !open)}
          type="button"
        >
          {mobileOpen ? "Đóng bộ lọc" : "Bộ lọc & sắp xếp"}
        </button>
        {mobileOpen ? (
          <div className="mt-3 space-y-3">
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm"
              onChange={(event) =>
                setDraftCategory(event.target.value as StudioTemplateCategoryFilter)
              }
              value={draftCategory}
            >
              {CATEGORY_CHIPS.map((chip) => (
                <option key={chip.value} value={chip.value}>
                  {chip.label}
                </option>
              ))}
            </select>
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm"
              onChange={(event) => setDraftSort(event.target.value as StudioTemplateSort)}
              value={draftSort}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button className={`${tplBtnPrimary} flex-1`} onClick={apply} type="button">
                Áp dụng
              </button>
              <Link className={`${tplBtnSecondary} flex-1 text-center`} href={basePath}>
                Xóa lọc
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-sm text-zinc-500">
        {resultCount.toLocaleString("vi-VN")} mẫu phù hợp
      </p>
    </div>
  );
}
