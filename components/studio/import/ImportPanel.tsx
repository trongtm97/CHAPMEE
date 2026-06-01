"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ConfirmActionModal } from "@/components/admin/campaigns/ConfirmActionModal";
import { FileStructureCard } from "@/components/studio/import/FileStructureCard";
import { ImportPreviewTable } from "@/components/studio/import/ImportPreviewTable";
import { StoryQuickPicker } from "@/components/studio/import/StoryQuickPicker";
import { Button, EmptyState } from "@/components/ui";
import { executeImportAction } from "@/lib/studio/import-export-actions";
import { downloadTextFile, exportRowsToCsv, formatExportFileName, parseCsv } from "@/lib/studio/csv";
import { buildImportPreview, rowsFromParsedCsv } from "@/lib/studio/import-export";
import { studioPath } from "@/lib/studio/constants";
import type {
  ImportExecutionResult,
  ImportExportDataType,
  ImportExportPageData,
  ImportPreviewRow,
  ImportTypeOption
} from "@/types/studio-import";
import { IMPORT_EXPORT_HEADERS } from "@/types/studio-import";

const IMPORT_TYPES: Array<{ value: ImportTypeOption; label: string }> = [
  { label: "Truyện", value: "stories" },
  { label: "Chương", value: "chapters" },
  { label: "Reels", value: "reels" },
  { label: "Truyện + chương", value: "stories_chapters" },
  { label: "Dữ liệu xuất từ ChapMee", value: "all" }
];

type ImportStep = 1 | 2 | 3 | 4;

type ImportPanelProps = ImportExportPageData & {
  onImported?: (payload: {
    fileName: string;
    totalRows: number;
    successCount: number;
    errorCount: number;
    errorFileContent?: string;
  }) => void;
};

