"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { StudioTemplateCard } from "@/components/studio/templates/StudioTemplateCard";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { TemplateFormDialog } from "@/components/studio/templates/TemplateFormDialog";
import { Button, EmptyState, Input } from "@/components/ui";
import { getTemplateBody } from "@/lib/studio/template-content";
import { getTemplateDetailAction } from "@/lib/studio/template-actions";
import { STUDIO_TEMPLATE_TYPE_LABELS } from "@/lib/studio/template-labels";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioTemplateListItem,
  StudioTemplateRecord,
  StudioTemplateTab,
  StudioTemplateTypeFilter
} from "@/types/templates";
const TAB_OPTIONS: Array<{ label: string; value: StudioTemplateTab }> = [
  { label: "Mẫu của ChapMee", value: "system" },
  { label: "Mẫu của tôi", value: "mine" }
];

const TYPE_TABS: Array<{ label: string; value: StudioTemplateTypeFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Chương", value: "chapter" },
  { label: "Mô tả truyện", value: "story_description" },
  { label: "Ghi chú tác giả", value: "author_note" },
  { label: "Swipe", value: "swipe" },
  { label: "SEO", value: "seo" },
  { label: "Bài cộng đồng", value: "community_post" }
];

type StudioTemplatesPageProps = {
  activeTab: StudioTemplateTab;
  activeType: StudioTemplateTypeFilter;
  search: string;
  tabCounts: Record<StudioTemplateTab, number>;
  templates: StudioTemplateListItem[];
};

export function StudioTemplatesPage({
  activeTab,
  activeType,
  search,
  tabCounts,
  templates
}: StudioTemplatesPageProps) {
  const router = useRouter();
  const basePath = studioPath("/templates");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<StudioTemplateRecord | null>(null);
  const [viewing, setViewing] = useState<StudioTemplateRecord | null>(null);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(item: StudioTemplateListItem) {
    startTransition(async () => {
      const detail = await getTemplateDetailAction(item.id);

      if (!detail.template) {
        window.alert(detail.error ?? "Không tải được mẫu.");
        return;
      }

      setFormMode("edit");
      setEditing(detail.template);
      setFormOpen(true);
    });
  }

  function handleView(item: StudioTemplateListItem) {
    startTransition(async () => {
      const detail = await getTemplateDetailAction(item.id);

      if (!detail.template) {
        window.alert(detail.error ?? "Không tải được mẫu.");
        return;
      }

      setViewing(detail.template);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {TAB_OPTIONS.map((tab) => {
              const isActive = activeTab === tab.value;

              return (
                <Link
                  className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-sky-300 bg-sky-300 text-zinc-950"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                  href={buildStudioManagerHref(basePath, {
                    q: search || undefined,
                    tab: tab.value === "system" ? undefined : "mine",
                    type: activeType === "all" ? undefined : activeType
                  })}
                  key={tab.value}
                >
                  {tab.label} ({tabCounts[tab.value]})
                </Link>
              );
            })}
          </div>
        </div>
        <Button onClick={openCreate} type="button">
          Tạo mẫu
        </Button>
      </div>

      <form
        action={basePath}
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
        method="get"
      >
        <Input
          defaultValue={search}
          label="Tìm kiếm"
          name="q"
          placeholder="Tên, mô tả hoặc nội dung mẫu..."
        />
        {activeTab !== "system" ? <input name="tab" type="hidden" value="mine" /> : null}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-300">Loại mẫu</span>
          <select
            className="w-full min-w-[10rem] rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm"
            defaultValue={activeType}
            name="type"
          >
            {TYPE_TABS.map((tab) => (
              <option key={tab.value} value={tab.value}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button className="flex-1" type="submit">
            Tìm
          </Button>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100"
            href={basePath}
          >
            Xóa lọc
          </a>
        </div>
      </form>

      {templates.length === 0 ? (
        <EmptyState
          description={
            search || activeType !== "all"
              ? "Thử đổi từ khóa hoặc bộ lọc."
              : activeTab === "mine"
                ? "Tạo mẫu đầu tiên hoặc nhân bản từ mẫu của ChapMee."
                : "Chưa có mẫu hệ thống — chạy migration 076."
          }
          title="Chưa có mẫu"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <StudioTemplateCard
              key={template.id}
              onEdit={template.isSystem ? undefined : handleEdit}
              onRefresh={refresh}
              onView={handleView}
              template={template}
            />
          ))}
        </div>
      )}

      <TemplateFormDialog
        mode={formMode}
        onClose={() => setFormOpen(false)}
        onSuccess={refresh}
        open={formOpen}
        template={editing}
      />

      {viewing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">
                  {viewing.isSystem ? "Mẫu của ChapMee" : "Mẫu của tôi"} ·{" "}
                  {STUDIO_TEMPLATE_TYPE_LABELS[viewing.templateType]}
                </p>
                <h2 className="text-lg font-bold text-white">{viewing.title}</h2>
              </div>
              <button
                className="text-sm text-zinc-400"
                onClick={() => setViewing(null)}
                type="button"
              >
                Đóng
              </button>
            </div>
            {viewing.description ? (
              <p className="mb-3 text-sm text-zinc-400">{viewing.description}</p>
            ) : null}
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-7 text-zinc-200">
              {getTemplateBody(viewing.content)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
