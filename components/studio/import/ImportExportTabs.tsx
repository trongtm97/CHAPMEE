"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ExportPanel } from "@/components/studio/import/ExportPanel";
import { StoryQuickPicker } from "@/components/studio/import/StoryQuickPicker";
import { ImportHistoryPanel } from "@/components/studio/import/ImportHistoryPanel";
import { ImportPanel } from "@/components/studio/import/ImportPanel";
import { ImportGuidePanel } from "@/components/studio/import/ImportGuidePanel";
import { ImportTemplatesPanel } from "@/components/studio/import/ImportTemplatesPanel";
import { StoriesImportV2Panel } from "@/components/studio/import/StoriesImportV2Panel";
import { saveImportExportHistoryEntry } from "@/lib/studio/import-export-history";
import { recordStudioImportExportJobAction } from "@/lib/studio/studio-import-export-jobs-actions";
import { studioPath } from "@/lib/studio/constants";
import type { ImportExportHistoryEntry, ImportExportPageData } from "@/types/studio-import";

type ImportExportTab = "export" | "import-stories" | "import-chapters" | "templates" | "guide" | "history";

const TABS: Array<{ id: ImportExportTab; label: string }> = [
  { id: "export", label: "Xuất dữ liệu" },
  { id: "import-stories", label: "Nhập truyện" },
  { id: "import-chapters", label: "Nhập chương" },
  { id: "templates", label: "Template mẫu" },
  { id: "guide", label: "Hướng dẫn" },
  { id: "history", label: "Lịch sử" }
];

type ImportExportTabsProps = ImportExportPageData & {
  initialStoryId?: string;
  initialTab?: string;
};

function createHistoryEntry(
  partial: Omit<ImportExportHistoryEntry, "id" | "createdAt" | "performedBy" | "status"> & {
    performedBy: string;
    status?: ImportExportHistoryEntry["status"];
  }
): ImportExportHistoryEntry {
  return {
    ...partial,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    status: partial.status ?? (partial.errorCount > 0 ? "partial" : "completed")
  };
}

function resolveInitialTab(value?: string): ImportExportTab {
  if (value && TABS.some((tab) => tab.id === value)) {
    return value as ImportExportTab;
  }
  return "export";
}

