"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildCatalogViewHref, type CatalogViewState } from "@/lib/stories/story-filters";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";

type FilterDropdownParamKey = "genre" | keyof StoryCatalogFilterParams;

type StoryCatalogFilterDropdownProps = {
  label: string;
  activeName?: string | null;
  options: Array<{ slug: string; name: string }>;
  paramKey: FilterDropdownParamKey;
  state: CatalogViewState;
  searchable?: boolean;
};

function readCurrentValue(state: CatalogViewState, paramKey: FilterDropdownParamKey) {
  if (paramKey === "genre") {
    return state.genre || state.filters.genre || "";
  }
  const value = state.filters[paramKey];
  return typeof value === "string" ? value : "";
}

export function StoryCatalogFilterDropdown({
  activeName,
  label,
  options,
  paramKey,
  searchable = false,
  state
}: StoryCatalogFilterDropdownProps) {
  const router = useRouter();
  const [, startNavigation] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const isActive = Boolean(activeName);

  useEffect(() => {
    if (!open) return;
    setDraft(readCurrentValue(state, paramKey));
    setSearch("");
  }, [open, paramKey, state]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (item) => item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [options, search]);

  function apply() {
    let href: string;
    if (paramKey === "genre") {
      href = buildCatalogViewHref(state, { genre: draft || undefined, page: 1 });
    } else {
      href = buildCatalogViewHref(state, {
          [paramKey]: draft || undefined,
          page: 1
        } as Partial<StoryCatalogFilterParams>);
    }
    startNavigation(() => router.push(href));
    setOpen(false);
  }

  function clearGroup() {
    let href: string;
    if (paramKey === "genre") {
      href = buildCatalogViewHref(state, { genre: undefined, page: 1 });
    } else {
      href = buildCatalogViewHref(state, { [paramKey]: undefined, page: 1 });
    }
    startNavigation(() => router.push(href));
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        className={`inline-flex h-8 max-w-[10rem] items-center gap-1 truncate rounded-lg border px-2.5 text-[11px] font-semibold transition md:max-w-[11rem] md:text-xs ${
          isActive
            ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-50"
            : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/18 hover:text-zinc-100"
        }`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{activeName ? `${label}: ${activeName}` : label}</span>
        <span aria-hidden className="text-[10px] text-zinc-500">
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-60 rounded-xl border border-white/12 bg-[#0b1016] p-2 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.85)]">
          {searchable ? (
            <AppSearchField
              inputClassName="h-8 text-xs"
              onChange={setSearch}
              placeholder="Tìm…"
              showSubmit={false}
              value={search}
              variant="field"
            />
          ) : null}

          <ul className="catalog-panel-scroll mt-2 max-h-44 space-y-0.5 overflow-y-auto">
            <li>
              <button
                className={`flex w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  !draft ? "bg-cyan-300/15 text-cyan-50" : "text-zinc-300 hover:bg-white/[0.04]"
                }`}
                onClick={() => setDraft("")}
                type="button"
              >
                Tất cả
              </button>
            </li>
            {filteredOptions.slice(0, 40).map((item) => (
              <li key={item.slug}>
                <button
                  className={`flex w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    draft === item.slug
                      ? "bg-cyan-300/15 text-cyan-50"
                      : "text-zinc-300 hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setDraft(item.slug)}
                  type="button"
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex gap-1.5 border-t border-white/8 pt-2">
            <button
              className="h-8 flex-1 rounded-lg border border-white/10 text-[11px] font-semibold text-zinc-300"
              onClick={clearGroup}
              type="button"
            >
              Xóa nhóm
            </button>
            <button
              className="h-8 flex-1 rounded-lg bg-cyan-300 text-[11px] font-bold text-zinc-950"
              onClick={apply}
              type="button"
            >
              Áp dụng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