export function ImportPanel({
  onImported,
  performerName,
  stories,
  totalStories
}: ImportPanelProps) {
  const [step, setStep] = useState<ImportStep>(1);
  const [importType, setImportType] = useState<ImportTypeOption>("chapters");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    create: 0,
    error: 0,
    skip: 0,
    total: 0,
    update: 0,
    warning: 0
  });
  const [result, setResult] = useState<ImportExecutionResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pending, startTransition] = useTransition();

  const normalizedImportType: ImportExportDataType =
    importType === "chapmee_backup" || importType === "all" ? "all" : importType;

  const hasDestructiveActions = useMemo(
    () => previewRows.some((row) => ["delete", "hide"].includes(row.inferredAction)),
    [previewRows]
  );

  const validRows = useMemo(
    () => previewRows.filter((row) => row.status !== "error"),
    [previewRows]
  );

  const prefersV2Import =
    importType === "stories" ||
    importType === "chapters" ||
    importType === "stories_chapters" ||
    importType === "all";

  function resetImport() {
    setStep(1);
    setFileName(null);
    setFileSize(0);
    setPreviewRows([]);
    setHeaderError(null);
    setResult(null);
    setStats({ create: 0, error: 0, skip: 0, total: 0, update: 0, warning: 0 });
  }

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setHeaderError("Hiện chỉ hỗ trợ CSV UTF-8. Dùng tab Template để tải XLSX mẫu hoặc import v2 bên trên.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      const mapped = rowsFromParsedCsv(parsed.headers, parsed.rows);

      if (mapped.headerError) {
        setHeaderError(mapped.headerError);
        setPreviewRows([]);
        setStep(2);
        return;
      }

      const preview = buildImportPreview(mapped.rows, normalizedImportType);
      setFileName(file.name);
      setFileSize(file.size);
      setPreviewRows(preview.rows);
      setStats(preview.stats);
      setHeaderError(preview.headerError);
      setStep(3);
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleRevalidate() {
    if (previewRows.length === 0) {
      return;
    }
    const rows = previewRows.map((row) => row.data);
    const preview = buildImportPreview(rows, normalizedImportType);
    setPreviewRows(preview.rows);
    setStats(preview.stats);
    setHeaderError(preview.headerError);
  }

  function handleConfirmImport() {
    startTransition(async () => {
      const execution = await executeImportAction({
        actions: validRows.map((row) => row.inferredAction),
        rowIndices: validRows.map((row) => row.rowIndex),
        rows: validRows.map((row) => row.data)
      });

      setResult(execution);
      setStep(4);
      setConfirmOpen(false);

      const errorRows = execution.errors;
      let errorFileContent: string | undefined;

      if (errorRows.length > 0) {
        errorFileContent = exportRowsToCsv(
          [...IMPORT_EXPORT_HEADERS, "error_message"],
          errorRows.map((item) => ({
            ...Object.fromEntries(IMPORT_EXPORT_HEADERS.map((header) => [header, item.row[header] ?? ""])),
            error_message: item.message
          }))
        );
      }

      onImported?.({
        errorCount: errorRows.length,
        errorFileContent,
        fileName: fileName ?? "import.csv",
        successCount: execution.created + execution.updated + execution.hidden + execution.deleted,
        totalRows: previewRows.length
      });
    });
  }

  function downloadErrorFile() {
    if (!result?.errors.length) {
      return;
    }

    const csv = exportRowsToCsv(
      [...IMPORT_EXPORT_HEADERS, "error_message"],
      result.errors.map((item) => ({
        ...Object.fromEntries(IMPORT_EXPORT_HEADERS.map((header) => [header, item.row[header] ?? ""])),
        error_message: item.message
      }))
    );
    downloadTextFile(csv, formatExportFileName("import_errors", "csv"));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-50/90">
        <p className="font-semibold text-amber-100">Import legacy (CSV cũ)</p>
        <p className="mt-1 text-xs text-amber-100/80">
          Truyện và chương nên dùng khối <strong>Nhập truyện v2</strong> phía trên (taxonomy, story_code,
          XLSX nhiều sheet). Legacy giữ cho backup ChapMee và Reels.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
        {[1, 2, 3, 4].map((value) => (
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              step === value ? "bg-cyan-300 text-zinc-950" : "text-zinc-500"
            }`}
            key={value}
          >
            Bước {value}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          {prefersV2Import ? (
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50/90">
              Loại &quot;
              {IMPORT_TYPES.find((t) => t.value === importType)?.label ?? importType}&quot; — khuyến nghị
              dùng <strong>Nhập truyện v2</strong> ở đầu trang (CSV/XLSX, taxonomy, mã truyện/chương).
            </div>
          ) : null}
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-zinc-200">Chọn loại nhập</span>
            <select
              className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
              onChange={(event) => setImportType(event.target.value as ImportTypeOption)}
              value={importType}
            >
              {IMPORT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={() => setStep(2)} type="button">
            Tiếp tục
          </Button>
          <EmptyState
            description="Bạn cũng có thể tải mẫu trống trước ở tab Xuất dữ liệu."
            title="Tải file CSV để nhập hàng loạt"
          />
          <StoryQuickPicker initialStories={stories} totalStories={totalStories} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div
            className={`rounded-2xl border border-dashed p-8 text-center transition ${
              dragActive ? "border-cyan-300/60 bg-cyan-400/5" : "border-white/15 bg-white/[0.02]"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <p className="text-sm text-zinc-300">Kéo thả file vào đây</p>
            <p className="mt-1 text-xs text-zinc-500">Hỗ trợ CSV UTF-8</p>
            <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-zinc-100">
              Chọn file
              <input
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    processFile(file);
                  }
                }}
                type="file"
              />
            </label>
            <p className="mt-3 text-xs text-zinc-600">
              XLSX: tab Template hoặc Xuất → định dạng XLSX.
            </p>
          </div>
          {fileName ? (
            <p className="text-sm text-zinc-400">
              {fileName} · {(fileSize / 1024).toFixed(1)} KB
            </p>
          ) : null}
          {headerError ? <p className="text-sm text-rose-300">{headerError}</p> : null}
          <div className="flex gap-2">
            <Button onClick={() => setStep(1)} type="button" variant="secondary">
              Quay lại
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 pb-24 sm:pb-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Tổng dòng", value: stats.total },
              { label: "Tạo mới", value: stats.create },
              { label: "Cập nhật", value: stats.update },
              { label: "Bỏ qua", value: stats.skip },
              { label: "Cảnh báo", value: stats.warning },
              { label: "Lỗi nghiêm trọng", value: stats.error }
            ].map((item) => (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3" key={item.label}>
                <p className="text-xs text-zinc-500">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {headerError ? <p className="text-sm text-rose-300">{headerError}</p> : null}

          <ImportPreviewTable importType={normalizedImportType} rows={previewRows} />

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex w-full min-w-0 flex-wrap gap-2">
              <Button disabled={pending} onClick={handleRevalidate} type="button" variant="secondary">
                Nhập thử / Kiểm tra lại
              </Button>
              <Button
                disabled={pending || validRows.length === 0 || stats.error === stats.total}
                loading={pending}
                onClick={() => {
                  if (hasDestructiveActions) {
                    setConfirmOpen(true);
                    return;
                  }
                  handleConfirmImport();
                }}
                type="button"
              >
                Xác nhận nhập
              </Button>
            </div>
          </div>

          <ConfirmActionModal
            confirmLabel="Xác nhận nhập"
            description="Bạn đang thao tác ẩn/xóa nhiều nội dung. Hành động này có thể ảnh hưởng đến truyện đang đăng. Vui lòng xác nhận."
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirmImport}
            open={confirmOpen}
            pending={pending}
            title="Xác nhận thao tác hàng loạt"
            variant="danger"
          />
        </div>
      ) : null}

      {step === 4 && result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <h3 className="font-semibold text-emerald-100">Kết quả nhập</h3>
            <ul className="mt-2 grid gap-2 text-sm text-emerald-50/90 sm:grid-cols-2">
              <li>Đã tạo: {result.created}</li>
              <li>Đã cập nhật: {result.updated}</li>
              <li>Đã ẩn: {result.hidden}</li>
              <li>Đã xóa: {result.deleted}</li>
              <li>Bị bỏ qua: {result.skipped}</li>
              <li>Lỗi: {result.errors.length}</li>
            </ul>
            {result.error ? <p className="mt-2 text-sm text-rose-200">{result.error}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {result.errors.length > 0 ? (
              <Button onClick={downloadErrorFile} type="button" variant="secondary">
                Tải file lỗi
              </Button>
            ) : null}
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100"
              href={studioPath("/stories")}
            >
              Về Truyện & chương
            </Link>
            <Button onClick={resetImport} type="button" variant="secondary">
              Nhập file khác
            </Button>
          </div>
        </div>
      ) : null}

      <FileStructureCard />
      <p className="text-xs text-zinc-600">Người thực hiện: {performerName}</p>
    </div>
  );
}
