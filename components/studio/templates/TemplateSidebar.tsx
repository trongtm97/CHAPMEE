"use client";

import type { StudioTemplateListItem } from "@/types/templates";
import { tplCard } from "@/components/studio/templates/shared/styles";
import { STUDIO_TEMPLATE_TYPE_LABELS } from "@/lib/studio/template-labels";

type TemplateSidebarProps = {
  favoriteTemplates: StudioTemplateListItem[];
  onSelect: (template: StudioTemplateListItem) => void;
  recentTemplates: StudioTemplateListItem[];
};

export function TemplateSidebar({
  favoriteTemplates,
  onSelect,
  recentTemplates
}: TemplateSidebarProps) {
  return (
    <aside className="hidden space-y-4 xl:block">
      <section className={`${tplCard} p-4`}>
        <h2 className="text-sm font-bold text-white">Yêu thích</h2>
        {favoriteTemplates.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Chưa có mẫu yêu thích.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {favoriteTemplates.slice(0, 5).map((item) => (
              <li key={item.id}>
                <button
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left hover:border-white/20"
                  onClick={() => onSelect(item)}
                  type="button"
                >
                  <p className="truncate text-sm font-medium text-zinc-200">{item.title}</p>
                  <p className="text-[10px] text-zinc-500">
                    {STUDIO_TEMPLATE_TYPE_LABELS[item.templateType]}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${tplCard} p-4`}>
        <h2 className="text-sm font-bold text-white">Dùng gần đây</h2>
        {recentTemplates.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Chưa có hoạt động gần đây.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentTemplates.slice(0, 5).map((item) => (
              <li key={item.id}>
                <button
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left hover:border-white/20"
                  onClick={() => onSelect(item)}
                  type="button"
                >
                  <p className="truncate text-sm font-medium text-zinc-200">{item.title}</p>
                  <p className="text-[10px] text-zinc-500">
                    {STUDIO_TEMPLATE_TYPE_LABELS[item.templateType]}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${tplCard} p-4`}>
        <h2 className="text-sm font-bold text-white">Mẹo dùng mẫu</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-zinc-500">
          <li>Nhân bản mẫu ChapMee rồi chỉnh theo giọng truyện của bạn.</li>
          <li>Dùng placeholder như tên truyện, chương khi soạn.</li>
          <li>Reels: giữ hook ngắn, CTA rõ.</li>
        </ul>
      </section>
    </aside>
  );
}
