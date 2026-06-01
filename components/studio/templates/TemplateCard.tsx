"use client";

import { useState, useTransition } from "react";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import {
  tplBtnCompact,
  tplBtnCompactPrimary,
  tplCard
} from "@/components/studio/templates/shared/styles";
import { STUDIO_TEMPLATE_TYPE_LABELS } from "@/lib/studio/template-labels";
import {
  incrementTemplateUsage,
  pushTemplateRecent,
  toggleTemplateFavorite
} from "@/lib/studio/template-preferences";
import type { StudioTemplateListItem } from "@/types/templates";

type TemplateCardProps = {
  isFavorite: boolean;
  onDelete?: (template: StudioTemplateListItem) => void;
  onDuplicate: (template: StudioTemplateListItem) => void;
  onEdit?: (template: StudioTemplateListItem) => void;
  onFavoriteChange: () => void;
  onUse: (template: StudioTemplateListItem) => void;
  onView: (template: StudioTemplateListItem) => void;
  template: StudioTemplateListItem;
  usageCount: number;
};

export function TemplateCard({
  isFavorite,
  onDelete,
  onDuplicate,
  onEdit,
  onFavoriteChange,
  onUse,
  onView,
  template,
  usageCount
}: TemplateCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFavorite() {
    toggleTemplateFavorite(template.id);
    onFavoriteChange();
  }

  function handleView() {
    pushTemplateRecent(template.id, "view");
    onFavoriteChange();
    onView(template);
  }

  function handleUse() {
    incrementTemplateUsage(template.id);
    pushTemplateRecent(template.id, "use");
    onFavoriteChange();
    onUse(template);
  }

  const menuItems = [
    {
      type: "action" as const,
      label: "Xem",
      onAction: async () => {
        handleView();
        return { ok: true };
      }
    },
    {
      type: "action" as const,
      label: "Nhân bản",
      onAction: async () => {
        onDuplicate(template);
        return { ok: true };
      }
    },
    ...(onEdit
      ? [
          {
            type: "action" as const,
            label: "Sửa",
            onAction: async () => {
              onEdit(template);
              return { ok: true };
            }
          }
        ]
      : []),
    ...(onDelete
      ? [
          {
            type: "action" as const,
            label: "Xóa",
            destructive: true,
            confirmMessage:
              "Xóa mẫu này? Hành động này không ảnh hưởng đến truyện/chương đã dùng mẫu trước đó.",
            onAction: async () => {
              onDelete(template);
              return { ok: true };
            }
          }
        ]
      : [])
  ];

  return (
    <article className={`${tplCard} flex flex-col p-4 ${isFavorite ? "ring-1 ring-cyan-400/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
            {template.isSystem ? "ChapMee" : "Của tôi"}
          </span>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
            {STUDIO_TEMPLATE_TYPE_LABELS[template.templateType]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
            className={`min-h-10 min-w-10 rounded-lg text-lg leading-none ${
              isFavorite ? "text-amber-300" : "text-zinc-600 hover:text-amber-200"
            }`}
            onClick={handleFavorite}
            type="button"
          >
            {isFavorite ? "★" : "☆"}
          </button>
          <StudioRowActionMenu ariaLabel="Tùy chọn mẫu" items={menuItems} />
        </div>
      </div>

      <h3 className="mt-2 line-clamp-2 text-base font-bold text-white">{template.title}</h3>

      {template.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{template.description}</p>
      ) : null}

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-500">
        {template.plainText || "—"}
      </p>

      {usageCount > 0 ? (
        <p className="mt-2 text-xs text-zinc-600">Đã dùng {usageCount} lần</p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button className={tplBtnCompactPrimary} onClick={handleUse} type="button">
          Dùng mẫu
        </button>
        <button className={tplBtnCompact} onClick={handleView} type="button">
          Xem
        </button>
        <button
          className={tplBtnCompact}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => onDuplicate(template));
          }}
          type="button"
        >
          Nhân bản
        </button>
        {onEdit ? (
          <button className={tplBtnCompact} onClick={() => onEdit(template)} type="button">
            Sửa
          </button>
        ) : null}
      </div>
    </article>
  );
}
