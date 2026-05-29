"use client";

import Link from "next/link";
import { UserCoinLedgerTable } from "@/components/admin/UserCoinLedgerTable";
import { COIN_ADMIN_COPY } from "@/components/admin/coin-form-copy";
import { AvatarFallback, Button, Card } from "@/components/ui";
import type { CoinAdminUserRow, UserCoinLedgerEntry, UserCoinWalletDetail } from "@/types/coins";

type UserWalletPanelProps = {
  user: CoinAdminUserRow;
  wallet: UserCoinWalletDetail | null;
  entries: UserCoinLedgerEntry[];
  loading?: boolean;
  canAdjust: boolean;
  showEmail?: boolean;
  onAdjustCredit: () => void;
  onAdjustDebit: () => void;
};

function statusLabel(status: string) {
  if (status === "active") return "Hoạt động";
  if (status === "banned") return "Đã khóa";
  if (status === "suspended") return "Tạm khóa";
  return status;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 px-2.5 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

export function UserWalletPanel({
  user,
  wallet,
  entries,
  loading,
  canAdjust,
  showEmail = true,
  onAdjustCredit,
  onAdjustDebit
}: UserWalletPanelProps) {
  if (loading) {
    return (
      <Card className="py-4">
        <p className="text-sm text-zinc-500">Đang tải ví…</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <AvatarFallback
          name={user.display_name ?? user.username ?? user.id}
          size="sm"
          src={user.avatar_url}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{user.display_name ?? user.username}</p>
          <p className="text-xs text-zinc-500">@{user.username ?? user.id.slice(0, 8)}</p>
          {showEmail && user.email ? (
            <p className="text-xs text-zinc-600">{user.email}</p>
          ) : null}
          <p className="text-xs text-zinc-600">{statusLabel(user.status)}</p>
        </div>
        {canAdjust ? (
          <div className="flex gap-1.5">
            <Button onClick={onAdjustCredit} type="button">
              Cộng coin
            </Button>
            <Button onClick={onAdjustDebit} type="button" variant="danger">
              Trừ coin
            </Button>
          </div>
        ) : (
          <p className="text-xs text-amber-200/90">{COIN_ADMIN_COPY.noAdjustPermission}</p>
        )}
      </div>

      {wallet ? (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Metric
            label={COIN_ADMIN_COPY.paidLabel}
            value={`${wallet.walletPaid.toLocaleString("vi-VN")}`}
          />
          <Metric
            label={COIN_ADMIN_COPY.bonusLabel}
            value={`${wallet.walletBonus.toLocaleString("vi-VN")}`}
          />
          <Metric label="Tổng khả dụng" value={`${wallet.walletTotal.toLocaleString("vi-VN")}`} />
          <Metric
            label="Đã nạp (paid)"
            value={`${wallet.totalPurchased.toLocaleString("vi-VN")}`}
          />
          <Metric
            label="Bonus đã nhận"
            value={`${(wallet.totalBonusReceived ?? wallet.totalGifted).toLocaleString("vi-VN")}`}
          />
          <Metric label="Đã tiêu" value={`${wallet.totalSpent.toLocaleString("vi-VN")}`} />
          <Metric
            label="Đã thu hồi"
            value={`${(wallet.totalRevoked ?? wallet.totalRefundedOrDebited).toLocaleString("vi-VN")}`}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-zinc-300">Giao dịch gần nhất</p>
          <Link
            className="text-[11px] text-cyan-300 hover:text-cyan-200"
            href={`/admin/audit?targetId=${user.id}`}
          >
            Xem toàn bộ ledger
          </Link>
        </div>
        <UserCoinLedgerTable emptyMessage={COIN_ADMIN_COPY.noTransactions} entries={entries} />
      </div>
    </Card>
  );
}
