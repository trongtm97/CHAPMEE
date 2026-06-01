"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState } from "@/components/ui";
import { downloadTextFile } from "@/lib/studio/csv";
import { loadImportExportHistory } from "@/lib/studio/import-export-history";
import { listStudioImportExportJobsAction } from "@/lib/studio/studio-import-export-jobs-actions";
import type { ImportExportHistoryEntry } from "@/types/studio-import";

const JOB_TYPE_LABELS: Record<string, string> = {
  export: "Xuất",
  import: "Nhập",
  export_stories: "Xuất truyện",
  import_stories: "Nhập truyện"
};

const DATA_TYPE_LABELS: Record<string, string> = {
  all: "Tất cả",
  chapters: "Chương",
  reels: "Reels",
  stories: "Truyện",
  stories_chapters: "Truyện + chương"
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Hoàn thành",
  failed: "Thất bại",
  partially_completed: "Một phần",
  partial: "Một phần",
  processing: "Đang xử lý",
  pending: "Đang xử lý"
};

type HistoryRow = {
  id: string;
  createdAt: string;
  jobType: string;
  dataType: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: string;
  fileContent?: string;
  errorFileContent?: string;
  source: "server" | "local";
};

function mapServerJob(
  job: Awaited<ReturnType<typeof listStudioImportExportJobsAction>>["items"][number]
): HistoryRow {
  const isExport = job.jobType.startsWith("export");
  return {
    id: job.id,
    createdAt: job.createdAt,
    jobType: isExport ? "export" : "import",
    dataType: job.jobType.includes("stories") ? "stories" : "all",
    fileName: job.fileName ?? "—",
    totalRows: job.totalRows,
    successCount: job.successRows,
    errorCount: job.errorRows,
    status: job.status,
    source: "server"
  };
}

function mapLocalEntry(entry: ImportExportHistoryEntry): HistoryRow {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    jobType: entry.jobType,
    dataType: entry.dataType,
    fileName: entry.fileName,
    totalRows: entry.totalRows,
    successCount: entry.successCount,
    errorCount: entry.errorCount,
    status: entry.status,
    fileContent: entry.fileContent,
    errorFileContent: entry.errorFileContent,
    source: "local"
  };
}

type ImportHistoryPanelProps = {
  refreshKey?: number;
};

export function ImportHistoryPanel({ refreshKey = 0 }: ImportHistoryPanelProps) {
  const [entries, setEntries] = useState<HistoryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = loadImportExportHistory().map(mapLocalEntry);
      const serverResult = await listStudioImportExportJobsAction();
      if (cancelled) return;

      if (serverResult.error) {
        setLoadError(serverResult.error);
      } else {
        setLoadError(null);
      }

      const server = (serverResult.items ?? []).map(mapServerJob);
      const seen = new Set(server.map((row) => row.id));
      const merged = [
        ...server,
        ...local.filter((row) => !seen.has(row.id))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setEntries(merged.slice(0, 50));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (entries.length === 0) {
    return (
      <EmptyState
        description={
          loadError
            ? `Không tải lịch sử server (${loadError}). Dữ liệu trên trình duyệt vẫn hiển thị khi có.`
            : "Lịch sử nhập/xuất từ server và trình duyệt (nếu có)."
        }
        title="Chưa có lần nhập/xuất nào"
      />
    );
  }

  return (
    <div className="space-y-2">
      {loadError ? (
        <p className="text-xs text-amber-300/90">
          Lịch sử server: {loadError}. Đang hiển thị bản ghi cục bộ (nếu có).
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Thời gian</th>
              <th className="px-3 py-3">Loại</th>
              <th className="px-3 py-3">Dữ liệu</th>
              <th className="px-3 py-3">File</th>
              <th className="px-3 py-3">Tổng</th>
              <th className="px-3 py-3">OK</th>
              <th className="px-3 py-3">Lỗi</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Nguồn</th>
              <th className="px-3 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-t border-white/5" key={`${entry.source}-${entry.id}`}>
                <td className="whitespace-nowrap px-3 py-3 text-zinc-400">
                  {new Date(entry.createdAt).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-zinc-300">
                  {JOB_TYPE_LABELS[entry.jobType] ?? entry.jobType}
                </td>
                <td className="px-3 py-3 text-zinc-300">
                  {DATA_TYPE_LABELS[entry.dataType] ?? entry.dataType}
                </td>
                <td className="max-w-[10rem] truncate px-3 py-3 text-zinc-300" title={entry.fileName}>
                  {entry.fileName}
                </td>
                <td className="px-3 py-3 text-zinc-300">{entry.totalRows}</td>
                <td className="px-3 py-3 text-emerald-300">{entry.successCount}</td>
                <td className="px-3 py-3 text-rose-300">{entry.errorCount}</td>
                <td className="px-3 py-3 text-zinc-300">
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </td>
                <td className="px-3 py-3 text-zinc-500 text-xs">
                  {entry.source === "server" ? "Server" : "Trình duyệt"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {entry.fileContent ? (
                      <Button
                        className="min-h-9 px-2 text-xs"
                        onClick={() => downloadTextFile(entry.fileContent ?? "", entry.fileName)}
                        type="button"
                        variant="secondary"
                      >
                        Tải lại
                      </Button>
                    ) : null}
                    {entry.errorFileContent ? (
                      <Button
                        className="min-h-9 px-2 text-xs"
                        onClick={() =>
                          downloadTextFile(entry.errorFileContent ?? "", `errors_${entry.fileName}`)
                        }
                        type="button"
                        variant="secondary"
                      >
                        File lỗi
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
