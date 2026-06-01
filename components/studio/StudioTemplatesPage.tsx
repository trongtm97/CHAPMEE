"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { TemplateCard } from "@/components/studio/templates/TemplateCard";
import { TemplateEmptyState } from "@/components/studio/templates/TemplateEmptyState";
import { TemplateFilters } from "@/components/studio/templates/TemplateFilters";
import { TemplateFormDialog } from "@/components/studio/templates/TemplateFormDialog";
import { TemplateHeader } from "@/components/studio/templates/TemplateHeader";
import { TemplatePreviewPanel } from "@/components/studio/templates/TemplatePreviewPanel";
import { TemplateSidebar } from "@/components/studio/templates/TemplateSidebar";
import { TemplateStats } from "@/components/studio/templates/TemplateStats";
import { TemplateTabs } from "@/components/studio/templates/TemplateTabs";
import { TemplateUseModal } from "@/components/studio/templates/TemplateUseModal";
import { useTemplateLibrary } from "@/components/studio/templates/useTemplateLibrary";
import { tplCard } from "@/components/studio/templates/shared/styles";
import {
  deleteTemplateAction,
  duplicateTemplateAction,
  getTemplateDetailAction
} from "@/lib/studio/template-actions";
import { getTemplateBody } from "@/lib/studio/template-content";
import { getTemplateRecent } from "@/lib/studio/template-preferences";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioTemplateCategoryFilter,
  StudioTemplateListItem,
  StudioTemplateRecord,
  StudioTemplateSort,
  StudioTemplateTab
} from "@/types/templates";

type StudioTemplatesPageProps = {
  activeCategory: StudioTemplateCategoryFilter;
  activeSort: StudioTemplateSort;
  activeTab: StudioTemplateTab;
  allTemplates: StudioTemplateListItem[];
  mineCount: number;
  query: Record<string, string | undefined>;
  search: string;
  systemCount: number;
};

function toListItem(record: StudioTemplateRecord): StudioTemplateListItem {
  return {
    description: record.description,
    id: record.id,
    isSystem: record.isSystem,
    plainText: record.plainText,
    templateType: record.templateType,
    title: record.title,
    updatedAt: record.updatedAt
  };
}

