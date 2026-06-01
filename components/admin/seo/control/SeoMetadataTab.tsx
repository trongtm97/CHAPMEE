"use client";

import { useMemo, useState, useTransition } from "react";
import { saveSeoMetadataTemplateAction } from "@/lib/admin/seo-control-data";
import {
  PAGE_TYPE_LABELS,
  previewSeoTemplate,
  SEO_TEMPLATE_VARIABLES,
  validateTemplateLength
} from "@/lib/seo/template-preview";
import type { AdminSeoCapabilities, SeoMetadataTemplate } from "@/types/admin-seo";

type Props = {
  templates: SeoMetadataTemplate[];
  capabilities: AdminSeoCapabilities;
  pending?: boolean;
  onRefresh: () => void;
  onToast: (message: string) => void;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500";

export function SeoMetadataTab({ templates, capabilities, onRefresh, onToast }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draft, setDraft] = useState<SeoMetadataTemplate | null>(null);
  const [pending, startTransition] = useTransition();

  const template = draft ?? templates[selectedIndex] ?? templates[0];
  if (!template) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-zinc-500">
        Chưa có mẫu metadata — chạy migration 141 để seed mặc định.
      </div>
    );
  }

  const titlePreview = useMemo(
    () => previewSeoTemplate(template.title_template),
    [template.title_template]
  );
  const descriptionPreview = useMemo(
    () => previewSeoTemplate(template.description_template),
    [template.description_template]
  );
  const lengthErrors = validateTemplateLength(template.title_template, template.description_template);

  function selectTemplate(index: number) {
    setSelectedIndex(index);
    setDraft(null);
  }

  function updateField<K extends keyof SeoMetadataTemplate>(key: K, value: SeoMetadataTemplate[K]) {
    setDraft({ ...(draft ?? template), [key]: value });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveSeoMetadataTemplateAction({
        page_type: template.page_type,
        title_template: template.title_template ?? undefined,
        description_template: template.description_template ?? undefined,
        og_title_template: template.og_title_template ?? undefined,
        og_description_template: template.og_description_template ?? undefined,
        robots_directive: template.robots_directive ?? undefined,
        canonical_mode: template.canonical_mode
      });
      onToast(result.message ?? "");
      if (result.ok) {
        setDraft(null);
        onRefresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
        {templates.map((item, index) => (
          <button
            className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
              index === selectedIndex && !draft
                ? "bg-cyan-400/10 text-cyan-100"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
            key={item.id}
            onClick={() => selectTemplate(index)}
            type="button"
          >
            {PAGE_TYPE_LABELS[item.page_type] ?? item.page_type}
          </button>
        ))}
      </aside>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {PAGE_TYPE_LABELS[template.page_type] ?? template.page_type}
          </h2>
          {capabilities.canUpdateRules ? (
            <div className="flex gap-2">
              <button
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                disabled={pending}
                onClick={handleSave}
                type="button"
              >
                {pending ? "Đang lưu…" : "Lưu mẫu"}
              </button>
            </div>
          ) : null}
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">SEO title template</span>
          <input
            className={inputClass}
            disabled={!capabilities.canUpdateRules}
            onChange={(event) => updateField("title_template", event.target.value)}
            value={template.title_template ?? ""}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">SEO description template</span>
          <textarea
            className={`${inputClass} min-h-[90px]`}
            disabled={!capabilities.canUpdateRules}
            onChange={(event) => updateField("description_template", event.target.value)}
            value={template.description_template ?? ""}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">OpenGraph title</span>
            <input
              className={inputClass}
              disabled={!capabilities.canUpdateRules}
              onChange={(event) => updateField("og_title_template", event.target.value)}
              value={template.og_title_template ?? ""}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">OpenGraph description</span>
            <input
              className={inputClass}
              disabled={!capabilities.canUpdateRules}
              onChange={(event) => updateField("og_description_template", event.target.value)}
              value={template.og_description_template ?? ""}
            />
          </label>
        </div>

        <div>
          <p className="text-xs text-zinc-500">Biến có thể dùng</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEO_TEMPLATE_VARIABLES.map((variable) => (
              <span
                className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-100"
                key={variable}
              >
                {`{{${variable}}}`}
              </span>
            ))}
          </div>
        </div>

        {lengthErrors.length > 0 ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {lengthErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        <section className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <h3 className="text-sm font-semibold text-cyan-100">Preview</h3>
          <p className="mt-2 text-base font-medium text-white">{titlePreview || "—"}</p>
          <p className="mt-1 text-xs text-zinc-500">{titlePreview.length} ký tự</p>
          <p className="mt-3 text-sm text-zinc-300">{descriptionPreview || "—"}</p>
          <p className="mt-1 text-xs text-zinc-500">{descriptionPreview.length} ký tự</p>
        </section>
      </div>
    </div>
  );
}
