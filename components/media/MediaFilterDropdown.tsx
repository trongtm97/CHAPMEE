"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildMediaHubHref, type MediaHubParams } from "@/lib/media/media-query-params";

export type MediaFilterParamKey =
  | "genre"
  | "subgenre"
  | "tag"
  | "character"
  | "relationship"
  | "narrativeStyle"
  | "mood"
  | "setting"
  | "format"
  | "contentType"
  | "ageRating"
  | "contentWarning"
  | "storyStatus";

type MediaFilterDropdownProps = {
  label: string;
  activeName?: string | null;
  options: Array<{ slug: string; name: string }>;
  paramKey: MediaFilterParamKey;
  params: MediaHubParams;
  searchable?: boolean;
};

function readValue(params: MediaHubParams, paramKey: MediaFilterParamKey) {
  return params[paramKey] ?? "";
}

export function MediaFilterDropdown({
  activeName,
  label,
  options,
  paramKey,
  params,
  searchable = false
}: MediaFilterDropdownProps) {
  const router = useRouter();
  const [, startNavigation] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const isActive = Boolean(activeName);

  useEffect(() => {
    if (!open) return;
    setDraft(readValue(params, paramKey));
    setSearch("");
  }, [open, paramKey, params]);

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
    const href = buildMediaHubHref(params.tab, {
      ...params,
      [paramKey]: draft || undefined,
      page: 1
    });
    startNavigation(() => router.push(href));
    setOpen(false);
  }

  function clearGroup() {
    const href = buildMediaHubHref(params.tab, {
      ...params,
      [paramKey]: undefined,
      page: 1
    });
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

          {options.length === 0 ? (
            <p className="mt-2 px-1 text-xs text-zinc-500">Chưa có dữ liệu lọc</p>
          ) : (
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
          )}

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
