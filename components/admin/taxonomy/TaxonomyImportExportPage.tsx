"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { TaxonomyPagination } from "@/components/admin/taxonomy/TaxonomyPagination";
import {
  buildTaxonomyImportErrorReportAction,
  confirmTaxonomyCatalogImportAction,
  downloadTaxonomyTemplateXlsxAction,
  exportTaxonomyCatalogAction,
  getTaxonomyImportExportJobErrorReportAction,
  getTaxonomyImportExportTemplatesAction,
  listTaxonomyImportExportJobsAction,
  previewTaxonomyCatalogImportAction
} from "@/lib/admin/taxonomy-import-export-actions";
import { TAXONOMY_TYPES } from "@/types/taxonomy";
import type {
  TaxonomyImportExportJobRow,
  TaxonomyImportMode,
  TaxonomyImportPreviewResult
} from "@/types/taxonomy-import-export";
import type { TaxonomyType } from "@/types/taxonomy";

type TabId = "export" | "import" | "template" | "history";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "export", label: "Xuất dữ liệu" },
  { id: "import", label: "Nhập dữ liệu" },
  { id: "template", label: "Template mẫu" },
  { id: "history", label: "Lịch sử" }
];

type Props = {
  initialJobs: TaxonomyImportExportJobRow[];
  initialJobsTotal: number;
  initialHistoryPage: number;
  loadError: string | null;
  permissions: { canView: boolean; canImport: boolean; canExport: boolean };
};

