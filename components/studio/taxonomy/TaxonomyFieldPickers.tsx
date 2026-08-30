"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchableSelect } from "@/components/studio/taxonomy/SearchableSelect";
import { STORY_TAXONOMY_LIMITS, TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import { sortTaxonomyTermsForPicker } from "@/lib/taxonomy/sort-terms-for-picker";
import { presentationModeDescription } from "@/lib/taxonomy/presentation-labels";
import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

function termOptions(terms: TaxonomyTerm[], type: TaxonomyType, useSlug = false) {
  return sortTaxonomyTermsForPicker(terms, type).map((term) => ({
    value: useSlug ? term.slug : term.id,
    label: term.display_label ?? term.name,
    description: term.description,
    featured: term.is_featured
  }));
}

export function TaxonomySinglePicker({
  type,
  terms,
  disabled,
  value,
  onChange,
  required = false
}: {
  type: TaxonomyType;
  terms: TaxonomyTerm[];
  disabled?: boolean;
  value: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  const isPresentation = type === "presentation_mode";
  const name = isPresentation ? "presentation_mode" : "taxonomy_terms";

  return (
    <SearchableSelect
      disabled={disabled}
      emptyMessage="Không thấy mục phù hợp — thử từ khóa khác hoặc gửi đề xuất."
      inputName={name}
      label={
        <>
          {TAXONOMY_TYPE_LABELS[type]}
          {required ? <span className="text-red-300"> *</span> : null}
        </>
      }
      onChange={(next) => onChange?.(next)}
      options={termOptions(terms, type, isPresentation)}
      placeholder={`Tìm hoặc chọn ${TAXONOMY_TYPE_LABELS[type].toLowerCase()}…`}
      required={required}
      value={value}
    />
  );
}

export function TaxonomyMultiPicker({
  type,
  terms,
  disabled,
  selectedIds,
  max,
  onChange
}: {
  type: TaxonomyType;
  terms: TaxonomyTerm[];
  disabled?: boolean;
  selectedIds: string[];
  max?: number;
  onChange?: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const limit = max ?? STORY_TAXONOMY_LIMITS[type]?.max;
  const termIdSet = useMemo(() => new Set(terms.map((term) => term.id)), [terms]);
  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => termIdSet.has(id)),
    [selectedIds, termIdSet]
  );
  const selectedSet = useMemo(
    () => new Set(visibleSelectedIds),
    [visibleSelectedIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = sortTaxonomyTermsForPicker(terms, type);
    if (!q) return sorted;
    return sorted.filter((t) =>
      `${t.name} ${t.slug} ${t.display_label ?? ""}`.toLowerCase().includes(q)
    );
  }, [query, terms]);

  const selectedTerms = terms.filter((term) => selectedSet.has(term.id));
  const selectedCount = selectedTerms.length;

  function toggle(termId: string) {
    const next = new Set(selectedSet);
    if (next.has(termId)) {
      next.delete(termId);
    } else if (!limit || next.size < limit) {
      next.add(termId);
    }
    onChange?.([...next]);
  }

  function remove(termId: string) {
    onChange?.(visibleSelectedIds.filter((id) => id !== termId));
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-zinc-200">
          {TAXONOMY_TYPE_LABELS[type]}
        </span>
        {limit ? (
          <span className="text-xs text-zinc-500">
            {selectedCount}/{limit}
          </span>
        ) : null}
      </div>

      {selectedTerms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedTerms.map((term) => (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100"
              key={term.id}
            >
              {term.display_label ?? term.name}
              <button
                aria-label={`Xóa ${term.name}`}
                className="text-cyan-200/80 hover:text-white"
                disabled={disabled}
                onClick={() => remove(term.id)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {visibleSelectedIds.map((id) => (
        <input key={id} name="taxonomy_terms" type="hidden" value={id} />
      ))}

      <input
        className="min-h-9 w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Tìm hoặc chọn ${TAXONOMY_TYPE_LABELS[type].toLowerCase()}…`}
        type="search"
        value={query}
      />

      <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
        {filtered.map((term) => {
          const checked = selectedSet.has(term.id);
          const atLimit = Boolean(limit && selectedCount >= limit && !checked);
          return (
            <button
              className={`rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:opacity-40 ${
                checked
                  ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-zinc-950/60 text-zinc-200 hover:border-white/20"
              }`}
              disabled={disabled || atLimit}
              key={term.id}
              onClick={() => toggle(term.id)}
              title={term.description ?? undefined}
              type="button"
            >
              {term.display_label ?? term.name}
              {term.is_featured ? (
                <span className="ml-1 text-[10px] text-cyan-300">★</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {limit && selectedCount >= limit ? (
        <p className="text-xs text-amber-200/90">Đã đạt giới hạn {limit} mục.</p>
      ) : null}
    </div>
  );
}

export function TaxonomyPresentationHint({ mode }: { mode: string }) {
  const hint = presentationModeDescription(mode);
  if (!hint) return null;
  return <p className="text-xs text-zinc-500">{hint}</p>;
}
