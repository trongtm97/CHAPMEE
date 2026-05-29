"use client";

import { useCallback, useState, useTransition } from "react";
import { AdminCoinsPageHeader } from "@/components/admin/AdminCoinsPageHeader";
import { BulkCoinAdjustment } from "@/components/admin/BulkCoinAdjustment";
import { CoinAdjustmentForm } from "@/components/admin/CoinAdjustmentForm";
import { CoinAdjustmentHistory } from "@/components/admin/CoinAdjustmentHistory";
import { CoinDashboardCards } from "@/components/admin/CoinDashboardCards";
import { CoinSafetyLimits } from "@/components/admin/CoinSafetyLimits";
import { UserCoinSearch } from "@/components/admin/UserCoinSearch";
import { UserWalletPanel } from "@/components/admin/UserWalletPanel";
import { COIN_ADMIN_COPY } from "@/components/admin/coin-form-copy";
import type { CoinAdminCapabilities } from "@/lib/admin/coin-capabilities";
import {
  exportCoinHistoryAction,
  fetchCoinDashboardAction,
  fetchUserCoinAdminDataAction,
  searchCoinUsersAction
} from "@/lib/admin/coin-wallet-actions";
import type {
  AdminCoinAdjustmentDirection,
  AdminCoinDashboardMetrics,
  CoinAdminUserRow,
  UserCoinLedgerEntry,
  UserCoinWalletDetail
} from "@/types/coins";

type AdminCoinsPageProps = {
  initialMetrics: AdminCoinDashboardMetrics;
  limits: {
    maxPerUserPerAction: number;
    maxBatchUsers: number;
    maxBatchTotalCoins: number;
    highAmountWarning: number;
  };
  capabilities: CoinAdminCapabilities;
};

type TabId = "overview" | "adjust" | "history";

export function AdminCoinsPage({
  initialMetrics,
  limits,
  capabilities
}: AdminCoinsPageProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const [metrics, setMetrics] = useState(initialMetrics);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoinAdminUserRow[]>([]);
  const [selected, setSelected] = useState<CoinAdminUserRow | null>(null);
  const [wallet, setWallet] = useState<UserCoinWalletDetail | null>(null);
  const [entries, setEntries] = useState<UserCoinLedgerEntry[]>([]);
  const [adjustDirection, setAdjustDirection] =
    useState<AdminCoinAdjustmentDirection>("credit");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshDashboard = useCallback(() => {
    startTransition(async () => {
      const result = await fetchCoinDashboardAction();
      if (result.data) setMetrics(result.data);
    });
  }, []);

  const reloadUser = useCallback((userId: string) => {
    startTransition(async () => {
      const result = await fetchUserCoinAdminDataAction(userId);
      setWallet(result.wallet);
      setEntries(result.entries);
      if (result.error) setMessage(result.error);
    });
  }, []);

  function searchUsers() {
    if (!query.trim()) {
      setMessage("Nhập username, email, tên hiển thị hoặc user id.");
      return;
    }
    startTransition(async () => {
      const result = await searchCoinUsersAction(query);
      setResults(result.users);
      setMessage(result.error ?? (result.users.length === 0 ? "Không tìm thấy user." : null));
    });
  }

  function selectUser(user: CoinAdminUserRow) {
    setSelected(user);
    setTab("adjust");
    reloadUser(user.id);
  }

  function handleAdjust(user: CoinAdminUserRow, direction: AdminCoinAdjustmentDirection) {
    setSelected(user);
    setAdjustDirection(direction);
    setTab("adjust");
    reloadUser(user.id);
  }

  function handleAdjustmentSuccess() {
    if (selected) reloadUser(selected.id);
    refreshDashboard();
    if (query.trim()) searchUsers();
  }

  function exportHistory() {
    if (!capabilities.canExport) return;
    startTransition(async () => {
      const result = await exportCoinHistoryAction({ page: 1, pageSize: 100 });
      if (result.error || !result.csv) {
        setMessage(result.error ?? "Không xuất được file.");
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lich-su-coin-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: COIN_ADMIN_COPY.tabOverview },
    { id: "adjust", label: COIN_ADMIN_COPY.tabAdjust },
    { id: "history", label: COIN_ADMIN_COPY.tabHistory }
  ];

  const maskedResults = capabilities.canViewEmail
    ? results
    : results.map((user) => ({ ...user, email: null }));

  const selectedForView =
    selected && capabilities.canViewEmail
      ? selected
      : selected
        ? { ...selected, email: null }
        : null;

  return (
    <div className="space-y-5">
      <AdminCoinsPageHeader
        canExport={capabilities.canExport}
        exporting={isPending}
        onExport={exportHistory}
      />

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-1">
        {tabs.map((item) => (
          <button
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? "bg-cyan-300/15 text-cyan-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className="space-y-3">
          <CoinDashboardCards metrics={metrics} />
        </section>
      ) : null}

      {tab === "adjust" ? (
        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="space-y-4">
              <UserCoinSearch
                onAdjust={(user) => handleAdjust(user, "credit")}
                onQueryChange={setQuery}
                onSearch={searchUsers}
                onSelect={selectUser}
                query={query}
                results={maskedResults}
                searching={isPending}
                selectedId={selected?.id ?? null}
              />
              {capabilities.canAdjust ? <CoinSafetyLimits {...limits} /> : null}
              {capabilities.canBulkAdjust ? (
                <BulkCoinAdjustment
                  limits={limits}
                  onSuccess={() => {
                    refreshDashboard();
                    if (selected) reloadUser(selected.id);
                  }}
                />
              ) : capabilities.canView ? (
                <p className="text-sm text-zinc-500">{COIN_ADMIN_COPY.noBulkPermission}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              {selectedForView ? (
                <>
                  <UserWalletPanel
                    canAdjust={capabilities.canAdjust}
                    entries={entries}
                    loading={isPending && !wallet}
                    onAdjustCredit={() => setAdjustDirection("credit")}
                    onAdjustDebit={() => setAdjustDirection("debit")}
                    showEmail={capabilities.canViewEmail}
                    user={selectedForView}
                    wallet={wallet}
                  />
                  {capabilities.canAdjust ? (
                    <CoinAdjustmentForm
                      initialDirection={adjustDirection}
                      limits={limits}
                      onSuccess={handleAdjustmentSuccess}
                      user={selectedForView}
                      wallet={wallet}
                    />
                  ) : null}
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
                  {COIN_ADMIN_COPY.selectUserHint}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "history" ? <CoinAdjustmentHistory canView={capabilities.canView} /> : null}

      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
    </div>
  );
}
