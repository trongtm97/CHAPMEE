"use client";

import { useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { disableCreatorFeePolicyAction } from "@/lib/admin/disable-creator-fee-policy";
import type { CreatorFeePolicyAdminView } from "@/types/creator-fee-policy";

type CreatorFeePolicyHistoryProps = {
  policies: CreatorFeePolicyAdminView[];
  onRefresh: () => void;
  onEdit: (policy: CreatorFeePolicyAdminView) => void;
  onViewTransactions: (policyId: string) => void;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  active: "Đang hiệu lực",
  scheduled: "Đã hẹn",
  expired: "Hết hạn",
  disabled: "Đã tắt"
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

export function CreatorFeePolicyHistory({
  policies,
  onRefresh,
  onEdit,
  onViewTransactions
}: CreatorFeePolicyHistoryProps) {
  const [isPending, startTransition] = useTransition();

  function disablePolicy(policyId: string) {
    const reason = window.prompt("Lý do tắt chính sách (tuỳ chọn):") ?? "";
    startTransition(async () => {
      const result = await disableCreatorFeePolicyAction(policyId, reason);
      if (result.ok) {
        onRefresh();
      } else {
        window.alert(result.error ?? "Không thể tắt.");
      }
    });
  }

  if (!policies.length) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">Chưa có chính sách phí riêng cho tác giả này.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 overflow-x-auto">
      <h3 className="text-lg font-semibold text-white">Lịch sử chính sách</h3>
      <table className="min-w-full text-left text-sm">
        <thead className="text-zinc-400">
          <tr>
            <th className="py-2 pr-3">Tên</th>
            <th className="py-2 pr-3">Trạng thái</th>
            <th className="py-2 pr-3">Creator %</th>
            <th className="py-2 pr-3">Platform %</th>
            <th className="py-2 pr-3">Hiệu lực</th>
            <th className="py-2 pr-3">Transactions</th>
            <th className="py-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr className="border-t border-white/5 text-zinc-200" key={policy.id}>
              <td className="py-2 pr-3 font-medium text-white">{policy.policy_name}</td>
              <td className="py-2 pr-3">{STATUS_LABEL[policy.status] ?? policy.status}</td>
              <td className="py-2 pr-3">
                {policy.creator_revenue_share_percent ?? "—"}
              </td>
              <td className="py-2 pr-3">{policy.platform_fee_percent ?? "—"}</td>
              <td className="py-2 pr-3 text-xs">
                {formatDate(policy.starts_at)}
                <br />
                → {formatDate(policy.ends_at)}
              </td>
              <td className="py-2 pr-3">{policy.transaction_count}</td>
              <td className="py-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="!px-2 !py-1 text-xs"
                    onClick={() => onViewTransactions(policy.id)}
                    type="button"
                    variant="secondary"
                  >
                    Transactions
                  </Button>
                  <Button
                    className="!px-2 !py-1 text-xs"
                    onClick={() => onEdit(policy)}
                    type="button"
                    variant="secondary"
                  >
                    Sửa
                  </Button>
                  {policy.status === "active" || policy.status === "scheduled" ? (
                    <Button
                      className="!px-2 !py-1 text-xs"
                      disabled={isPending}
                      onClick={() => disablePolicy(policy.id)}
                      type="button"
                      variant="secondary"
                    >
                      Tắt
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
