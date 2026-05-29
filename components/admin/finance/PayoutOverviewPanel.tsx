import Link from "next/link";
import { Card } from "@/components/ui";
import type { FinanceDashboardData } from "@/types/finance";

type PayoutOverviewPanelProps = {
  payout: FinanceDashboardData["payoutOverview"];
  creatorsWithRevenueCount: number;
  isEmpty: boolean;
};

function vnd(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export function PayoutOverviewPanel({
  payout,
  creatorsWithRevenueCount,
  isEmpty
}: PayoutOverviewPanelProps) {
  if (
    isEmpty &&
    payout.requested === 0 &&
    payout.underReview === 0 &&
    payout.completed === 0
  ) {
    return (
      <Card className="space-y-3">
        <h3 className="text-base font-black text-white">Rút tiền tác giả</h3>
        <p className="text-sm text-zinc-400">Chưa có yêu cầu rút tiền.</p>
        <div className="flex flex-wrap gap-3">
          <Link className="text-sm font-semibold text-cyan-300" href="/admin/withdrawals">
            Quản lý yêu cầu rút
          </Link>
          <Link className="text-sm font-semibold text-cyan-300" href="/admin/payouts">
            Xem lịch sử rút tiền
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-white">Rút tiền tác giả</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="font-semibold text-cyan-300" href="/admin/withdrawals">
            Quản lý yêu cầu rút
          </Link>
          <Link className="font-semibold text-cyan-300" href="/admin/payouts">
            Xem lịch sử rút tiền
          </Link>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Thu nhập tác giả tại đây là số tiền ròng sau khi đã trừ phí nền tảng và các khoản
        cấu hình liên quan.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Yêu cầu đang chờ" value={String(payout.requested)} />
        <Metric label="Đang xem xét" value={String(payout.underReview)} />
        <Metric label="Đã thanh toán" value={String(payout.completed)} />
        <Metric label="Bị từ chối" value={String(payout.rejected)} />
        <Metric label="Thất bại" value={String(payout.failed)} />
        <Metric label="Tổng tiền đã thanh toán" value={vnd(payout.totalCompletedAmount)} />
        <Metric label="Trung bình mỗi yêu cầu" value={vnd(payout.averagePayoutAmount)} />
        <Metric label="Số tác giả có doanh thu" value={String(creatorsWithRevenueCount)} />
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
