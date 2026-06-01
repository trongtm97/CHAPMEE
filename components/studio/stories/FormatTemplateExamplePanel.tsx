"use client";

import { useMemo, useState } from "react";
import type { StoryFormFormatTemplateOption } from "@/lib/creator/get-story-form-taxonomy";
import { stringifyStructuredTemplate } from "@/lib/presentation/template-json";
import { isPresentationMode } from "@/lib/presentation/constants";

type FormatTemplateExamplePanelProps = {
  presentationMode: string;
  formatTemplateId: string;
  templates: StoryFormFormatTemplateOption[];
};

export function FormatTemplateExamplePanel({
  formatTemplateId,
  presentationMode,
  templates
}: FormatTemplateExamplePanelProps) {
  const [open, setOpen] = useState(false);

  const selected = templates.find((template) => template.id === formatTemplateId);
  const previewJson = useMemo(() => {
    if (!selected?.exampleJson || !isPresentationMode(presentationMode)) {
      return null;
    }
    return stringifyStructuredTemplate(presentationMode, selected.exampleJson);
  }, [presentationMode, selected]);

  if (!selected || !previewJson) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-3">
      <button
        className="text-xs font-semibold text-cyan-200 hover:text-cyan-100"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Ẩn" : "Xem"} mẫu JSON chương ({selected.name})
      </button>
      {open ? (
        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/40 p-2 text-[0.65rem] leading-relaxed text-zinc-300">
          {previewJson}
        </pre>
      ) : null}
      <p className="mt-2 text-[0.65rem] text-zinc-500">
        Khi soạn chương: chọn tab Cấu trúc → Chèn mẫu (ưu tiên mẫu này nếu đã chọn ở truyện).
      </p>
    </div>
  );
}
