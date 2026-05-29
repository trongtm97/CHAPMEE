"use client";

import { useState, useTransition } from "react";
import {
  deleteTemplateAction,
  duplicateTemplateAction
} from "@/lib/studio/template-actions";
import { STUDIO_TEMPLATE_TYPE_LABELS } from "@/lib/studio/template-labels";
import { setPendingTemplateInsert } from "@/lib/studio/pending-template";
import type { StudioTemplateListItem } from "@/types/templates";

type StudioTemplateCardProps = {
  onEdit?: (template: StudioTemplateListItem) => void;
  onRefresh: () => void;
  onView: (template: StudioTemplateListItem) => void;
  template: StudioTemplateListItem;
};

export function StudioTemplateCard({
  onEdit,
  onRefresh,
  onView,
  template
}: StudioTemplateCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Xóa mẫu "${template.title}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTemplateAction(template.id);

      if (!result.ok) {
        setError(result.error ?? "Không thể xóa mẫu.");
        return;
      }

      onRefresh();
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTemplateAction(template.id);

      if (!result.ok) {
        setError(result.error ?? "Không thể nhân bản mẫu.");
        return;
      }

      onRefresh();
    });
  }

  function handleUse() {
    setPendingTemplateInsert(template.id);
    window.alert(
      "Đã chọn mẫu. Mở trình soạn chương — hộp thoại Chèn mẫu sẽ hiện tự động (hoặc bấm Chèn mẫu trên thanh công cụ)."
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-500">
            {template.isSystem ? "Mẫu của ChapMee" : "Mẫu của tôi"} ·{" "}
            {STUDIO_TEMPLATE_TYPE_LABELS[template.templateType]}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-bold text-white">{template.title}</h3>
        </div>
      </div>

      {template.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{template.description}</p>
      ) : null}

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">
        {template.plainText || "—"}
      </p>

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          onClick={() => onView(template)}
          type="button"
        >
          Xem
        </button>
        <button
          className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-400/20"
          disabled={isPending}
          onClick={handleUse}
          type="button"
        >
          Dùng mẫu
        </button>
        {!template.isSystem && onEdit ? (
          <button
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            onClick={() => onEdit(template)}
            type="button"
          >
            Sửa
          </button>
        ) : null}
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          disabled={isPending}
          onClick={handleDuplicate}
          type="button"
        >
          Nhân bản
        </button>
        {!template.isSystem ? (
          <button
            className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-400/10"
            disabled={isPending}
            onClick={handleDelete}
            type="button"
          >
            Xóa mẫu
          </button>
        ) : null}
      </div>
    </article>
  );
}
