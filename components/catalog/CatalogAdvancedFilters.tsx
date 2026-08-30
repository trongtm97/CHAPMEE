"use client";

import { useState } from "react";
import { CatalogMobileFilterSheet } from "@/components/catalog/CatalogMobileFilterSheet";
import type { CatalogAdvancedFieldDef } from "@/lib/catalog/types";

type CatalogAdvancedFiltersProps = {
  fields: CatalogAdvancedFieldDef[];
  values: Record<string, string | undefined>;
  onApply: (values: Record<string, string | undefined>) => void;
};

export function CatalogAdvancedFilters({ fields, values, onApply }: CatalogAdvancedFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasAdvanced = fields.some((f) => Boolean(values[f.paramKey]?.trim()));

  const formFields = (
    <div className="space-y-3">
      {fields.map((field) => (
        <label className="block space-y-1 text-sm" key={field.id}>
          <span className="font-medium text-zinc-300">{field.label}</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            defaultValue={values[field.paramKey] ?? ""}
            name={field.paramKey}
            placeholder={field.placeholder}
          />
        </label>
      ))}
    </div>
  );

  function submitForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    const next: Record<string, string | undefined> = {};
    for (const field of fields) {
      const val = (fd.get(field.paramKey) as string)?.trim();
      next[field.paramKey] = val || undefined;
    }
    onApply(next);
    setSheetOpen(false);
  }

  return (
    <>
      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitForm(event.currentTarget);
          }}
        >
          {formFields}
          <button
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
            type="submit"
          >
            Áp dụng
          </button>
        </form>
      </div>

      <button
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold lg:hidden ${
          hasAdvanced
            ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
            : "border-white/15 text-zinc-300"
        }`}
        onClick={() => setSheetOpen(true)}
        type="button"
      >
        Lọc nâng cao{hasAdvanced ? " · đang bật" : ""}
      </button>

      <CatalogMobileFilterSheet onClose={() => setSheetOpen(false)} open={sheetOpen}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitForm(event.currentTarget);
          }}
        >
          {formFields}
          <button
            className="w-full rounded-lg bg-cyan-400 py-2.5 text-sm font-semibold text-zinc-950"
            type="submit"
          >
            Áp dụng bộ lọc
          </button>
        </form>
      </CatalogMobileFilterSheet>
    </>
  );
}
