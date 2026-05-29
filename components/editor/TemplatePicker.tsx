"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { insertTemplateIntoContent } from "@/lib/editor/insert-template";
import { getTemplateBody } from "@/lib/studio/template-content";
import { STUDIO_TEMPLATE_TYPE_LABELS } from "@/lib/studio/template-labels";
import { listTemplatesForPickerAction } from "@/lib/studio/template-actions";
import type { StudioTemplateRecord, StudioTemplateType } from "@/types/templates";

type TemplatePickerProps = {
  content: string;
  defaultType?: StudioTemplateType | "all";
  initialTemplateId?: string | null;
  onClose: () => void;
  onInsert: (nextContent: string) => void;
  open: boolean;
  textareaRef: React.RefObject<{ getTextarea: () => HTMLTextAreaElement | null } | null>;
};

export function TemplatePicker({
  content,
  defaultType = "chapter",
  initialTemplateId,
  onClose,
  onInsert,
  open,
  textareaRef
}: TemplatePickerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StudioTemplateType | "all">(defaultType);
  const [templates, setTemplates] = useState<StudioTemplateRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplateId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    startTransition(async () => {
      const result = await listTemplatesForPickerAction({
        search,
        templateType: typeFilter
      });

      if (result.error) {
        setError(result.error);
        setTemplates([]);
        return;
      }

      setError(null);
      setTemplates(result.templates);
    });
  }, [open, search, typeFilter]);

  useEffect(() => {
    if (open && initialTemplateId) {
      setSelectedId(initialTemplateId);
    }
  }, [initialTemplateId, open]);

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [selectedId, templates]
  );

  const previewBody = selected ? getTemplateBody(selected.content) : "";

  if (!open) {
    return null;
  }

  function performInsert(confirmed = false) {
    if (!selected) {
      return;
    }

    const body = getTemplateBody(selected.content);

    if (!body) {
      setError("Mẫu không có nội dung.");
      return;
    }

    if (content.trim() && !confirmed) {
      const ok = window.confirm(
        "Chèn mẫu sẽ thêm nội dung vào chương hiện tại, không ghi đè. Tiếp tục?"
      );

      if (!ok) {
        return;
      }
    }

    const textarea = textareaRef.current?.getTextarea();
    const selectionStart = textarea?.selectionStart ?? content.length;
    const selectionEnd = textarea?.selectionEnd ?? content.length;
    const next = insertTemplateIntoContent({
      content,
      selectionEnd,
      selectionStart,
      templateBody: body
    });

    onInsert(next);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-white/10 bg-zinc-950 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-bold text-white">Chèn mẫu</h2>
          <button
            className="text-sm text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <Input
              label="Tìm kiếm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên hoặc mô tả mẫu..."
              value={search}
            />

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-500">Loại mẫu</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
                onChange={(event) =>
                  setTypeFilter(event.target.value as StudioTemplateType | "all")
                }
                value={typeFilter}
              >
                <option value="all">Tất cả loại</option>
                {Object.entries(STUDIO_TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {isPending && templates.length === 0 ? (
                <p className="text-sm text-zinc-500">Đang tải mẫu...</p>
              ) : null}
              {templates.map((template) => (
                <button
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selectedId === template.id
                      ? "border-sky-400/50 bg-sky-400/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                  }`}
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-white">{template.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {template.isSystem ? "Mẫu của ChapMee" : "Mẫu của tôi"} ·{" "}
                    {STUDIO_TEMPLATE_TYPE_LABELS[template.templateType]}
                  </p>
                </button>
              ))}
              {!isPending && templates.length === 0 ? (
                <p className="text-sm text-zinc-500">Không có mẫu phù hợp.</p>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
              Xem trước
            </p>
            <div className="min-h-[12rem] flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-7 text-zinc-200 whitespace-pre-wrap">
              {previewBody || "Chọn một mẫu để xem nội dung."}
            </div>
            {selected?.description ? (
              <p className="text-xs text-zinc-500">{selected.description}</p>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-2 text-sm text-rose-100">
                {error}
              </p>
            ) : null}
            <Button disabled={!selected} onClick={() => performInsert()} type="button">
              Chèn vào chương
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
