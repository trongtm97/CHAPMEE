"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EarningTransactionDetailModal } from "@/components/studio/EarningTransactionDetailModal";
import {
  FinanceBadge,
  FinanceSection,
  financeSecurityEventLabel,
  formatFinanceVnd
} from "@/components/studio/finance/finance-ui";
import type {
  BankAccountView,
  CreatorWalletLedgerRow,
  EarningsBreakdownRow,
  EarningsPeriodFilter,
  FinanceSecurityLogRow,
  WithdrawalHistoryRow
} from "@/types/finance";

const PAGE_SIZE = 8;

type TabId = "earnings" | "withdrawals" | "ledger" | "security" | "bankAccounts";

const TABS: { id: TabId; label: string }[] = [
  { id: "earnings", label: "Doanh thu" },
  { id: "withdrawals", label: "Yêu cầu rút" },
  { id: "ledger", label: "Sổ cái" },
  { id: "security", label: "Bảo mật tài chính" },
  { id: "bankAccounts", label: "Tài khoản nhận tiền" }
];

const PERIOD_OPTIONS: { value: EarningsPeriodFilter; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
  { value: "all", label: "Tất cả" }
];

const ACCOUNT_STATUS_LABEL: Record<BankAccountView["accountStatus"], string> = {
  verified: "Đã xác thực",
  pending_email: "Chưa xác thực email",
  pending_identity: "Chờ xác thực danh tính",
  locked_24h: "Đang khóa rút 24h",
  locked_by_admin: "Bị admin khóa"
};

type FinanceHistoryTabsProps = {
  earningsRows: EarningsBreakdownRow[];
  earningsFilter: EarningsPeriodFilter;
  ledgerRows: CreatorWalletLedgerRow[];
  withdrawalHistory: WithdrawalHistoryRow[];
  securityLogs: FinanceSecurityLogRow[];
  bankAccounts: BankAccountView[];
};

export function FinanceHistoryTabs({
  earningsRows,
  earningsFilter,
  ledgerRows,
  withdrawalHistory,
  securityLogs,
  bankAccounts
}: FinanceHistoryTabsProps) {
  const [tab, setTab] = useState<TabId>("earnings");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (tab === "earnings") return earningsRows;
    if (tab === "withdrawals") return withdrawalHistory;
    if (tab === "ledger") return ledgerRows;
    if (tab === "security") return securityLogs;
    return bankAccounts;
  }, [tab, earningsRows, withdrawalHistory, ledgerRows, securityLogs, bankAccounts]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <FinanceSection description="Theo dõi doanh thu, rút tiền và sự kiện bảo mật." title="Lịch sử">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              tab === item.id
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
            key={item.id}
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "earnings" ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((option) => (
            <Link
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                earningsFilter === option.value
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-100"
                  : "border-white/10 text-zinc-500 hover:text-zinc-300"
              }`}
              href={`/studio/finance?period=${option.value}`}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
          Chưa có dữ liệu trong mục này.
        </p>
      ) : tab === "bankAccounts" ? (
        <ul className="space-y-2">
          {(slice as BankAccountView[]).map((account) => (
            <li
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm"
              key={account.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-100">{account.bankName}</p>
                  <p className="text-zinc-400">{account.accountNumberDisplay}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {account.isDefault ? <FinanceBadge tone="cyan">Mặc định</FinanceBadge> : null}
                  <FinanceBadge tone="slate">{ACCOUNT_STATUS_LABEL[account.accountStatus]}</FinanceBadge>
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Cập nhật: {new Date(account.updatedAt).toLocaleDateString("vi-VN")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <tbody>
                {tab === "earnings"
                  ? (slice as EarningsBreakdownRow[]).map((row) => (
                      <tr className="border-t border-white/5 first:border-t-0" key={row.id}>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {new Date(row.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-3 py-2 text-zinc-200">{row.contentLabel}</td>
                        <td className="px-3 py-2 text-zinc-400">{row.sourceLabel}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-200">
                          {formatFinanceVnd(row.creatorNetVnd)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                            onClick={() => setDetailId(row.id)}
                            type="button"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  : null}
                {tab === "withdrawals"
                  ? (slice as WithdrawalHistoryRow[]).map((row) => (
                      <tr className="border-t border-white/5 first:border-t-0" key={row.id}>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {new Date(row.requestedAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-3 py-2 font-semibold text-zinc-100">
                          {formatFinanceVnd(row.amountVnd)}
                        </td>
                        <td className="px-3 py-2 text-zinc-400">{row.payoutMasked}</td>
                        <td className="px-3 py-2 text-amber-200">{row.statusLabel}</td>
                      </tr>
                    ))
                  : null}
                {tab === "ledger"
                  ? (slice as CreatorWalletLedgerRow[]).map((row) => (
                      <tr className="border-t border-white/5 first:border-t-0" key={row.id}>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {new Date(row.created_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-3 py-2 text-zinc-300">{row.type}</td>
                        <td className="px-3 py-2 text-right text-zinc-100">
                          {row.direction === "credit" ? "+" : "−"}
                          {formatFinanceVnd(row.amount_vnd)}
                        </td>
                      </tr>
                    ))
                  : null}
                {tab === "security"
                  ? (slice as FinanceSecurityLogRow[]).map((row) => (
                      <tr className="border-t border-white/5 first:border-t-0" key={row.id}>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {new Date(row.created_at).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-3 py-2 text-zinc-200">
                          {financeSecurityEventLabel(row.event_type)}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Trang {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Trước
                </button>
                <button
                  className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {detailId ? (
        <EarningTransactionDetailModal earningTransactionId={detailId} onClose={() => setDetailId(null)} />
      ) : null}
    </FinanceSection>
  );
}
