"use client";

import { useMemo, useState } from "react";
import {
  previewMetadataTemplate,
  SEO_METADATA_TEMPLATES,
  validateMetadataTemplate
} from "@/lib/seo/content-hub-seo-data";
import { SEO_PREVIEW_SAMPLE_DATA } from "@/lib/seo/seo-preview-samples";

const SAMPLE_DATA: Record<string, string> = SEO_PREVIEW_SAMPLE_DATA;

export function SeoMetadataTemplatesPanel() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const template = SEO_METADATA_TEMPLATES[selectedIndex];

  const titlePreview = useMemo(
    () => previewMetadataTemplate(template.titleTemplate, SAMPLE_DATA),
    [template.titleTemplate]
  );
  const descriptionPreview = useMemo(
    () => previewMetadataTemplate(template.descriptionTemplate, SAMPLE_DATA),
    [template.descriptionTemplate]
  );

  const titleError = validateMetadataTemplate(template.titleTemplate, template.variables);
  const descriptionError = validateMetadataTemplate(template.descriptionTemplate, template.variables);
  const titleTooLong = titlePreview.length > 60;
  const descriptionIssue =
    descriptionPreview.length < 50 || descriptionPreview.length > 160 ? "length" : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/60 p-3">
        {SEO_METADATA_TEMPLATES.map((item, index) => (
          <button
            className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
              index === selectedIndex
                ? "bg-cyan-400/10 text-cyan-100"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
            key={item.pageGroup}
            onClick={() => setSelectedIndex(index)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </aside>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-semibold text-white">{template.label}</h2>

        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Title template</p>
            <p className="mt-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200">
              {template.titleTemplate}
            </p>
            {titleError ? <p className="mt-1 text-xs text-red-300">{titleError}</p> : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Description template</p>
            <p className="mt-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200">
              {template.descriptionTemplate}
            </p>
            {descriptionError ? <p className="mt-1 text-xs text-red-300">{descriptionError}</p> : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Biến có thể dùng</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {template.variables.length > 0 ? (
                template.variables.map((variable) => (
                  <span
                    className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-100"
                    key={variable}
                  >
                    {`{${variable}}`}
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-500">Không dùng biến động</span>
              )}
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <h3 className="text-sm font-semibold text-cyan-100">Preview</h3>
          <p className="mt-2 text-base font-medium text-white">{titlePreview}</p>
          <p
            className={`mt-1 text-sm ${titleTooLong ? "text-amber-200" : "text-zinc-400"}`}
          >
            {titlePreview.length} ký tự {titleTooLong ? "· Title hơi dài (>60)" : ""}
          </p>
          <p className="mt-3 text-sm text-zinc-300">{descriptionPreview}</p>
          <p
            className={`mt-1 text-xs ${descriptionIssue ? "text-amber-200" : "text-zinc-500"}`}
          >
            {descriptionPreview.length} ký tự
            {descriptionIssue === "length" ? " · Nên từ 50–160 ký tự" : ""}
          </p>
        </section>

        <p className="text-xs text-zinc-500">
          Template thực tế lưu trong SEO rules hoặc metadata builder — panel này là checklist tham
          chiếu cho admin.
        </p>
      </div>
    </div>
  );
}
