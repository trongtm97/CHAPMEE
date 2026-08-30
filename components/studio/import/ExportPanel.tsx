"use client";

import { useState, useTransition } from "react";
import { Button, EmptyState } from "@/components/ui";
import { FileStructureCard } from "@/components/studio/import/FileStructureCard";
import { StoryQuickPicker } from "@/components/studio/import/StoryQuickPicker";
import { StorySearchCheckboxList } from "@/components/studio/import/StorySearchCheckboxList";
import {
  fetchChaptersExportV2Action,
  fetchExportRowsAction,
  fetchImportExportBundleXlsxAction,
  fetchImportExportBundleZipAction,
  fetchStoriesExportV2ByScopeAction
} from "@/lib/studio/import-export-actions";
import { downloadTextFile, exportRowsToCsv, formatExportFileName } from "@/lib/studio/csv";
import {
  buildChaptersTemplateCsv,
  buildStoriesTemplateCsv
} from "@/lib/studio/import-export-templates";
import { getEmptyTemplateRows, getHeadersForDataType } from "@/lib/studio/import-export";
import type {
  ExportScopeInput,
  ImportExportDataType,
  ImportExportPageData
} from "@/types/studio-import";
import type { StudioDisplayStatus } from "@/types/studio";

const DATA_TYPES: Array<{ value: ImportExportDataType; label: string }> = [
  { label: "Truyện", value: "stories" },
  { label: "Chương", value: "chapters" },
  { label: "Reels", value: "reels" },
  { label: "Truyện + chương", value: "stories_chapters" },
  { label: "Tất cả dữ liệu Studio", value: "all" }
];

const SCOPE_MODES: Array<{ value: ExportScopeInput["mode"]; label: string }> = [
  { label: "Tất cả truyện", value: "all_stories" },
  { label: "Chọn từng truyện", value: "selected_stories" },
  { label: "Theo trạng thái truyện", value: "by_status" },
  { label: "Theo thể loại", value: "by_genre" },
  { label: "Theo thời gian cập nhật", value: "by_updated" }
];

const STATUS_OPTIONS: Array<{ value: StudioDisplayStatus | "all"; label: string }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Đang đăng", value: "published" },
  { label: "Đã lên lịch", value: "scheduled" },
  { label: "Hoàn thành", value: "completed" },
  { label: "Đã ẩn", value: "hidden" },
  { label: "Cần sửa", value: "rejected" }
];

type ExportPanelProps = ImportExportPageData & {
  initialStoryId?: string;
  onExported?: (fileName: string, rowCount: number, fileContent: string) => void;
};

