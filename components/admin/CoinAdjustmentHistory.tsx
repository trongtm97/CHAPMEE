"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { formatAdminCoinReason } from "@/lib/admin/coin-reasons";
import { fetchCoinAdjustmentHistoryAction } from "@/lib/admin/coin-wallet-actions";
import { COIN_ADMIN_COPY } from "@/components/admin/coin-form-copy";
import { Button, Card } from "@/components/ui";
import type {
  AdminCoinAdjustmentHistoryEntry,
  AdminCoinAdjustmentHistoryFilters
} from "@/types/coins";

type CoinAdjustmentHistoryProps = {
  canView?: boolean;
  initialFilters?: AdminCoinAdjustmentHistoryFilters;
};

const SOURCE_OPTIONS = [
  { value: "all", label: "Tất cả nguồn" },
  { value: "admin_adjustment", label: "Admin điều chỉnh" },
  { value: "bulk_admin_adjustment", label: "Cấp hàng loạt" },
  { value: "refund", label: "Hoàn coin" },
  { value: "purchase", label: "Nạp coin" },
  { value: "spend", label: "Chi tiêu" },
  { value: "system", label: "Hệ thống" }
] as const;

const STATUS_LABELS: Record<string, string> = {
  completed: "Hoàn tất",
  pending: "Chờ xử lý",
  failed: "Thất bại",
  refunded: "Đã hoàn",
  cancelled: "Đã huỷ",
  reversed: "Đảo chiều"
};

export function CoinAdjustmentHistory({
  canView = true,
  initialFilters
}: CoinAdjustmentHistoryProps) {
  const [filters, setFilters] = useState<AdminCoinAdjustmentHistoryFilters>({
    page: 1,
    pageSize: 25,
    coinType: "all",
    direction: "all",
    source: "all",
    ...initialFilters
  });
  const [entries, setEntries] = useState<AdminCoinAdjustmentHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    if (!canView) return;
    startTransition(async () => {
      const result = await fetchCoinAdjustmentHistoryAction(filters);
      setEntries(result.entries);
      setTotal(result.total);
    });
  }, [filters, canView]);

  useEffect(() => {
    load();
  }, [load]);

  const pageSize = filters.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const detail = entries.find((entry) => entry.id === detailId);

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">Bạn không có quyền xem lịch sử coin.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold text-white">Lịch sử điều chỉnh gần đây</p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              coinType: event.target.value as AdminCoinAdjustmentHistoryFilters["coinType"],
              page: 1
            }))
          }
          value={filters.coinType ?? "all"}
        >
          <option value="all">Tất cả coin</option>
          <option value="paid">Coin nạp</option>
          <option value="bonus">Coin thưởng</option>
        </select>
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              direction: event.target.value as AdminCoinAdjustmentHistoryFilters["direction"],
              page: 1
            }))
          }
          value={filters.direction ?? "all"}
        >
          <option value="all">Cộng/trừ</option>
          <option value="credit">Cộng</option>
          <option value="debit">Trừ</option>
        </select>
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              source: event.target.value as AdminCoinAdjustmentHistoryFilters["source"],
              page: 1
            }))
          }
          value={filters.source ?? "all"}
        >
          {SOURCE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              userQuery: event.target.value || undefined,
              userId: undefined,
              page: 1
            }))
          }
          placeholder="User / email / id"
          value={filters.userQuery ?? filters.userId ?? ""}
        />
        <input
          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, from: event.target.value || undefined, page: 1 }))
          }
          type="date"
          value={filters.from?.slice(0, 10) ?? ""}
        />
        <input
          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              to: event.target.value ? `${event.target.value}T23:59:59.999Z` : undefined,
              page: 1
            }))
          }
          type="date"
          value={filters.to?.slice(0, 10) ?? ""}
        />
        <select
          className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              pageSize: Number(event.target.value) as 25 | 50 | 100,
              page: 1
            }))
          }
          value={pageSize}
        >
          <option value={25}>25 / trang</option>
          <option value={50}>50 / trang</option>
          <option value={100}>100 / trang</option>
        </select>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">{COIN_ADMIN_COPY.noTransactions}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-[11px]">
            <thead className="bg-white/[0.03] text-zinc-500">
              <tr>
                <th className="px-2 py-1.5">Thời gian</th>
                <th className="px-2 py-1.5">User</th>
                <th className="px-2 py-1.5">Loại</th>
                <th className="px-2 py-1.5">±</th>
                <th className="px-2 py-1.5">SL</th>
                <th className="px-2 py-1.5">Trước</th>
                <th className="px-2 py-1.5">Sau</th>
                <th className="px-2 py-1.5">Lý do</th>
                <th className="px-2 py-1.5">Nguồn</th>
                <th className="px-2 py-1.5">Admin</th>
                <th className="px-2 py-1.5">TT</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr className="border-t border-white/5" key={entry.id}>
                  <td className="px-2 py-1.5 whitespace-nowrap text-zinc-400">
                    {new Date(entry.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-2 py-1.5">{entry.userLabel}</td>
                  <td className="px-2 py-1.5">
                    {entry.coinType === "paid" ? "Nạp" : "Thưởng"}
                  </td>
                  <td className="px-2 py-1.5">{entry.direction === "credit" ? "+" : "−"}</td>
                  <td className="px-2 py-1.5 font-medium text-white">
                    {entry.amount.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-2 py-1.5">
                    {entry.balanceBefore != null ? entry.balanceBefore.toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    {entry.balanceAfter != null ? entry.balanceAfter.toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="max-w-[8rem] truncate px-2 py-1.5" title={entry.reason}>
                    {entry.reasonCode
                      ? formatAdminCoinReason(entry.reasonCode, entry.reason)
                      : entry.reason}
                  </td>
                  <td className="px-2 py-1.5">{entry.sourceLabel}</td>
                  <td className="px-2 py-1.5">{entry.adminLabel}</td>
                  <td className="px-2 py-1.5">
                    {STATUS_LABELS[entry.status] ?? entry.status}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      className="text-cyan-300 hover:text-cyan-200"
                      onClick={() => setDetailId(entry.id)}
                      type="button"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          Trang {filters.page ?? 1}/{totalPages} · {total.toLocaleString("vi-VN")} dòng
        </span>
        <div className="flex gap-2">
          <Button
            disabled={isPending || (filters.page ?? 1) <= 1}
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))
            }
            type="button"
            variant="ghost"
          >
            Trước
          </Button>
          <Button
            disabled={isPending || (filters.page ?? 1) >= totalPages}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: Math.min(totalPages, (prev.page ?? 1) + 1)
              }))
            }
            type="button"
            variant="ghost"
          >
            Sau
          </Button>
        </div>
      </div>

      {detail ? (
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-3 text-xs text-zinc-200">
          <p className="font-semibold text-white">Chi tiết</p>
          <p>ID: {detail.transactionId}</p>
          <p>Trạng thái: {STATUS_LABELS[detail.status] ?? detail.status}</p>
          <p>Nguồn: {detail.sourceLabel}</p>
          <p>Mã tham chiếu: {detail.referenceId ?? "—"}</p>
        </div>
      ) : null}
    </Card>
  );
}
