"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import {
  transactionStatusLabel,
  transactionTypeLabel
} from "@/lib/finance/finance-labels";
import type { TransactionRow } from "@/types/transaction";

type RecentTransactionsTableProps = {
  initialRows: TransactionRow[];
  initialRiskIds: string[];
  initialTotal: number;
  rangeFrom: string | null;
  rangeTo: string | null;
  canView: boolean;
};

type ApiResponse = {
  ok: boolean;
  data: TransactionRow[];
  total: number;
  error?: string;
};

export function RecentTransactionsTable({
  initialRows,
  initialRiskIds,
  initialTotal,
  rangeFrom,
  rangeTo,
  canView
}: RecentTransactionsTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [riskIds, setRiskIds] = useState(new Set(initialRiskIds));
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [riskOnly, setRiskOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const useServerInitial = !fetched;

  const load = useCallback(
    (nextPage = page) => {
      if (!canView) return;
      startTransition(async () => {
        setError(null);
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(pageSize)
        });
        if (search) params.set("search", search);
        if (type) params.set("type", type);
        if (status) params.set("status", status);
        if (source) params.set("source", source);
        if (riskOnly) params.set("riskOnly", "1");
        if (rangeFrom) params.set("startDate", rangeFrom);
        if (rangeTo) params.set("endDate", rangeTo);

        const res = await fetch(`/api/admin/finance/transactions?${params.toString()}`);
        const json = (await res.json()) as ApiResponse & { riskIds?: string[] };
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Không tải được giao dịch.");
          return;
        }
        setRows(json.data);
        setTotal(json.total);
        setRiskIds(new Set(json.riskIds ?? []));
        setPage(nextPage);
        setFetched(true);
      });
    },
    [canView, page, pageSize, search, type, status, source, riskOnly, rangeFrom, rangeTo]
  );

  const displayRows = useServerInitial ? initialRows : rows;
  const displayRiskIds = useServerInitial ? new Set(initialRiskIds) : riskIds;
  const displayTotal = useServerInitial ? initialTotal : total;
  const totalPages = Math.max(1, Math.ceil(displayTotal / pageSize));

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">Bạn không có quyền xem toàn bộ giao dịch.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-white">Giao dịch gần đây</h3>
        <Link className="text-sm font-semibold text-cyan-300" href="/admin/transactions">
          Xem tất cả giao dịch →
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Tìm kiếm"
          onChange={(e) => {
            setPage(1);
            setSearch(e.currentTarget.value);
          }}
          placeholder="Mã giao dịch, user, email..."
          value={search}
        />
        <FilterSelect
          label="Loại giao dịch"
          onChange={(v) => {
            setPage(1);
            setType(v);
          }}
          options={[
            ["", "Tất cả"],
            ["coin_purchase", "Nạp coin"],
            ["chapter_unlock", "Mở khóa chương"],
            ["author_tip", "Tip tác giả"],
            ["virtual_gift", "Quà tặng"],
            ["refund", "Hoàn tiền"],
            ["payout_completed", "Rút tiền"],
            ["admin_coin_adjustment", "Admin điều chỉnh coin"]
          ]}
          value={type}
        />
        <FilterSelect
          label="Trạng thái"
          onChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
          options={[
            ["", "Tất cả"],
            ["pending", "Pending"],
            ["completed", "Paid"],
            ["failed", "Failed"],
            ["refunded", "Refunded"],
            ["reversed", "Reversed"]
          ]}
          value={status}
        />
        <FilterSelect
          label="Nguồn thanh toán"
          onChange={(v) => {
            setPage(1);
            setSource(v);
          }}
          options={[
            ["", "Tất cả"],
            ["sepay", "SePay"],
            ["payment", "Payment"],
            ["admin", "Admin"]
          ]}
          value={source}
        />
        <label className="flex items-end gap-2 pb-2 text-sm text-zinc-300">
          <input
            checked={riskOnly}
            onChange={(e) => {
              setPage(1);
              setFetched(false);
              setRiskOnly(e.currentTarget.checked);
            }}
            type="checkbox"
          />
          Có rủi ro
        </label>
        <div className="flex items-end">
          <Button
            disabled={isPending}
            onClick={() => load(1)}
            type="button"
          >
            Áp dụng lọc
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {displayRows.length === 0 ? (
        <p className="text-sm text-zinc-400">Chưa có giao dịch trong khoảng thời gian này.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-zinc-500">
                <th className="px-2 py-2">Thời gian</th>
                <th className="px-2 py-2">Mã</th>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Loại</th>
                <th className="px-2 py-2">Số tiền</th>
                <th className="px-2 py-2">Coin</th>
                <th className="px-2 py-2">Trạng thái</th>
                <th className="px-2 py-2">Nguồn</th>
                <th className="px-2 py-2">Rủi ro</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((tx) => (
                <tr className="border-b border-white/5" key={tx.id}>
                  <td className="px-2 py-2 text-zinc-400">
                    {new Date(tx.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-zinc-200">
                    {tx.transaction_code}
                  </td>
                  <td className="px-2 py-2 text-zinc-300">{tx.user_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-2 py-2">{transactionTypeLabel(tx.type)}</td>
                  <td className="px-2 py-2">
                    {(tx.money_amount_vnd ?? 0).toLocaleString("vi-VN")} đ
                  </td>
                  <td className="px-2 py-2">{(tx.coin_amount ?? 0).toLocaleString("vi-VN")}</td>
                  <td className="px-2 py-2">{transactionStatusLabel(tx.status)}</td>
                  <td className="px-2 py-2">{tx.source}</td>
                  <td className="px-2 py-2">
                    {displayRiskIds.has(tx.id) ? (
                      <span className="text-amber-300">Có</span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Link className="text-cyan-300" href={`/admin/transactions`}>
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm text-zinc-400">
          Hiển thị
          <select
            className="ml-2 rounded-lg border border-white/10 bg-zinc-950 px-2 py-1"
            onChange={(e) => {
              setPage(1);
              setFetched(false);
              setPageSize(Number(e.currentTarget.value));
            }}
            value={pageSize}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            disabled={page <= 1 || isPending}
            onClick={() => load(Math.max(1, page - 1))}
            type="button"
            variant="ghost"
          >
            Trước
          </Button>
          <span className="text-sm text-zinc-400">
            Trang {page}/{totalPages} ({displayTotal} giao dịch)
          </span>
          <Button
            disabled={page >= totalPages || isPending}
            onClick={() => load(page + 1)}
            type="button"
            variant="ghost"
          >
            Sau
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="space-y-1 text-sm text-zinc-300">
      <span>{label}</span>
      <select
        className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2"
        onChange={(e) => onChange(e.currentTarget.value)}
        value={value}
      >
        {options.map(([v, l]) => (
          <option key={v || "all"} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
