"use client";

import Link from "next/link";
import { useState } from "react";
import { getTaxonomyVisual } from "@/lib/discover/taxonomy-visuals";
import type { DiscoverTaxonomyChipSection, DiscoverTaxonomyPayload } from "@/lib/discovery/types";

type DiscoverTaxonomyExplorerProps = {
  taxonomy: DiscoverTaxonomyPayload;
  activeGenre?: string;
  query?: string;
};

type TabId = "genres" | "experiences" | "settings" | "presentations";

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: "genres", label: "Thể loại", emoji: "📚" },
  { id: "experiences", label: "Cảm giác", emoji: "✨" },
  { id: "settings", label: "Bối cảnh", emoji: "🏯" },
  { id: "presentations", label: "Format", emoji: "📱" }
];

function sectionForTab(taxonomy: DiscoverTaxonomyPayload, tab: TabId): DiscoverTaxonomyChipSection {
  switch (tab) {
    case "experiences":
      return taxonomy.readerExperiences;
    case "settings":
      return taxonomy.settingTags;
    case "presentations":
      return taxonomy.presentationModes;
    default:
      return taxonomy.featuredGenres;
  }
}

function GenreBentoCard({
  active,
  href,
  name,
  slug
}: {
  active: boolean;
  href: string;
  name: string;
  slug: string;
}) {
  const visual = getTaxonomyVisual("genres", slug);

  return (
    <Link
      className={`group relative block min-h-[5.75rem] w-full overflow-hidden rounded-2xl border bg-[#0b1016] p-3.5 transition duration-200 ${
        active
          ? "border-cyan-300/50 shadow-[0_0_28px_rgba(103,232,249,0.14)]"
          : `border-white/10 ${visual.ring} hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)]`
      }`}
      href={href}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient}`} aria-hidden />
      <div
        className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/[0.06] blur-2xl"
        aria-hidden
      />
      <div className="relative flex h-full flex-col justify-between gap-2">
        <span aria-hidden className="text-2xl leading-none drop-shadow-sm">
          {visual.emoji}
        </span>
        <p className="text-sm font-black leading-snug text-white">{name}</p>
      </div>
    </Link>
  );
}

function TaxonomyScrollCard({
  href,
  name,
  sectionKey,
  slug
}: {
  href: string;
  name: string;
  sectionKey: string;
  slug: string;
}) {
  const visual = getTaxonomyVisual(sectionKey, slug);

  return (
    <Link
      className={`group relative flex h-[5.5rem] w-[8.5rem] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-xl border border-white/10 bg-[#0b1016] p-3 transition hover:shadow-lg ${visual.ring}`}
      href={href}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient}`} aria-hidden />
      <span aria-hidden className="relative mb-1 text-lg leading-none">
        {visual.emoji}
      </span>
      <span className="relative line-clamp-2 text-[11px] font-bold leading-snug text-white">
        {name}
      </span>
    </Link>
  );
}

export function DiscoverTaxonomyExplorer({
  activeGenre = "",
  query = "",
  taxonomy
}: DiscoverTaxonomyExplorerProps) {
  const [tab, setTab] = useState<TabId>("genres");
  const genres = taxonomy.featuredGenres.terms.slice(0, 10);
  const activeSection = sectionForTab(taxonomy, tab);
  const clearHref = query ? `/discover?q=${encodeURIComponent(query)}` : "/discover";

  if (genres.length === 0 && activeSection.terms.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="discover-taxonomy-explorer"
      className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(165deg,rgba(103,232,249,0.07),rgba(255,255,255,0.02)_38%,rgba(8,12,18,0.96))] p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/90">
            Duyệt theo nhãn
          </p>
          <h2 className="text-base font-black text-white md:text-lg" id="discover-taxonomy-explorer">
            Tìm truyện đúng mood
          </h2>
          <p className="max-w-md text-xs leading-relaxed text-zinc-400">
            Chọn thể loại, cảm giác đọc hoặc bối cảnh — không cần lục danh sách chữ dài.
          </p>
        </div>
        <Link
          className="shrink-0 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold text-cyan-100 transition hover:bg-cyan-300/18"
          href="/kham-pha"
        >
          Trung tâm taxonomy →
        </Link>
      </div>

      {genres.length > 0 ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-zinc-300">Thể loại hot</p>
            <div className="flex items-center gap-2">
              {activeGenre ? (
                <Link className="text-[11px] text-zinc-500 hover:text-zinc-300" href={clearHref}>
                  Xóa lọc
                </Link>
              ) : null}
              <Link
                className="text-[11px] font-semibold text-cyan-200 hover:text-cyan-100"
                href={taxonomy.featuredGenres.seeAllHref}
              >
                Xem tất cả
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {genres.slice(0, 8).map((term) => (
              <GenreBentoCard
                active={activeGenre === term.slug}
                href={term.href}
                key={term.id}
                name={term.name}
                slug={term.slug}
              />
            ))}
          </div>
          {genres.length > 8 ? (
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 pt-1">
              {genres.slice(8).map((term) => (
                <TaxonomyScrollCard
                  href={term.href}
                  key={term.id}
                  name={term.name}
                  sectionKey="genres"
                  slug={term.slug}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 border-t border-white/8 pt-4">
        <div
          className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2"
          role="tablist"
        >
          {TABS.map((item) => {
            const count = sectionForTab(taxonomy, item.id).terms.length;
            if (count === 0) return null;
            const selected = tab === item.id;
            return (
              <button
                aria-selected={selected}
                className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                  selected
                    ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-50"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/18 hover:text-zinc-200"
                }`}
                key={item.id}
                onClick={() => setTab(item.id)}
                role="tab"
                type="button"
              >
                <span aria-hidden className="mr-1">
                  {item.emoji}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>

        {activeSection.terms.length > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-zinc-300">{activeSection.title}</p>
            <Link
              className="text-[11px] font-semibold text-cyan-200 hover:text-cyan-100"
              href={activeSection.seeAllHref}
            >
              Xem tất cả
            </Link>
          </div>
        ) : null}

        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5">
          {activeSection.terms.slice(0, 14).map((term) => (
            <TaxonomyScrollCard
              href={term.href}
              key={term.id}
              name={term.name}
              sectionKey={activeSection.key}
              slug={term.slug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
