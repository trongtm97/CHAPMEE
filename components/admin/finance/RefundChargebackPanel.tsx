import Link from "next/link";
import { Card } from "@/components/ui";
import type { FinanceRefundPanel } from "@/types/finance";

type RefundChargebackPanelProps = {
  panel: FinanceRefundPanel;
  isEmpty: boolean;
};

function vnd(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export function RefundChargebackPanel({ panel, isEmpty }: RefundChargebackPanelProps) {
  if (isEmpty && panel.refundRequests === 0 && panel.openChargebacks === 0) {
    return (
      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">Hoàn tiền & tranh chấp</h3>
        <p className="text-sm text-zinc-400">Chưa có hoàn tiền hoặc chargeback.</p>
        <Link className="text-sm font-semibold text-cyan-300" href="/admin/refunds">
          Quản lý hoàn tiền
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-white">Hoàn tiền & tranh chấp</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="font-semibold text-cyan-300" href="/admin/refunds">
            Quản lý hoàn tiền
          </Link>
          <Link className="font-semibold text-cyan-300" href="/admin/refunds">
            Xem chargeback
          </Link>
          <Link className="font-semibold text-cyan-300" href="/admin/refunds">
            Nội dung bị hoàn nhiều
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Yêu cầu hoàn tiền" value={String(panel.refundRequests)} />
        <Metric label="Số tiền hoàn" value={vnd(panel.refundAmountVnd)} />
        <Metric label="Chargeback đang mở" value={String(panel.openChargebacks)} />
        <Metric label="Số tiền chargeback" value={vnd(panel.chargebackAmountVnd)} />
        <Metric label="Coin đã hoàn" value={panel.coinsRefunded.toLocaleString("vi-VN")} />
        <Metric label="Người dùng được hoàn" value={String(panel.usersRefunded)} />
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
