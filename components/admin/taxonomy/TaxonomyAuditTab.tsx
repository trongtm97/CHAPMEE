"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { TaxonomyPagination } from "@/components/admin/taxonomy/TaxonomyPagination";
import {
  exportTaxonomyAuditCsvAction,
  listTaxonomyAuditLogsAdminAction
} from "@/lib/admin/taxonomy-actions";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";
import { TAXONOMY_ADMIN_PAGE_SIZE } from "@/lib/taxonomy/admin-tabs";
import type { TaxonomyAuditLogRow } from "@/lib/taxonomy/admin-data";

const ACTION_FILTERS = [
  { value: "", label: "Tất cả taxonomy" },
  { value: "taxonomy_term_create", label: "Tạo term" },
  { value: "taxonomy_term_update", label: "Cập nhật term" },
  { value: "taxonomy_term_disable", label: "Tắt term" },
  { value: "taxonomy_term_enable", label: "Bật term" },
  { value: "taxonomy_term_delete", label: "Xóa term" },
  { value: "taxonomy_term_merge", label: "Gộp term" },
  { value: "taxonomy_request_approve", label: "Duyệt yêu cầu" },
  { value: "taxonomy_request_reject", label: "Từ chối yêu cầu" },
  { value: "taxonomy_request_merge", label: "Gộp yêu cầu" },
  { value: "taxonomy_import", label: "Import (legacy)" },
  { value: "taxonomy_export", label: "Export catalog" },
  { value: "taxonomy_import_preview", label: "Import preview" },
  { value: "taxonomy_import_confirmed", label: "Import confirmed" },
  { value: "taxonomy_import_failed", label: "Import failed" },
  { value: "taxonomy_import_disabled_missing", label: "Disable missing" },
  { value: "taxonomy_template_create", label: "Tạo template" },
  { value: "taxonomy_template_update", label: "Sửa template" }
] as const;

function formatAction(action: string) {
  return action.replace(/^taxonomy_/, "").replaceAll("_", " ");
}

function metadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  const parts: string[] = [];
  if (metadata.type) parts.push(String(metadata.type));
  if (metadata.slug) parts.push(String(metadata.slug));
  if (typeof metadata.created === "number") parts.push(`+${metadata.created}`);
  if (typeof metadata.updated === "number") parts.push(`~${metadata.updated}`);
  return parts.length ? parts.join(" · ") : JSON.stringify(metadata).slice(0, 80);
}

type TaxonomyAuditTabProps = {
  initialLogs: TaxonomyAuditLogRow[];
  initialTotal: number;
  onMessage: TaxonomyAdminNotify;
};

export function TaxonomyAuditTab({
  initialLogs,
  initialTotal,
  onMessage
}: TaxonomyAuditTabProps) {
  const [pending, startTransition] = useTransition();
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);

  const totalPages = Math.max(1, Math.ceil(total / TAXONOMY_ADMIN_PAGE_SIZE));

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listTaxonomyAuditLogsAdminAction({
        page,
        pageSize: TAXONOMY_ADMIN_PAGE_SIZE,
        action: actionFilter || undefined
      });
      setItems(result.items);
      setTotal(result.total);
      if (result.error) onMessage(result.error);
    });
  }, [actionFilter, onMessage, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">
          Ghi từ <code className="text-zinc-300">admin_audit_logs</code> — chỉ hành động
          taxonomy.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await exportTaxonomyAuditCsvAction({
                  action: actionFilter || undefined
                });
                if (result.error) {
                  onMessage(result.error);
                  return;
                }
                const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `taxonomy-audit-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                onMessage("Đã xuất nhật ký audit.", "success");
              })
            }
            type="button"
            variant="secondary"
          >
            Xuất CSV
          </Button>
          <Button
            disabled={pending}
            onClick={() => load()}
            type="button"
            variant="secondary"
          >
            Làm mới
          </Button>
          <Link className="text-xs text-cyan-300 hover:underline" href="/admin/audit">
            Audit toàn hệ thống →
          </Link>
        </div>
      </div>

      <select
        className="min-h-10 max-w-md rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
        onChange={(e) => {
          setActionFilter(e.target.value);
          setPage(1);
        }}
        value={actionFilter}
      >
        {ACTION_FILTERS.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-zinc-500">
          Chưa có bản ghi phù hợp.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-zinc-950/80 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Thời gian</th>
                <th className="px-3 py-2">Hành động</th>
                <th className="px-3 py-2">Người thực hiện</th>
                <th className="px-3 py-2">Đối tượng</th>
                <th className="px-3 py-2">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((log) => (
                <tr className="text-zinc-200" key={log.id}>
                  <td className="px-3 py-2 text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 font-medium text-white">
                    {formatAction(log.action)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {log.actor_display_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                    {log.target_type ?? "—"}
                    {log.target_id ? (
                      <span className="block truncate max-w-[140px]">
                        {log.target_id}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {metadataSummary(log.metadata) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TaxonomyPagination
        onPageChange={setPage}
        page={page}
        pending={pending}
        total={total}
        totalPages={totalPages}
      />
    </div>
  );
}
