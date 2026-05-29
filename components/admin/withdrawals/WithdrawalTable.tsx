"use client";

import Image from "next/image";
import { formatVnd } from "@/lib/admin/withdrawals/withdrawal-labels";
import type { AdminWithdrawalListRow } from "@/types/admin-withdrawal";
import { WithdrawalRiskBadge, WithdrawalStatusBadge } from "@/components/admin/withdrawals/WithdrawalBadges";
import { Button } from "@/components/ui";

type Props = {
  rows: AdminWithdrawalListRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function WithdrawalTable({ rows, selectedId, onSelect }: Props) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Mã</th>
            <th className="px-4 py-3">Tác giả</th>
            <th className="px-4 py-3">Studio</th>
            <th className="px-4 py-3 text-right">Số tiền</th>
            <th className="px-4 py-3 text-right">Thực nhận</th>
            <th className="px-4 py-3">Phương thức</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Ngày tạo</th>
            <th className="px-4 py-3">Rủi ro</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={`border-t border-white/5 ${
                selectedId === row.id ? "bg-cyan-500/10" : "hover:bg-white/[0.02]"
              }`}
              key={row.id}
            >
              <td className="px-4 py-3 font-mono text-xs text-cyan-200">{row.withdrawalCode}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {row.avatarUrl ? (
                    <Image
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                      height={32}
                      src={row.avatarUrl}
                      width={32}
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs">
                      {row.displayName.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-white">
                      {row.displayName}
                      {row.hasBlueTick ? (
                        <span className="ml-1 text-cyan-300" title="Đã xác minh">
                          ✓
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-zinc-500">
                      @{row.username ?? "—"} · {row.email ?? "—"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-300">{row.studioName ?? "—"}</td>
              <td className="px-4 py-3 text-right text-white">{formatVnd(row.amountVnd)}</td>
              <td className="px-4 py-3 text-right text-emerald-200">
                {formatVnd(row.netAmountVnd)}
                {row.feeVnd > 0 ? (
                  <p className="text-[10px] text-zinc-500">Phí {formatVnd(row.feeVnd)}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-zinc-300">{row.methodLabel}</td>
              <td className="px-4 py-3">
                <WithdrawalStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {new Date(row.requestedAt).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3">
                <WithdrawalRiskBadge level={row.riskLevel} />
              </td>
              <td className="px-4 py-3 text-right">
                <Button onClick={() => onSelect(row.id)} type="button" variant="secondary">
                  Xem chi tiết
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