export function TaxonomyImportExportPage({
  initialJobs,
  initialJobsTotal,
  initialHistoryPage,
  loadError,
  permissions
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("ie_tab") as TabId) ?? "export";
  const activeTab = TABS.some((t) => t.id === tabParam) ? tabParam : "export";

  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(loadError);
  const [jobs, setJobs] = useState(initialJobs);
  const [jobsTotal, setJobsTotal] = useState(initialJobsTotal);
  const [historyPage, setHistoryPage] = useState(initialHistoryPage);

  const [exportType, setExportType] = useState<TaxonomyType | "all">("all");
  const [exportActive, setExportActive] = useState<"all" | "active" | "inactive">("all");
  const [exportPublic, setExportPublic] = useState<"all" | "yes" | "no">("all");
  const [exportCreator, setExportCreator] = useState<"all" | "yes" | "no">("all");
  const [exportSeo, setExportSeo] = useState(false);
  const [exportDiscover, setExportDiscover] = useState(false);
  const [exportRanking, setExportRanking] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");

  const [fileContent, setFileContent] = useState("");
  const [fileFormat, setFileFormat] = useState<"csv" | "xlsx">("csv");
  const [fileName, setFileName] = useState("");
  const [importMode, setImportMode] = useState<TaxonomyImportMode>("upsert_by_type_slug");
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(false);
  const [confirmDisableMissing, setConfirmDisableMissing] = useState(false);
  const [confirmDeactivateInUse, setConfirmDeactivateInUse] = useState(false);
  const [aliasConflictAsError, setAliasConflictAsError] = useState(false);
  const [preview, setPreview] = useState<TaxonomyImportPreviewResult | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    disabled: number;
    jobId: string | null;
  } | null>(null);

  const [instructions, setInstructions] = useState("");
  const [templateLoaded, setTemplateLoaded] = useState(false);

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "import_export");
      params.set("ie_tab", tab);
      router.push(`/admin/taxonomy?${params.toString()}`);
    },
    [router, searchParams]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBase64(base64: string, filename: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildExportFilters() {
    return {
      type: exportType === "all" ? undefined : exportType,
      activeOnly: exportActive === "active",
      inactiveOnly: exportActive === "inactive",
      isPublic:
        exportPublic === "yes" ? true : exportPublic === "no" ? false : undefined,
      creatorSelectable:
        exportCreator === "yes"
          ? true
          : exportCreator === "no"
            ? false
            : undefined,
      useForSeo: exportSeo || undefined,
      useForDiscover: exportDiscover || undefined,
      useForRanking: exportRanking || undefined
    };
  }

  function handleFileUpload(file: File) {
    setFileName(file.name);
    setPreview(null);
    setImportResult(null);
    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    setFileFormat(isXlsx ? "xlsx" : "csv");

    const reader = new FileReader();
    reader.onload = () => {
      if (isXlsx) {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        setFileContent(btoa(binary));
      } else {
        setFileContent(String(reader.result ?? ""));
      }
    };
    if (isXlsx) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, "UTF-8");
  }

  const previewPageSize = 20;
  const previewRows = preview?.rows ?? [];
  const previewTotalPages = Math.max(1, Math.ceil(previewRows.length / previewPageSize));
  const previewSlice = previewRows.slice(
    (previewPage - 1) * previewPageSize,
    previewPage * previewPageSize
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/admin/taxonomy"
        >
          ← Quản lý taxonomy
        </Link>
        <p className="page-kicker">Admin catalog</p>
        <h1 className="page-title">Nhập / Xuất taxonomy</h1>
        <p className="page-copy max-w-3xl">
          Quản trị danh mục, thể loại, tag và presentation taxonomy ở quy mô lớn.
        </p>
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <strong>Lưu ý:</strong> Đây là import/export taxonomy admin —{" "}
          <strong>không phải</strong> import truyện/chương Studio Composer (
          <code className="text-xs">structured_content_json</code>).
        </div>
      </header>

      {toast ? (
        <p className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {toast}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {TABS.map((tab) => (
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
            key={tab.id}
            onClick={() => setTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "export" ? (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold text-white">Xuất taxonomy</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-zinc-400">
              Type
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                onChange={(e) =>
                  setExportType(e.target.value as TaxonomyType | "all")
                }
                value={exportType}
              >
                <option value="all">Tất cả</option>
                {TAXONOMY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Active
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                onChange={(e) =>
                  setExportActive(e.target.value as typeof exportActive)
                }
                value={exportActive}
              >
                <option value="all">Tất cả</option>
                <option value="active">Chỉ active</option>
                <option value="inactive">Chỉ inactive</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Public
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                onChange={(e) =>
                  setExportPublic(e.target.value as typeof exportPublic)
                }
                value={exportPublic}
              >
                <option value="all">Tất cả</option>
                <option value="yes">Public</option>
                <option value="no">Internal</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Creator selectable
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                onChange={(e) =>
                  setExportCreator(e.target.value as typeof exportCreator)
                }
                value={exportCreator}
              >
                <option value="all">Tất cả</option>
                <option value="yes">Có</option>
                <option value="no">Không</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Định dạng
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                onChange={(e) => setExportFormat(e.target.value as "csv" | "xlsx")}
                value={exportFormat}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                checked={exportSeo}
                onChange={(e) => setExportSeo(e.target.checked)}
                type="checkbox"
              />
              use_for_seo
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={exportDiscover}
                onChange={(e) => setExportDiscover(e.target.checked)}
                type="checkbox"
              />
              use_for_discover
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={exportRanking}
                onChange={(e) => setExportRanking(e.target.checked)}
                type="checkbox"
              />
              use_for_ranking
            </label>
          </div>
          <Button
            disabled={pending || !permissions.canExport}
            onClick={() =>
              startTransition(async () => {
                const result = await exportTaxonomyCatalogAction({
                  filters: buildExportFilters(),
                  format: exportFormat
                });
                if (result.error) {
                  showToast(result.error);
                  return;
                }
                const suffix = Date.now();
                if (exportFormat === "xlsx" && result.xlsxBase64) {
                  downloadBase64(result.xlsxBase64, `taxonomy-export-${suffix}.xlsx`);
                } else {
                  downloadBlob(result.csv, `taxonomy-export-${suffix}.csv`, "text/csv");
                }
                showToast(`Đã xuất ${result.rowCount} dòng · job ${result.jobId ?? "—"}`);
              })
            }
          >
            Xuất file
          </Button>
        </div>
      ) : null}

      {activeTab === "import" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Nhập taxonomy</h2>
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                onChange={(e) => setImportMode(e.target.value as TaxonomyImportMode)}
                value={importMode}
              >
                <option value="create_only">create_only</option>
                <option value="update_by_type_slug">update_by_type_slug</option>
                <option value="upsert_by_type_slug">upsert_by_type_slug</option>
                <option value="disable_missing_in_file">disable_missing_in_file</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  checked={autoGenerateSlug}
                  onChange={(e) => setAutoGenerateSlug(e.target.checked)}
                  type="checkbox"
                />
                Auto slug từ name
              </label>
            </div>
            {importMode === "disable_missing_in_file" ? (
              <label className="flex items-center gap-2 text-sm text-red-200">
                <input
                  checked={confirmDisableMissing}
                  onChange={(e) => setConfirmDisableMissing(e.target.checked)}
                  type="checkbox"
                />
                Tôi xác nhận: term active cùng type không có trong file sẽ bị is_active=false
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-amber-200">
              <input
                checked={confirmDeactivateInUse}
                onChange={(e) => setConfirmDeactivateInUse(e.target.checked)}
                type="checkbox"
              />
              Cho phép set inactive term đang có usage_count &gt; 0
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={aliasConflictAsError}
                onChange={(e) => setAliasConflictAsError(e.target.checked)}
                type="checkbox"
              />
              Alias trùng term khác → lỗi (không chỉ warning)
            </label>
            <input
              accept=".csv,.xlsx,.xls"
              className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
              type="file"
            />
            {fileName ? (
              <p className="text-xs text-zinc-500">File: {fileName}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending || !fileContent || !permissions.canImport}
                onClick={() =>
                  startTransition(async () => {
                    const result = await previewTaxonomyCatalogImportAction({
                      content: fileContent,
                      format: fileFormat,
                      mode: importMode,
                      autoGenerateSlug,
                      aliasConflictAsError
                    });
                    if (result.error && !result.preview) {
                      showToast(result.error);
                      return;
                    }
                    setPreview(result.preview);
                    setPreviewPage(1);
                    setImportResult(null);
                  })
                }
                variant="secondary"
              >
                Preview & validate
              </Button>
              <Button
                disabled={
                  pending ||
                  !fileContent ||
                  !permissions.canImport ||
                  !preview?.canImport ||
                  (importMode === "disable_missing_in_file" && !confirmDisableMissing)
                }
                onClick={() =>
                  startTransition(async () => {
                    const result = await confirmTaxonomyCatalogImportAction({
                      content: fileContent,
                      format: fileFormat,
                      mode: importMode,
                      fileName,
                      autoGenerateSlug,
                      confirmDisableMissing,
                      confirmDeactivateInUse,
                      aliasConflictAsError
                    });
                    if (!result.ok || !result.result) {
                      showToast(result.error ?? "Import thất bại.");
                      if ("preview" in result && result.preview) {
                        setPreview(result.preview);
                      }
                      return;
                    }
                    const r = result.result;
                    setImportResult({
                      created: r.created,
                      updated: r.updated,
                      skipped: r.skipped,
                      failed: r.failed,
                      disabled: r.disabled,
                      jobId: r.jobId
                    });
                    showToast(
                      `Xong: +${r.created} / ~${r.updated} / skip ${r.skipped} / fail ${r.failed}`
                    );
                    router.refresh();
                  })
                }
              >
                Confirm import
              </Button>
            </div>
          </div>

          {preview ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-sm text-zinc-300">
                {preview.rows.length} dòng · {preview.errorCount} lỗi ·{" "}
                {preview.warningCount} cảnh báo ·{" "}
                {preview.canImport ? "Có thể import" : "Chặn import"}
              </p>
              {preview.issues.length > 0 ? (
                <>
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full text-xs">
                      <thead className="text-zinc-500">
                        <tr>
                          <th className="px-2 py-1 text-left">Row</th>
                          <th className="px-2 py-1 text-left">Field</th>
                          <th className="px-2 py-1 text-left">Code</th>
                          <th className="px-2 py-1 text-left">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.issues.slice(0, 50).map((issue, i) => (
                          <tr className="border-t border-white/5 text-zinc-300" key={i}>
                            <td className="px-2 py-1">{issue.rowNumber}</td>
                            <td className="px-2 py-1">{issue.field}</td>
                            <td className="px-2 py-1">{issue.errorCode}</td>
                            <td className="px-2 py-1">{issue.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const report = await buildTaxonomyImportErrorReportAction(
                          preview.issues
                        );
                        if (report.csv) {
                          downloadBlob(
                            report.csv,
                            `taxonomy-import-errors-${Date.now()}.csv`,
                            "text/csv"
                          );
                        }
                      })
                    }
                    variant="secondary"
                  >
                    Tải error report CSV
                  </Button>
                </>
              ) : null}
              {previewSlice.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="text-zinc-500">
                        <tr>
                          <th className="px-2 py-1">#</th>
                          <th className="px-2 py-1">type</th>
                          <th className="px-2 py-1">slug</th>
                          <th className="px-2 py-1">name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewSlice.map((row) => (
                          <tr className="border-t border-white/5 text-zinc-300" key={row.rowNumber}>
                            <td className="px-2 py-1">{row.rowNumber}</td>
                            <td className="px-2 py-1">{row.type}</td>
                            <td className="px-2 py-1">{row.slug}</td>
                            <td className="px-2 py-1">{row.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TaxonomyPagination
                    onPageChange={setPreviewPage}
                    page={previewPage}
                    pending={pending}
                    total={previewRows.length}
                    totalPages={previewTotalPages}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {importResult ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <p>Total processed · created {importResult.created} · updated {importResult.updated}</p>
              <p>
                skipped {importResult.skipped} · failed {importResult.failed} · disabled{" "}
                {importResult.disabled}
              </p>
              <p className="text-xs mt-1">Job ID: {importResult.jobId ?? "—"}</p>
              {importResult.jobId ? (
                <button
                  className="mt-2 text-xs text-cyan-300 underline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const report = await getTaxonomyImportExportJobErrorReportAction(
                        importResult.jobId!
                      );
                      if (report.csv) {
                        downloadBlob(
                          report.csv,
                          `taxonomy-job-${importResult.jobId}-errors.csv`,
                          "text/csv"
                        );
                      }
                    })
                  }
                  type="button"
                >
                  Tải error report từ job
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "template" ? (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold text-white">Template & hướng dẫn</h2>
          <p className="text-sm text-zinc-400">
            Không nhập Composer block types (chat_message, system_notice, case_evidence…).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const data = await getTaxonomyImportExportTemplatesAction();
                  if (data.error) {
                    showToast(data.error);
                    return;
                  }
                  downloadBlob(data.templateCsv, "taxonomy_template.csv", "text/csv");
                  downloadBlob(data.validTypesCsv, "taxonomy_valid_types.csv", "text/csv");
                  setInstructions(data.instructions);
                  setTemplateLoaded(true);
                })
              }
            >
              Tải template CSV + valid types
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const data = await downloadTaxonomyTemplateXlsxAction();
                  if (data.error || !data.xlsxBase64) {
                    showToast(data.error ?? "Không tải được XLSX.");
                    return;
                  }
                  downloadBase64(data.xlsxBase64, "taxonomy_template.xlsx");
                })
              }
              variant="secondary"
            >
              Tải template XLSX
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const data = await getTaxonomyImportExportTemplatesAction();
                  if (data.error) {
                    showToast(data.error);
                    return;
                  }
                  downloadBlob(
                    data.instructions,
                    "taxonomy_instructions.txt",
                    "text/plain"
                  );
                  setInstructions(data.instructions);
                  setTemplateLoaded(true);
                })
              }
              variant="secondary"
            >
              Tải hướng dẫn (.txt)
            </Button>
          </div>
          {templateLoaded || instructions ? (
            <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-400 whitespace-pre-wrap">
              {instructions}
            </pre>
          ) : null}
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Thời gian</th>
                  <th className="px-3 py-3">Hướng</th>
                  <th className="px-3 py-3">Mode</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Rows</th>
                  <th className="px-3 py-3">+ / ~ / skip / fail</th>
                  <th className="px-3 py-3">File</th>
                  <th className="px-3 py-3">Job</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr className="border-t border-white/5 text-zinc-300" key={job.id}>
                    <td className="px-3 py-3 text-xs">
                      {job.createdAt.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-3 py-3">{job.direction}</td>
                    <td className="px-3 py-3 text-xs">{job.mode ?? "—"}</td>
                    <td className="px-3 py-3">{job.status}</td>
                    <td className="px-3 py-3">{job.totalRows}</td>
                    <td className="px-3 py-3 text-xs">
                      {job.createdRows}/{job.updatedRows}/{job.skippedRows}/{job.failedRows}
                    </td>
                    <td className="px-3 py-3 text-xs">{job.fileName ?? "—"}</td>
                    <td className="px-3 py-3 text-xs">
                      {Boolean(job.errorSummary?.hasErrorReport) ? (
                        <button
                          className="text-cyan-300 underline"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const report =
                                await getTaxonomyImportExportJobErrorReportAction(job.id);
                              if (report.csv) {
                                downloadBlob(
                                  report.csv,
                                  `taxonomy-job-${job.id}-errors.csv`,
                                  "text/csv"
                                );
                              } else {
                                showToast(report.error ?? "Không có report.");
                              }
                            })
                          }
                          type="button"
                        >
                          Errors
                        </button>
                      ) : (
                        <span className="text-zinc-600">{job.id.slice(0, 8)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TaxonomyPagination
            onPageChange={(p) => {
              setHistoryPage(p);
              startTransition(async () => {
                const result = await listTaxonomyImportExportJobsAction({
                  page: p,
                  pageSize: 20
                });
                setJobs(result.items);
                setJobsTotal(result.total);
              });
            }}
            page={historyPage}
            pending={pending}
            total={jobsTotal}
            totalPages={Math.max(1, Math.ceil(jobsTotal / 20))}
          />
        </div>
      ) : null}
    </div>
  );
}