export function StudioTemplatesPage({
  activeCategory,
  activeSort,
  activeTab,
  allTemplates,
  mineCount,
  query,
  search,
  systemCount
}: StudioTemplatesPageProps) {
  const router = useRouter();
  const basePath = studioPath("/templates");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<StudioTemplateRecord | null>(null);
  const [preview, setPreview] = useState<StudioTemplateRecord | null>(null);
  const [useTarget, setUseTarget] = useState<StudioTemplateListItem | null>(null);
  const [useBody, setUseBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const library = useTemplateLibrary({
    activeCategory,
    activeTab,
    allTemplates,
    mineCount,
    search,
    sort: activeSort,
    systemCount
  });

  const tabCounts = useMemo(
    () => ({
      favorites: library.stats.favoriteCount,
      mine: mineCount,
      recent: library.stats.recentCount,
      system: systemCount
    }),
    [library.stats, mineCount, systemCount]
  );

  const favoriteTemplates = useMemo(
    () => allTemplates.filter((t) => library.isFavorite(t.id)),
    [allTemplates, library]
  );

  const sidebarRecent = useMemo(() => {
    const ids = getTemplateRecent().map((entry) => entry.templateId);

    return ids
      .map((id) => allTemplates.find((template) => template.id === id))
      .filter((template): template is StudioTemplateListItem => Boolean(template));
  }, [allTemplates]);

  const refresh = useCallback(() => {
    library.refreshPrefs();
    router.refresh();
  }, [library, router]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  }

  async function loadDetail(id: string) {
    const detail = await getTemplateDetailAction(id);

    if (!detail.template) {
      showToast(detail.error ?? "Không tải được mẫu.");
      return null;
    }

    return detail.template;
  }

  function handleView(item: StudioTemplateListItem) {
    startTransition(async () => {
      const template = await loadDetail(item.id);

      if (template) {
        setPreview(template);
      }
    });
  }

  function handleEdit(item: StudioTemplateListItem) {
    startTransition(async () => {
      const template = await loadDetail(item.id);

      if (template) {
        setFormMode("edit");
        setEditing(template);
        setFormOpen(true);
      }
    });
  }

  function handleUse(item: StudioTemplateListItem) {
    startTransition(async () => {
      const detail = await getTemplateDetailAction(item.id);

      if (!detail.template) {
        showToast(detail.error ?? "Không tải được mẫu.");
        return;
      }

      setUseBody(getTemplateBody(detail.template.content));
      setUseTarget(item);
    });
  }

  function handleDuplicate(item: StudioTemplateListItem) {
    startTransition(async () => {
      const result = await duplicateTemplateAction(item.id);

      if (!result.ok) {
        showToast(result.error ?? "Không nhân bản được.");
        return;
      }

      showToast("Đã nhân bản vào Mẫu của tôi.");
      refresh();
    });
  }

  function handleDelete(item: StudioTemplateListItem) {
    startTransition(async () => {
      const result = await deleteTemplateAction(item.id);

      if (!result.ok) {
        showToast(result.error ?? "Không xóa được.");
        return;
      }

      if (preview?.id === item.id) {
        setPreview(null);
      }

      showToast("Đã xóa mẫu.");
      refresh();
    });
  }

  function openUseFromPreview(record: StudioTemplateRecord) {
    setUseTarget(toListItem(record));
    setUseBody(getTemplateBody(record.content));
    setPreview(null);
  }

  const hasFilters =
    Boolean(search) || activeCategory !== "all" || activeSort !== "newest";

  return (
    <div className="space-y-5 pb-8">
      {toast ? (
        <div
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-cyan-400/30 bg-zinc-900 px-4 py-2 text-sm font-medium text-cyan-100 shadow-lg lg:bottom-6"
        >
          {toast}
        </div>
      ) : null}

      <TemplateHeader onCreate={openCreate} />
      <TemplateStats stats={library.stats} />
      <TemplateTabs
        activeTab={activeTab}
        basePath={basePath}
        counts={tabCounts}
        query={query}
      />
      <TemplateFilters
        activeCategory={activeCategory}
        activeSort={activeSort}
        activeTab={activeTab}
        basePath={basePath}
        query={query}
        resultCount={library.resultCount}
        search={search}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {library.filtered.length === 0 ? (
            <TemplateEmptyState
              activeTab={activeTab}
              hasFilters={hasFilters}
              onCreate={openCreate}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {library.filtered.map((template) => (
                <TemplateCard
                  isFavorite={library.isFavorite(template.id)}
                  key={template.id}
                  onDelete={template.isSystem ? undefined : handleDelete}
                  onDuplicate={handleDuplicate}
                  onEdit={template.isSystem ? undefined : handleEdit}
                  onFavoriteChange={library.refreshPrefs}
                  onUse={handleUse}
                  onView={handleView}
                  template={template}
                  usageCount={library.usageCounts[template.id] ?? 0}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {preview ? (
            <div
              className={`${tplCard} fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto border-t border-white/10 p-4 xl:static xl:max-h-[calc(100vh-6rem)] xl:rounded-xl xl:border`}
            >
              <TemplatePreviewPanel
                onClose={() => setPreview(null)}
                onCopy={(body) => {
                  void navigator.clipboard.writeText(body);
                  showToast("Đã sao chép nội dung.");
                }}
                onDuplicateSuccess={() => {
                  showToast("Đã nhân bản vào Mẫu của tôi.");
                  refresh();
                }}
                onUse={() => openUseFromPreview(preview)}
                template={preview}
              />
            </div>
          ) : (
            <TemplateSidebar
              favoriteTemplates={favoriteTemplates}
              onSelect={handleView}
              recentTemplates={sidebarRecent}
            />
          )}
        </div>
      </div>

      <TemplateFormDialog
        mode={formMode}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          showToast(formMode === "create" ? "Đã lưu mẫu." : "Đã cập nhật mẫu.");
          refresh();
        }}
        open={formOpen}
        template={editing}
      />

      {useTarget ? (
        <TemplateUseModal
          body={useBody}
          onClose={() => setUseTarget(null)}
          onCopied={() => showToast("Đã sao chép mẫu.")}
          template={useTarget}
        />
      ) : null}
    </div>
  );
}
