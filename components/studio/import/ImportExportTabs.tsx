"use client";

import { useCallback, useState } from "react";
import { ExportPanel } from "@/components/studio/import/ExportPanel";
import { ImportHistoryPanel } from "@/components/studio/import/ImportHistoryPanel";
import { ImportPanel } from "@/components/studio/import/ImportPanel";
import { ImportGuidePanel } from "@/components/studio/import/ImportGuidePanel";
import { ImportTemplatesPanel } from "@/components/studio/import/ImportTemplatesPanel";
import { StoriesImportV2Panel } from "@/components/studio/import/StoriesImportV2Panel";
import { saveImportExportHistoryEntry } from "@/lib/studio/import-export-history";
import { recordStudioImportExportJobAction } from "@/lib/studio/studio-import-export-jobs-actions";
import type { ImportExportHistoryEntry, ImportExportPageData } from "@/types/studio-import";

type ImportExportTab = "export" | "import" | "templates" | "guide" | "history";

const TABS: Array<{ id: ImportExportTab; label: string }> = [
  { id: "import", label: "Nhập truyện" },
  { id: "export", label: "Xuất truyện" },
  { id: "templates", label: "Template mẫu" },
  { id: "guide", label: "Hướng dẫn" },
  { id: "history", label: "Lịch sử" }
];

type ImportExportTabsProps = ImportExportPageData;

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

export function ImportExportTabs(props: ImportExportTabsProps) {
  const [activeTab, setActiveTab] = useState<ImportExportTab>("export");
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
        <ExportPanel {...props} onExported={recordExport} />
      ) : null}

      {activeTab === "import" ? (
        <div className="space-y-6">
          <StoriesImportV2Panel onJobRecorded={bumpHistory} />
          <ImportPanel {...props} onImported={recordImport} />
        </div>
      ) : null}

      {activeTab === "templates" ? <ImportTemplatesPanel /> : null}

      {activeTab === "guide" ? <ImportGuidePanel /> : null}

      {activeTab === "history" ? <ImportHistoryPanel refreshKey={historyRefreshKey} /> : null}
    </div>
  );
}
