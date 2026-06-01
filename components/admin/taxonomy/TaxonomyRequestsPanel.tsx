"use client";

import { Fragment, useCallback, useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui";
import { TaxonomyPagination } from "@/components/admin/taxonomy/TaxonomyPagination";
import { TaxonomyRequestActions } from "@/components/admin/taxonomy/TaxonomyRequestActions";
import { listTaxonomyRequestsAdminAction } from "@/lib/admin/taxonomy-actions";
import { TAXONOMY_ADMIN_PAGE_SIZE } from "@/lib/taxonomy/admin-tabs";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import type { TaxonomyRequestAdminRow } from "@/lib/taxonomy/admin-data";
import {
  TAXONOMY_REQUEST_STATUS_LABELS,
  type TaxonomyAdminNotify
} from "@/lib/taxonomy/admin-ui";
import type { TaxonomyRequestRow, TaxonomyRequestStatus } from "@/types/taxonomy";

type TaxonomyRequestsPanelProps = {
  initialRequests: TaxonomyRequestRow[];
  initialTotal: number;
  onMessage: TaxonomyAdminNotify;
  onStatsRefresh?: () => void;
};

function requesterLabel(row: TaxonomyRequestAdminRow) {
  return (
    row.requester_display_name ||
    row.requester_username ||
    row.requested_by.slice(0, 8)
  );
}

export function TaxonomyRequestsPanel({
  initialRequests,
  initialTotal,
  onMessage,
  onStatsRefresh
}: TaxonomyRequestsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<TaxonomyRequestStatus>("pending");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TaxonomyRequestAdminRow[]>(
    initialRequests as TaxonomyRequestAdminRow[]
  );
  const [total, setTotal] = useState(initialTotal);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / TAXONOMY_ADMIN_PAGE_SIZE));

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listTaxonomyRequestsAdminAction({
        status,
        search: search.trim() || undefined,
        page,
        pageSize: TAXONOMY_ADMIN_PAGE_SIZE
      });
      setItems(result.items);
      setTotal(result.total);
      if (result.error) onMessage(result.error);
    });
  }, [onMessage, page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="max-w-xs"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm tên hoặc mô tả…"
          value={search}
        />
        <button
          className="text-sm text-zinc-400 hover:text-white"
          disabled={pending}
          onClick={() => load()}
          type="button"
        >
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "merged"] as const).map((value) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-sm ${
              status === value
                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-200"
                : "border-white/10 text-zinc-400"
            }`}
            key={value}
            onClick={() => {
              setStatus(value);
              setPage(1);
              setExpandedId(null);
            }}
            type="button"
          >
            {TAXONOMY_REQUEST_STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-zinc-500">
          Không có yêu cầu trong trạng thái này.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-zinc-950/80 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Người gửi</th>
                <th className="px-3 py-2">Nhóm</th>
                <th className="px-3 py-2">Tên đề xuất</th>
                <th className="px-3 py-2">Mô tả</th>
                <th className="px-3 py-2">Ví dụ</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Ngày gửi</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((request) => (
                <Fragment key={request.id}>
                  <tr className="text-zinc-200">
                    <td className="px-3 py-2">{requesterLabel(request)}</td>
                    <td className="px-3 py-2 text-xs">
                      {TAXONOMY_TYPE_LABELS[request.type]}
                    </td>
                    <td className="px-3 py-2 font-medium text-white">{request.name}</td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-xs text-zinc-500">
                      {request.description ?? "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-xs text-zinc-500">
                      {request.example_usage ?? "—"}
                    </td>
                    <td className="px-3 py-2">{request.status}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {new Date(request.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-3 py-2">
                      {request.status === "pending" ? (
                        <button
                          className="text-xs text-cyan-300 hover:underline"
                          onClick={() =>
                            setExpandedId(
                              expandedId === request.id ? null : request.id
                            )
                          }
                          type="button"
                        >
                          {expandedId === request.id ? "Thu gọn" : "Xử lý"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {expandedId === request.id ? (
                    <tr>
                      <td className="bg-zinc-950/50 px-3 py-3" colSpan={8}>
                        <TaxonomyRequestActions
                          compact
                          onMessage={onMessage}
                          onUpdated={() => {
                            load();
                            onStatsRefresh?.();
                            setExpandedId(null);
                          }}
                          request={request}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
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
