"use client";

import { useCallback, useState, useTransition } from "react";
import { CreatorFeePolicyForm } from "@/components/admin/CreatorFeePolicyForm";
import { CreatorFeePolicyHistory } from "@/components/admin/CreatorFeePolicyHistory";
import { Button, Card } from "@/components/ui";
import {
  fetchCreatorFeePoliciesForUserAction,
  fetchCreatorFeePolicyTransactionsAction
} from "@/lib/admin/creator-fee-policy-actions";
import { searchAdminUsers, type AdminUserSearchResult } from "@/lib/admin/get-users";
import type { CreatorFeePolicyAdminView } from "@/types/creator-fee-policy";
import type { ResolvedCreatorFeePolicy } from "@/types/creator-fee-policy";

export function AdminCreatorFeePoliciesPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserSearchResult[]>([]);
  const [selected, setSelected] = useState<AdminUserSearchResult | null>(null);
  const [policies, setPolicies] = useState<CreatorFeePolicyAdminView[]>([]);
  const [current, setCurrent] = useState<CreatorFeePolicyAdminView | null>(null);
  const [defaultResolved, setDefaultResolved] = useState<ResolvedCreatorFeePolicy | null>(null);
  const [editing, setEditing] = useState<CreatorFeePolicyAdminView | null>(null);
  const [txPreview, setTxPreview] = useState<
    Array<{
      id: string;
      source_type: string;
      gross_amount_vnd: number;
      creator_net_amount_vnd: number;
      created_at: string;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reloadPolicies = useCallback(
    (creatorId: string) => {
      startTransition(async () => {
        const result = await fetchCreatorFeePoliciesForUserAction(creatorId);
        setPolicies(result.policies);
        setCurrent(result.current ?? null);
        setDefaultResolved(result.defaultResolved ?? null);
        if (result.error) {
          setMessage(result.error);
        }
      });
    },
    []
  );

  function searchUsers() {
    startTransition(async () => {
      const result = await searchAdminUsers({ query, page: 1, pageSize: 10 });
      setResults(result.users);
      if (result.error) {
        setMessage(result.error);
      }
    });
  }

  function selectUser(user: AdminUserSearchResult) {
    setSelected(user);
    setEditing(null);
    setTxPreview([]);
    reloadPolicies(user.id);
  }

  function viewTransactions(policyId: string) {
    startTransition(async () => {
      const result = await fetchCreatorFeePolicyTransactionsAction(policyId);
      setTxPreview(
        (result.rows ?? []) as Array<{
          id: string;
          source_type: string;
          gross_amount_vnd: number;
          creator_net_amount_vnd: number;
          created_at: string;
        }>
      );
      if (result.error) {
        setMessage(result.error);
      }
    });
  }

  const effective = current && ["active", "scheduled"].includes(current.status) ? current : null;

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <p className="text-sm text-zinc-400">
          Thiết lập tỷ lệ phí riêng theo tác giả. Transactions mới lưu snapshot; giao dịch cũ không
          đổi khi đổi policy.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm username, tên hoặc user id..."
            value={query}
          />
          <Button disabled={isPending} onClick={searchUsers} type="button">
            Tìm
          </Button>
        </div>
        {results.length > 0 ? (
          <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
            {results.map((user) => (
              <li key={user.id}>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => selectUser(user)}
                  type="button"
                >
                  <span className="text-white">
                    {user.display_name ?? user.username ?? user.id}
                  </span>
                  <span className="text-zinc-500">@{user.username ?? "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {message ? <p className="text-sm text-amber-300">{message}</p> : null}

      {selected ? (
        <>
          <Card className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              {selected.display_name ?? selected.username}
            </h2>
            <p className="text-sm text-zinc-400">User ID: {selected.id}</p>
            {effective ? (
              <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                <p className="font-semibold">Policy hiện tại: {effective.policy_name}</p>
                <p>
                  Creator {effective.creator_revenue_share_percent ?? "—"}% · Platform{" "}
                  {effective.platform_fee_percent ?? "—"}%
                </p>
                <p className="text-xs text-cyan-200/80">
                  {new Date(effective.starts_at).toLocaleString("vi-VN")}
                  {effective.ends_at
                    ? ` → ${new Date(effective.ends_at).toLocaleString("vi-VN")}`
                    : " → không giới hạn"}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-zinc-600 bg-zinc-800/50 p-3 text-sm text-zinc-300">
                Không có override — dùng config mặc định (creator{" "}
                {defaultResolved?.creatorRevenueSharePercent ?? "—"}%, platform{" "}
                {defaultResolved?.platformFeePercent ?? "—"}%).
              </div>
            )}
          </Card>

          <CreatorFeePolicyForm
            creatorId={selected.id}
            editing={editing}
            onSuccess={() => {
              setEditing(null);
              reloadPolicies(selected.id);
            }}
          />

          <CreatorFeePolicyHistory
            onEdit={(policy) => setEditing(policy)}
            onRefresh={() => reloadPolicies(selected.id)}
            onViewTransactions={viewTransactions}
            policies={policies}
          />

          {txPreview.length > 0 ? (
            <Card className="space-y-2">
              <h3 className="font-semibold text-white">Transactions áp dụng policy</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                {txPreview.map((row) => (
                  <li className="rounded border border-white/10 px-3 py-2" key={row.id}>
                    {row.source_type} · gross{" "}
                    {Number(row.gross_amount_vnd).toLocaleString("vi-VN")} ₫ · net{" "}
                    {Number(row.creator_net_amount_vnd).toLocaleString("vi-VN")} ₫ ·{" "}
                    {new Date(row.created_at).toLocaleString("vi-VN")}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
