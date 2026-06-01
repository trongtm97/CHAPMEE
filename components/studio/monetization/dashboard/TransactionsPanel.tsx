"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { MonetizationFilterChip } from "@/components/studio/monetization/monetization-ui";
import { MonetizationBadge, transactionKindTone } from "@/components/studio/monetization/monetization-ui";
import { DateLabel } from "@/components/studio/monetization/dashboard/DateLabel";
import { PaginationControls } from "@/components/studio/monetization/dashboard/PaginationControls";
import { MonetizationEmptyHint } from "@/components/studio/monetization/dashboard/MonetizationEmptyHint";
import { MonetizationTableSkeleton } from "@/components/studio/monetization/monetization-ui";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import { TRANSACTION_FILTER_OPTIONS } from "@/lib/studio/monetization-labels";
import { studioFetchMonetizationTransactionsAction } from "@/lib/studio/studio-monetization-actions";
import type { StudioTransactionFilter } from "@/types/studio-monetization-dashboard";

type TransactionsPanelProps = {
  canLoad: boolean;
};

export function TransactionsPanel({ canLoad }: TransactionsPanelProps) {
  const [filter, setFilter] = useState<StudioTransactionFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof studioFetchMonetizationTransactionsAction>>["rows"]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    if (!canLoad) {
      setLoading(false);
      return;
    }
    startTransition(async () => {
      setLoading(true);
      const result = await studioFetchMonetizationTransactionsAction({
        page,
        pageSize,
        filter,
        search: debouncedSearch || undefined
      });
      setRows(result.rows);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setError(result.error);
      setLoading(false);
    });
  }, [canLoad, page, pageSize, filter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  if (!canLoad) {
    return (
      <MonetizationEmptyHint
        description="Giao dịch sẽ hiển thị khi tài khoản được mở kiếm tiền."
        title="Chưa có quyền xem giao dịch"
      />
    );
  }

  const adFiltersDisabled = ["ad_estimated", "ad_finalized", "reserve_hold", "reserve_release"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          aria-label="Tìm giao dịch"
          className="h-10 w-full max-w-md rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400/40 focus:outline-none"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo truyện, loại giao dịch…"
          type="search"
          value={search}
        />
        <button
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
          disabled={isPending}
          onClick={load}
          type="button"
        >
          Thử lại
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TRANSACTION_FILTER_OPTIONS.map((opt) => {
          const disabled = adFiltersDisabled.includes(opt.value);
          return (
            <MonetizationFilterChip
              active={filter === opt.value}
              disabled={disabled}
              key={opt.value}
              onClick={() => !disabled && setFilter(opt.value)}
            >
              {opt.label}
              {disabled ? " (QC)" : ""}
            </MonetizationFilterChip>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500">
        Giao dịch quảng cáo xem tại tab Doanh thu quảng cáo. Bộ lọc QC sẽ bổ sung khi API tổng hợp
        sẵn sàng.
      </p>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/40">
        {loading ? (
          <MonetizationTableSkeleton rows={6} />
        ) : error ? (
          <div className="px-4 py-6 text-sm text-rose-200">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8">
            <MonetizationEmptyHint
              description="Giao dịch tip, mở khóa chương và rút tiền sẽ hiện tại đây."
              title="Bạn chưa có giao dịch nào"
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-2 font-semibold">Thời gian</th>
                    <th className="px-4 py-2 font-semibold">Loại</th>
                    <th className="px-4 py-2 font-semibold">Nguồn</th>
                    <th className="px-4 py-2 font-semibold text-right">Net</th>
                    <th className="px-4 py-2 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tx) => {
                    const tone = transactionKindTone(tx.kind ?? "other");
                    return (
                      <tr className="border-b border-white/5" key={tx.id}>
                        <td className="px-4 py-3 text-zinc-400">
                          <DateLabel iso={tx.createdAt} variant="datetime" />
                        </td>
                        <td className="px-4 py-3">
                          <MonetizationBadge tone={tone}>{tx.typeLabel}</MonetizationBadge>
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-zinc-300">
                          {tx.contentLabel}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          {formatMonetizationVnd(tx.amountVnd)}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{tx.statusLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-white/5 md:hidden">
              {rows.map((tx) => {
                const tone = transactionKindTone(tx.kind ?? "other");
                return (
                  <li className="px-4 py-3" key={tx.id}>
                    <div className="flex items-start justify-between gap-2">
                      <MonetizationBadge tone={tone}>{tx.typeLabel}</MonetizationBadge>
                      <span className="font-semibold text-white">
                        {formatMonetizationVnd(tx.amountVnd)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {tx.contentLabel} · <DateLabel iso={tx.createdAt} variant="datetime" />
                    </p>
                    <p className="text-xs text-zinc-600">{tx.statusLabel}</p>
                  </li>
                );
              })}
            </ul>

            <PaginationControls
              disabled={isPending}
              onPageChange={setPage}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              totalPages={totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}