export function ImportExportTabs({
  initialStoryId,
  initialTab,
  ...props
}: ImportExportTabsProps) {
  const [activeTab, setActiveTab] = useState<ImportExportTab>(() => resolveInitialTab(initialTab));
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const bumpHistory = useCallback(() => {
    setHistoryRefreshKey((value) => value + 1);
  }, []);

  function recordExport(fileName: string, rowCount: number, fileContent: string) {
    saveImportExportHistoryEntry(
      createHistoryEntry({
        dataType: "all",
        errorCount: 0,
        fileContent,
        fileName,
        jobType: "export",
        performedBy: props.performerName,
        successCount: rowCount,
        totalRows: rowCount
      })
    );
    void recordStudioImportExportJobAction({
      jobType: "export_stories",
      fileName,
      totalRows: rowCount,
      successRows: rowCount,
      errorRows: 0
    });
    bumpHistory();
  }

  function recordImport(payload: {
    fileName: string;
    totalRows: number;
    successCount: number;
    errorCount: number;
    errorFileContent?: string;
  }) {
    saveImportExportHistoryEntry(
      createHistoryEntry({
        dataType: "all",
        errorCount: payload.errorCount,
        errorFileContent: payload.errorFileContent,
        fileName: payload.fileName,
        jobType: "import",
        performedBy: props.performerName,
        successCount: payload.successCount,
        totalRows: payload.totalRows
      })
    );
    void recordStudioImportExportJobAction({
      jobType: "import_stories",
      fileName: payload.fileName,
      totalRows: payload.totalRows,
      successRows: payload.successCount,
      errorRows: payload.errorCount,
      errorSummary: payload.errorFileContent
        ? { hasErrorFile: true }
        : undefined
    });
    bumpHistory();
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
        {TABS.map((tab) => (
          <button
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id ? "bg-cyan-300 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "export" ? (
        <ExportPanel
          {...props}
          initialStoryId={initialStoryId}
          onExported={recordExport}
        />
      ) : null}

      {activeTab === "import-stories" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-50">
            <p className="font-semibold text-amber-100">Cần mã truyện để cập nhật?</p>
            <p className="mt-1 text-xs text-amber-100/85">
              Xuất file truyện hiện có — cột <code className="rounded bg-black/20 px-1">story_code</code> chứa mã
              CM-ST-… dùng khi import cập nhật.
            </p>
            <button
              className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-amber-200 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-amber-100"
              onClick={() => setActiveTab("export")}
              type="button"
            >
              Đi tới Xuất dữ liệu
            </button>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
            <p className="font-semibold">Nhập truyện từ file CSV/XLSX</p>
            <ul className="mt-2 space-y-1 text-xs text-cyan-200/80">
              <li>• Cột bắt buộc khi tạo mới: <code className="rounded bg-black/30 px-1">title</code></li>
              <li>• Cập nhật truyện có sẵn: điền <code className="rounded bg-black/30 px-1">story_code</code> (mã CM-ST-…).</li>
              <li>• Thể loại, tag, SEO, ảnh bìa, monetization… điền trực tiếp trong file — cột tương ứng form Studio.</li>
              <li>• Gói XLSX/ZIP có sheet taxonomy_reference để tra tên thể loại/tag.</li>
            </ul>
          </div>
          <StoryQuickPicker initialStories={props.stories} totalStories={props.totalStories} />
          <StoriesImportV2Panel
            mode="stories"
            onGoToExport={() => setActiveTab("export")}
            onJobRecorded={bumpHistory}
            onExit={() => setActiveTab("export")}
          />
          {/* Legacy import hidden behind a toggle */}
          <details className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-50/90">
            <summary className="cursor-pointer font-semibold text-amber-100">
              Import legacy (CSV cũ)
            </summary>
            <div className="mt-3">
              <ImportPanel {...props} onImported={recordImport} />
            </div>
          </details>
        </div>
      ) : null}

      {activeTab === "import-chapters" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-50">
            <p className="font-semibold text-amber-100">Cần mã truyện / chương?</p>
            <p className="mt-1 text-xs text-amber-100/85">
              Chương mới: chỉ cần <code className="rounded bg-black/20 px-1">story_code</code> (xem ở trang truyện
              hoặc file xuất). Cập nhật chương cũ: thêm <code className="rounded bg-black/20 px-1">chapter_code</code>{" "}
              từ file xuất chương.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center rounded-xl bg-amber-200 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-amber-100"
                onClick={() => setActiveTab("export")}
                type="button"
              >
                Xuất truyện / chương
              </button>
              <Link
                className="inline-flex min-h-10 items-center rounded-xl border border-amber-200/30 px-4 text-xs font-semibold text-amber-100 transition hover:bg-amber-200/10"
                href={studioPath("/stories")}
              >
                Xem mã trên trang truyện
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
            <p className="font-semibold">Nhập chương từ file CSV/XLSX</p>
            <ul className="mt-2 space-y-1 text-xs text-cyan-200/80">
              <li>• File xuất từ tab <strong>Xuất dữ liệu</strong> (định dạng CSV/XLSX) import trực tiếp được.</li>
              <li>• Cột bắt buộc: <code className="rounded bg-black/30 px-1">story_code</code>, <code className="rounded bg-black/30 px-1">chapter_order</code>, <code className="rounded bg-black/30 px-1">content</code> (hoặc <code className="rounded bg-black/30 px-1">structured_content_json</code>)</li>
              <li>• Cập nhật chương cũ: thêm <code className="rounded bg-black/30 px-1">chapter_code</code> từ file xuất.</li>
              <li>• Giá coin, trạng thái, lịch đăng… điền trong file nếu cần — cột tương ứng form chương.</li>
            </ul>
          </div>
          <StoryQuickPicker initialStories={props.stories} totalStories={props.totalStories} />
          <StoriesImportV2Panel
            mode="chapters"
            onGoToExport={() => setActiveTab("export")}
            onJobRecorded={bumpHistory}
            onExit={() => setActiveTab("export")}
          />
        </div>
      ) : null}

      {activeTab === "templates" ? <ImportTemplatesPanel /> : null}

      {activeTab === "guide" ? <ImportGuidePanel /> : null}

      {activeTab === "history" ? <ImportHistoryPanel refreshKey={historyRefreshKey} /> : null}
    </div>
  );
}