export function ExportPanel({
  genres,
  hasExportableData,
  initialStoryId,
  onExported,
  stories,
  totalStories
}: ExportPanelProps) {
  const [dataType, setDataType] = useState<ImportExportDataType>("chapters");
  const [scopeMode, setScopeMode] = useState<ExportScopeInput["mode"]>(
    initialStoryId ? "selected_stories" : "all_stories"
  );
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>(
    initialStoryId ? [initialStoryId] : []
  );
  const [statusFilter, setStatusFilter] = useState<StudioDisplayStatus | "all">("all");
  const [genreId, setGenreId] = useState("");
  const [updatedAfter, setUpdatedAfter] = useState("");
  const [updatedBefore, setUpdatedBefore] = useState("");
  const [showStructure, setShowStructure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "zip" | "xlsx">("csv");
  const [pending, startTransition] = useTransition();

  function buildScope(): ExportScopeInput {
    return {
      genreId: genreId || undefined,
      mode: scopeMode,
      status: statusFilter,
      storyIds: selectedStoryIds,
      updatedAfter: updatedAfter || undefined,
      updatedBefore: updatedBefore || undefined
    };
  }

  function handleDownloadTemplate() {
    let csv: string;
    let fileName: string;
    let rowCount: number;

    if (dataType === "stories") {
      csv = buildStoriesTemplateCsv("create");
      fileName = formatExportFileName("stories_v2_template", "csv");
      rowCount = 1;
    } else if (dataType === "chapters") {
      csv = buildChaptersTemplateCsv();
      fileName = formatExportFileName("chapters_v2_template", "csv");
      rowCount = 1;
    } else {
      const headers = getHeadersForDataType(dataType);
      const templateRows = getEmptyTemplateRows(dataType);
      csv = exportRowsToCsv(
        headers,
        templateRows.map((row) =>
          Object.fromEntries(headers.map((header) => [header, row[header] ?? ""]))
        )
      );
      fileName = formatExportFileName(`${dataType}_template`, "csv");
      rowCount = templateRows.length;
    }

    downloadTextFile(csv, fileName);
    onExported?.(fileName, rowCount, csv);
  }

  function downloadXlsxBase64(fileName: string, xlsxBase64: string) {
    const binary = atob(xlsxBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadZipBase64(fileName: string, zipBase64: string) {
    const binary = atob(zipBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const scope = buildScope();

      if (exportFormat === "zip") {
        const zipResult = await fetchImportExportBundleZipAction(scope);
        if (zipResult.error || !zipResult.zipBase64 || !zipResult.fileName) {
          setError(zipResult.error ?? "Không xuất được gói ZIP.");
          return;
        }
        downloadZipBase64(zipResult.fileName, zipResult.zipBase64);
        onExported?.(zipResult.fileName, 1, "");
        return;
      }

      if (exportFormat === "xlsx") {
        const xlsxResult = await fetchImportExportBundleXlsxAction(scope);
        if (xlsxResult.error || !xlsxResult.xlsxBase64 || !xlsxResult.fileName) {
          setError(xlsxResult.error ?? "Không xuất được XLSX.");
          return;
        }
        downloadXlsxBase64(xlsxResult.fileName, xlsxResult.xlsxBase64);
        onExported?.(xlsxResult.fileName, 1, "");
        return;
      }

      if (dataType === "stories") {
        const v2 = await fetchStoriesExportV2ByScopeAction(scope);
        if (v2.error || !v2.csv) {
          setError(v2.error ?? "Không xuất được truyện.");
          return;
        }
        const lineCount = Math.max(0, v2.csv.split("\n").length - 1);
        if (lineCount === 0) {
          setError("Không có truyện trong phạm vi đã chọn.");
          return;
        }
        const fileName = formatExportFileName("stories_v2", "csv");
        downloadTextFile(v2.csv, fileName);
        onExported?.(fileName, lineCount, v2.csv);
        return;
      }

      if (dataType === "chapters") {
        const v2 = await fetchChaptersExportV2Action(scope);
        if (v2.error || !v2.csv) {
          setError(v2.error ?? "Không xuất được chương.");
          return;
        }
        const lineCount = Math.max(0, v2.csv.split("\n").length - 1);
        if (lineCount === 0) {
          setError("Không có chương trong phạm vi đã chọn.");
          return;
        }
        const fileName = formatExportFileName("chapters_v2", "csv");
        downloadTextFile(v2.csv, fileName);
        onExported?.(fileName, lineCount, v2.csv);
        return;
      }

      if (dataType === "stories_chapters" || dataType === "all") {
        const [storiesV2, chaptersV2] = await Promise.all([
          fetchStoriesExportV2ByScopeAction(scope),
          fetchChaptersExportV2Action(scope)
        ]);
        if (storiesV2.error || chaptersV2.error) {
          setError(storiesV2.error ?? chaptersV2.error ?? "Không xuất được.");
          return;
        }
        const storyLines = Math.max(0, (storiesV2.csv ?? "").split("\n").length - 1);
        const chapterLines = Math.max(0, (chaptersV2.csv ?? "").split("\n").length - 1);
        if (storyLines === 0 && chapterLines === 0) {
          setError("Không có dữ liệu trong phạm vi đã chọn.");
          return;
        }
        const stamp = new Date().toISOString().slice(0, 10);
        if (storyLines > 0) {
          downloadTextFile(storiesV2.csv!, `chapmee-stories-v2-${stamp}.csv`);
          onExported?.(`chapmee-stories-v2-${stamp}.csv`, storyLines, storiesV2.csv!);
        }
        if (chapterLines > 0) {
          downloadTextFile(chaptersV2.csv!, `chapmee-chapters-v2-${stamp}.csv`);
        }
        return;
      }

      if (dataType === "reels") {
        const result = await fetchExportRowsAction({ dataType: "reels", scope });

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.rows.length === 0) {
          setError("Không có reels để xuất.");
          return;
        }

        const headers = getHeadersForDataType("reels");
        const csv = exportRowsToCsv(
          headers,
          result.rows.map((row) =>
            Object.fromEntries(headers.map((header) => [header, row[header] ?? ""]))
          )
        );
        const fileName = formatExportFileName("reels", "csv");
        downloadTextFile(csv, fileName);
        onExported?.(fileName, result.rows.length, csv);
        return;
      }

      setError("Loại dữ liệu không được hỗ trợ.");
    });
  }

  function toggleStorySelection(storyId: string) {
    setSelectedStoryIds((current) =>
      current.includes(storyId) ? current.filter((id) => id !== storyId) : [...current, storyId]
    );
  }

  if (!hasExportableData) {
    return (
      <div className="space-y-4">
        <EmptyState
          description="Hãy tạo truyện hoặc chương trước."
          title="Bạn chưa có dữ liệu để xuất"
        />
        <FileStructureCard />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StoryQuickPicker initialStories={stories} totalStories={totalStories} />

      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
        <p className="font-semibold">Xuất để lấy mã import</p>
        <p className="mt-1 text-xs text-cyan-200/80">
          File xuất có cột <code className="rounded bg-black/30 px-1">story_code</code> và{" "}
          <code className="rounded bg-black/30 px-1">chapter_code</code> — dùng khi cập nhật truyện/chương đã có.
          Chỉ thêm chương mới thì chỉ cần <code className="rounded bg-black/30 px-1">story_code</code>.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Loại dữ liệu</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
            onChange={(event) => setDataType(event.target.value as ImportExportDataType)}
            value={dataType}
          >
            {DATA_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Phạm vi</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
            onChange={(event) => setScopeMode(event.target.value as ExportScopeInput["mode"])}
            value={scopeMode}
          >
            {SCOPE_MODES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {scopeMode === "selected_stories" ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-sm font-semibold text-zinc-200">Chọn truyện</p>
          <div className="mt-3">
            <StorySearchCheckboxList
              initialStories={stories}
              onToggle={toggleStorySelection}
              selectedIds={selectedStoryIds}
              totalStories={totalStories}
            />
          </div>
        </div>
      ) : null}

      {scopeMode === "by_status" ? (
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Trạng thái truyện</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
            onChange={(event) => setStatusFilter(event.target.value as StudioDisplayStatus | "all")}
            value={statusFilter}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {scopeMode === "by_genre" ? (
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Thể loại</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
            onChange={(event) => setGenreId(event.target.value)}
            value={genreId}
          >
            <option value="">Chọn thể loại</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {scopeMode === "by_updated" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-zinc-200">Cập nhật từ</span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
              onChange={(event) => setUpdatedAfter(event.target.value)}
              type="date"
              value={updatedAfter}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-zinc-200">Cập nhật đến</span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
              onChange={(event) => setUpdatedBefore(event.target.value)}
              type="date"
              value={updatedBefore}
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-zinc-200">Định dạng xuất</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
            onChange={(event) => {
              const value = event.target.value;
              setExportFormat(
                value === "zip" || value === "xlsx" ? value : "csv"
              );
            }}
            value={exportFormat}
          >
            <option value="csv">CSV UTF-8</option>
            <option value="xlsx">XLSX (3 sheet: truyện, chương, taxonomy)</option>
            <option value="zip">ZIP (CSV gói)</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={handleDownloadTemplate} type="button" variant="secondary">
          Tải mẫu trống
        </Button>
        <Button disabled={pending} loading={pending} onClick={handleExport} type="button">
          Xuất dữ liệu hiện có
        </Button>
        <Button onClick={() => setShowStructure((value) => !value)} type="button" variant="secondary">
          {showStructure ? "Ẩn cấu trúc file" : "Xem cấu trúc file"}
        </Button>
      </div>

      {dataType === "all" && exportFormat === "csv" ? (
        <p className="text-xs text-zinc-500">
          &quot;Tất cả dữ liệu Studio&quot; (CSV) xuất 2 file truyện + chương v2 (taxonomy trong cột truyện).
          Reels: chọn loại Reels. Gói ZIP/XLSX gồm taxonomy_reference.
        </p>
      ) : null}

      {dataType === "reels" ? (
        <p className="text-xs text-amber-200/80">
          Reels vẫn dùng định dạng CSV legacy (chưa có import/export v2 taxonomy).
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {showStructure ? <FileStructureCard /> : null}
    </div>
  );
}
